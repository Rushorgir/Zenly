'use client';

import { Bot } from 'lucide-react';

export default function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
      <div className="bg-primary/10 p-4 rounded-full mb-6">
        <Bot className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Welcome to Zenly AI</h2>
      <p className="text-muted-foreground max-w-md mx-auto text-balance">
        Select a conversation from the sidebar or start a new chat to begin talking about your feelings.
      </p>
    </div>
  );
}
