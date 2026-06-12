'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';

import { aiAPI, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/chat/chat-message';
import { toast } from 'sonner';

interface Message {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.id;
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const user = getUser();
    if (user?.avatarUrl) {
      setUserAvatar(user.avatarUrl);
    }

    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const res = await aiAPI.listMessages(conversationId);
        if (res.success) {
          // Messages API usually returns them from newest to oldest or vice versa.
          // Let's assume chronological or reverse chronological. We might need to reverse if they are newest-first.
          // The AI controller typically sorts newest first for pagination, so let's reverse.
          const fetchedMessages = res.messages || [];
          setMessages([...fetchedMessages].reverse());
        }
      } catch (error) {
        toast.error('Failed to load chat messages');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessageContent = input.trim();
    setInput('');
    
    // Optimistic UI update
    const optimisticMessage: Message = {
      _id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      createdAt: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const res = await aiAPI.sendMessage(conversationId, userMessageContent);
      if (res.success) {
        // Replace optimistic message with actual DB ones and add AI response
        setMessages((prev) => {
          const filtered = prev.filter(m => m._id !== optimisticMessage._id);
          return [...filtered, res.userMessage, res.aiMessage];
        });
      }
    } catch (error) {
      toast.error('Failed to send message');
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      setInput(userMessageContent); // restore input
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)]">
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {messages.map((message) => (
              <ChatMessage key={message._id} message={message} userAvatar={userAvatar} />
            ))}
            {isSending && (
              <div className="flex p-6 gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-primary text-primary-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  Zenly AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-background shrink-0">
        <div className="max-w-3xl mx-auto relative flex items-center">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="min-h-[60px] max-h-[200px] w-full resize-none rounded-xl pr-14 py-4"
            rows={1}
            disabled={isSending || isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isSending || isLoading}
            className="absolute right-3 bottom-3 h-8 w-8 rounded-lg"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            Zenly AI can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </div>
  );
}
