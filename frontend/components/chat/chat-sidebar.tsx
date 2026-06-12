'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, MessageSquare, Trash2, Loader2, Bot } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { aiAPI } from '@/lib/api';
import { toast } from 'sonner';

interface Conversation {
  _id: string;
  title: string;
  createdAt: string;
}

export function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const res = await aiAPI.list();
      if (res.success) {
        setConversations(res.conversations || []);
      }
    } catch (error: any) {
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [pathname]); // Refetch if pathname changes (e.g. new chat created)

  const handleNewChat = async () => {
    try {
      const res = await aiAPI.createConversation({ title: 'New Conversation' });
      if (res.success && res.conversation) {
        router.push(`/chat/${res.conversation._id}`);
      }
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  return (
    <Sidebar variant="inset" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-bold">Zenly AI Chat</h2>
        </div>
        <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No chat history found. Start a new conversation!
              </div>
            ) : (
              <SidebarMenu>
                {conversations.map((chat) => (
                  <SidebarMenuItem key={chat._id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/chat/${chat._id}`}
                      tooltip={chat.title}
                    >
                      <Link href={`/chat/${chat._id}`}>
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span>{chat.title || 'New Conversation'}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button variant="ghost" asChild className="w-full justify-start">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
