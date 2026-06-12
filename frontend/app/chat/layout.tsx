import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarProvider defaultOpen>
        <ChatSidebar />
        <main className="flex-1 flex flex-col h-full min-w-0">
          <div className="h-12 border-b flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-sm font-semibold">AI Assistant</h1>
          </div>
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
