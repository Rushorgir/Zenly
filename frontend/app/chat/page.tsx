"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Heart,
  Bot,
  User,
  Send,
  ArrowLeft,
  AlertTriangle,
  Phone,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Archive,
  ThumbsUp,
  ThumbsDown,
  Flag,
  RefreshCw,
} from "lucide-react"

// Types
interface Message {
  _id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: string
  status?: "sending" | "delivered" | "error"
  aiMetadata?: {
    isCrisis?: boolean
    riskLevel?: "low" | "medium" | "high"
    model?: string
  }
}

interface Conversation {
  _id: string
  type: "general-chat" | "journal-reflection"
  title: string
  status: "active" | "archived" | "crisis"
  messageCount: number
  crisisDetected?: boolean
  crisisLevel?: string
  lastMessageAt?: string
  createdAt: string
}

export default function ChatPage() {
  const { toast } = useToast()

  // Conversation State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Message State
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  // Input State
  const [inputValue, setInputValue] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)

  // UI State
  const [showSidebar, setShowSidebar] = useState(true)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef(false) // Use ref instead of state to prevent re-renders

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Refresh conversations from database (for testing)
  const refreshConversations = async () => {
    console.log("[Chat REFRESH] Manual refresh requested")
    hasLoadedRef.current = false // Reset the flag
    setConversations([]) // Clear current conversations
    setActiveConversation(null)
    setMessages([])
    await loadConversations()
  }

  // Load conversations
  const loadConversations = async () => {
    console.log("[Chat Page] ========================================")
    console.log("[Chat Page] loadConversations called")
    
    // Prevent duplicate loads using ref (survives React strict mode double mount)
    if (hasLoadedRef.current || isLoadingConversations) {
      console.log("[Chat Page] Already loading or loaded, skipping...")
      console.log("[Chat Page] ========================================")
      return
    }
    
    hasLoadedRef.current = true // Mark as loaded immediately
    
    try {
      setIsLoadingConversations(true)
      const token = localStorage.getItem("zenly_access_token")
      console.log("[Chat Page] Token exists:", !!token)
      
      if (!token) {
        console.log("[Chat Page] No token found!")
        toast({
          title: "Authentication required",
          description: "Please log in to view your conversations",
          variant: "destructive",
        })
        return
      }

      // CRITICAL: ONLY fetch general-chat conversations
      const url = "http://localhost:5001/ai/conversations?type=general-chat&limit=50"
      console.log("[Chat Page] Fetching from:", url)
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to load conversations")
      }

      const data = await res.json()
      console.log("[Chat Page] API Response:", data)

      if (data.success && data.conversations) {
        console.log("[Chat Page] Received", data.conversations.length, "conversations")
        
        // VALIDATE: Filter out journal-reflection conversations
        // Keep conversations that are:
        // 1. Explicitly type=general-chat, OR
        // 2. Have no type (legacy conversations) since we only fetch with type=general-chat filter
        const generalChatOnly = data.conversations.filter((c: Conversation) => {
          const isGeneralChat = c.type === 'general-chat' || !c.type // Allow undefined/null type
          const isJournal = c.type === 'journal-reflection'
          
          if (isJournal) {
            console.warn(`[Chat Page] WARNING: Filtering out journal-reflection conversation:`, c._id, c.type)
          } else if (!c.type) {
            console.log(`[Chat Page] INFO: Including legacy conversation without type:`, c._id, c.title)
          }
          
          return isGeneralChat
        })
        
        console.log("[Chat Page] After filtering:", generalChatOnly.length, "general-chat conversations")
        setConversations(generalChatOnly)
        // Do not auto-select; wait for user to pick a conversation or start a new one by typing
        console.log("[Chat Page] No auto-select on load; awaiting user action")
      }
      
      console.log("[Chat Page] ========================================")
    } catch (error) {
      console.error("[Chat Page] Error loading conversations:", error)
      hasLoadedRef.current = false // Reset on error so they can retry
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      })
      console.log("[Chat Page] ========================================")
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Create new conversation - REWRITTEN with better validation handling
  const createNewConversation = async () => {
    try {
      const token = localStorage.getItem("zenly_access_token")
      if (!token) {
        console.error("[Chat CREATE] No auth token found")
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        })
        return
      }

      console.log("[Chat CREATE] Creating new conversation...")

      const res = await fetch("http://localhost:5001/ai/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "general-chat",
          title: "New Conversation",
        }),
      })

      const data = await res.json()
      console.log("[Chat CREATE] Backend response:", data)

      if (!res.ok) {
        // If backend says there's already an empty conversation
        if (data.existingConversation) {
          console.log("[Chat CREATE] Backend blocked creation - empty conversation exists:", data.existingConversation)
          
          toast({
            title: "Empty conversation exists",
            description: "You already have an empty conversation. Loading it...",
          })

          // Reload conversations to get the latest state
          hasLoadedRef.current = false
          await loadConversations()
          
          return
        }
        throw new Error(data.error || "Failed to create conversation")
      }

      if (data.success) {
        console.log("[Chat CREATE] Successfully created conversation:", data.conversation)
        
        const newConv = data.conversation
        
        // Add to conversations list
        setConversations((prev) => [newConv, ...prev])
        
        // Set as active
        setActiveConversation(newConv)
        setMessages([]) // New conversations start with no messages

        toast({
          title: "New conversation started",
          description: "Start chatting with your AI companion",
        })
      }
    } catch (error) {
      console.error("[Chat CREATE] Error creating conversation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive",
      })
    }
  }

  // Select conversation
  const selectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation)
    await loadMessages(conversation._id)
  }

  // Load messages for conversation
  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true)
      const token = localStorage.getItem("zenly_access_token")

      const res = await fetch(`http://localhost:5001/ai/conversations/${conversationId}/messages?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to load messages")
      }

      const data = await res.json()
      console.log("[Chat Page] Loaded messages:", data)

      if (data.success && data.messages) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("[Chat Page] Error loading messages:", error)
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    console.log("[Chat Page] sendMessage called")
    console.log("[Chat Page] inputValue:", inputValue)
    console.log("[Chat Page] activeConversation:", activeConversation?._id)
    
    if (!inputValue.trim()) {
      console.log("[Chat Page] Cannot send - no input")
      return
    }

    const userMessageContent = inputValue.trim()
    setInputValue("")
    setIsSending(true)
    setIsAITyping(true)

    console.log("[Chat Page] Sending message:", userMessageContent)

    // Optimistic update - add user message immediately
    const tempUserMessage: Message = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: userMessageContent,
      createdAt: new Date().toISOString(),
      status: "sending",
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const token = localStorage.getItem("zenly_access_token")

      // If no active conversation yet, create one now based on the first message
      let conversationId = activeConversation?._id
      if (!conversationId) {
        console.log("[Chat Page] Creating conversation lazily from first message")
        const createRes = await fetch("http://localhost:5001/ai/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "general-chat",
            title: inputValue.trim().slice(0, 40) || "New Conversation",
          }),
        })
        const createData = await createRes.json()
        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || "Failed to create conversation")
        }
        const newConv: Conversation = createData.conversation
        setActiveConversation(newConv)
        setConversations((prev) => [newConv, ...prev])
        conversationId = newConv._id
      }

      const res = await fetch(`http://localhost:5001/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: userMessageContent,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to send message")
      }

      const data = await res.json()
      console.log("[Chat Page] Message response:", data)

      if (data.success) {
        // Replace temp user message with real one and add AI response
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m._id !== tempUserMessage._id)
          return [...withoutTemp, data.userMessage, data.aiMessage]
        })

        // Check for crisis
        if (data.aiMessage?.isCrisis || data.aiMessage?.aiMetadata?.isCrisis) {
          const riskLevel = data.aiMessage.riskLevel || data.aiMessage.aiMetadata?.riskLevel
          toast({
            title: "Crisis Support Available",
            description: riskLevel === "high" 
              ? "Please call the National Crisis Hotline: 988" 
              : "Support resources are available if you need them",
            variant: "destructive",
          })
        }

        // Update conversation in list
        setConversations((prev) =>
          prev.map((c) =>
            c._id === (activeConversation?._id || "")
              ? { ...c, messageCount: (c.messageCount || 0) + 2, lastMessageAt: new Date().toISOString() }
              : c
          )
        )
      }
    } catch (error) {
      console.error("[Chat Page] Error sending message:", error)

      // Update temp message to error state
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempUserMessage._id
            ? { ...m, status: "error" as const }
            : m
        )
      )

      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
      setIsAITyping(false)
    }
  }

  // Delete conversation - REWRITTEN for proper database deletion
  const deleteConversation = async (conversationId: string) => {
    try {
      console.log(`[Chat DELETE] Starting delete for conversation ${conversationId}`)
      const token = localStorage.getItem("zenly_access_token")

      if (!token) {
        console.error("[Chat DELETE] No auth token found")
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        })
        return
      }

      console.log(`[Chat DELETE] Sending DELETE request to backend...`)
      const res = await fetch(`http://localhost:5001/ai/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      console.log(`[Chat DELETE] Backend response:`, data)

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete conversation")
      }

      if (data.success) {
        console.log(`[Chat DELETE] Successfully deleted from backend, updating UI...`)
        
        // Remove from conversations list
        setConversations((prev) => {
          const updated = prev.filter((c) => c._id !== conversationId)
          console.log(`[Chat DELETE] Updated conversations list, remaining: ${updated.length}`)
          return updated
        })
        
        // If this was the active conversation, handle that
        if (activeConversation?._id === conversationId) {
          console.log(`[Chat DELETE] Deleted conversation was active, selecting next...`)
          const remaining = conversations.filter((c) => c._id !== conversationId)
          
          if (remaining.length > 0) {
            console.log(`[Chat DELETE] Loading first remaining conversation: ${remaining[0]._id}`)
            await selectConversation(remaining[0])
          } else {
            console.log(`[Chat DELETE] No conversations left, clearing active state`)
            setActiveConversation(null)
            setMessages([])
          }
        }

        toast({
          title: "Conversation deleted",
          description: `Deleted conversation and ${data.deletedMessages || 0} messages`,
        })
      }
    } catch (error) {
      console.error("[Chat DELETE] Error deleting conversation:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete conversation",
        variant: "destructive",
      })
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  // Get message status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-gray-400" />
      case "delivered":
        return <CheckCircle2 className="h-3 w-3 text-green-600" />
      case "error":
        return <XCircle className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-semibold">AI Chat</h1>
              </div>
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          
          {/* Conversations Sidebar */}
          {showSidebar && (
            <Card className="w-80 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={refreshConversations}
                      className="h-8"
                      disabled={isLoadingConversations}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingConversations ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setActiveConversation(null); setMessages([]); setInputValue("") }}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {isLoadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No conversations yet
                    </p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          activeConversation?._id === conv._id
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => selectConversation(conv)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate flex-1 min-w-0 max-w-[200px]" title={conv.title}>
                            {conv.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-50 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conv._id)
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          {conv.crisisDetected && (
                            <Badge variant="destructive" className="text-xs h-5">
                              Crisis
                            </Badge>
                          )}
                          {conv.lastMessageAt && (
                            <span className="text-xs text-gray-400">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Chat Area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            {activeConversation && (
              <>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{activeConversation.title}</h3>
                        <p className="text-xs text-gray-500">
                          {activeConversation.type === "journal-reflection" 
                            ? "Journal Reflection" 
                            : "Mental Health Support"}
                        </p>
                      </div>
                    </div>
                    {activeConversation.crisisDetected && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Crisis Detected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <Separator />
              </>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-green-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start a Conversation
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Share your thoughts, feelings, or concerns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isUser = message.role === "user"
                    const isCrisis = message.aiMetadata?.isCrisis

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] ${
                            isUser
                              ? "bg-green-600 text-white rounded-2xl rounded-tr-sm"
                              : isCrisis
                              ? "bg-red-50 border-2 border-red-200 text-red-900 rounded-2xl rounded-tl-sm"
                              : "bg-white border border-gray-200 rounded-2xl rounded-tl-sm"
                          }`}
                        >
                          <div className="px-4 py-3">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </div>
                          <div
                            className={`px-4 pb-2 flex items-center justify-between ${
                              isUser ? "text-green-200" : "text-gray-400"
                            }`}
                          >
                            <span className="text-xs">
                              {formatTime(message.createdAt)}
                            </span>
                            {isUser && getStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* AI Typing Indicator */}
                  {isAITyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                          </div>
                          <span className="text-xs text-gray-500">AI is typing...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Crisis Alert */}
            {activeConversation?.crisisDetected && (
              <div className="px-6 pb-4 flex-shrink-0">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      Crisis support is available 24/7
                    </span>
                    <Button size="sm" variant="outline" className="ml-4">
                      <Phone className="h-4 w-4 mr-2" />
                      Call 988
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Input Area */}
            <div className="p-6 pt-4 border-t bg-gray-50/50 flex-shrink-0 relative z-10">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={"Type your message..."}
                  disabled={isSending}
                  className="flex-1 bg-white relative z-20"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isSending || !inputValue.trim()}
                  size="lg"
                  className="px-6 relative z-20"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Your conversations are private and secure. Crisis support available 24/7.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
