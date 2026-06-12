'use client';

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemo } from 'react';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: string;
  };
  userAvatar?: string;
}

export function ChatMessage({ message, userAvatar }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Basic markdown parsing for bold text and paragraphs
  const renderContent = useMemo(() => {
    if (!message.content) return null;
    
    return message.content.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      
      // Simple bold replacement
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-2 last:mb-0 leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  }, [message.content]);

  return (
    <div
      className={cn(
        'group relative flex w-full gap-4 px-4 py-6 md:px-6 lg:px-8',
        isUser ? 'bg-background' : 'bg-muted/50'
      )}
    >
      <div className="flex shrink-0 select-none items-center justify-center">
        {isUser ? (
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={userAvatar} alt="User" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden px-1">
        <div className="font-semibold text-sm">
          {isUser ? 'You' : 'Zenly AI'}
        </div>
        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground">
          {renderContent}
        </div>
      </div>
    </div>
  );
}
