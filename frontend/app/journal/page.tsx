"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  X, Bot, ArrowLeft, Save, Sparkles, BookOpen, 
  User, Trash2, Send, Loader2, AlertTriangle, Phone,
  MessageSquare, CheckCircle2, XCircle, Clock, Search, Filter
} from "lucide-react"
import { journalAPI } from "@/lib/api"

// Types
type Sentiment = {
  score: number
  label: "positive" | "neutral" | "negative"
  confidence: number
  primaryEmotions?: string[]
  reasoning?: string
}

type RiskAssessment = {
  level: "low" | "medium" | "high"
  factors: string[]
  confidence: number
  isCrisis?: boolean
}

type AIAnalysis = {
  summary: string
  insights: string[]
  sentiment: Sentiment
  riskAssessment: RiskAssessment
  themes?: string[]
  suggestedActions?: string[]
  processedAt?: string
}

type Journal = {
  _id: string
  content: string
  mood: number
  tags?: string[]
  status: "draft" | "analyzing" | "analyzed" | "error"
  aiAnalysis?: AIAnalysis
  conversationId?: string
  createdAt: string
  updatedAt: string
}

type Message = {
  _id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  status?: "sending" | "delivered" | "error"
  aiMetadata?: {
    isCrisis?: boolean
    riskLevel?: "low" | "medium" | "high"
    model?: string
  }
}

export default function JournalPage() {
  const { toast } = useToast()

  // Editor State
  const [entry, setEntry] = useState("")
  const [moodLevel, setMoodLevel] = useState([5])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Journal List State
  const [journals, setJournals] = useState<Journal[]>([])
  const [filteredJournals, setFilteredJournals] = useState<Journal[]>([])
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null)
  const [isLoadingJournals, setIsLoadingJournals] = useState(false)

  // Search/Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "positive" | "negative" | "neutral">("all")
  const [sortBy, setSortBy] = useState<"date" | "mood">("date")

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStage, setAnalysisStage] = useState("")

  // AI Chat Panel State (NO conversation needed - messages stored IN journal!)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const analysisSSERef = useRef<EventSource | null>(null)

  const moodEmojis = ["😢", "😔", "😐", "🙂", "😊", "😄", "😆", "🤣", "😍", "🌟"]

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load journals on mount
  useEffect(() => {
    loadJournals()
  }, [])

  // Filter journals when search/filter changes
  useEffect(() => {
    filterJournals()
  }, [journals, searchQuery, filterType, sortBy])

  const filterJournals = () => {
    let filtered = [...journals]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(j => 
        j.content.toLowerCase().includes(query) ||
        new Date(j.createdAt).toLocaleDateString().includes(query)
      )
    }

    // Sentiment filter
    if (filterType !== "all") {
      filtered = filtered.filter(j => 
        j.aiAnalysis?.sentiment?.label === filterType
      )
    }

    // Sort
    if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else {
      filtered.sort((a, b) => b.mood - a.mood)
    }

    setFilteredJournals(filtered)
  }

  // Load journals from API
  const loadJournals = async () => {
    try {
      setIsLoadingJournals(true)
      const data = await journalAPI.list({ limit: 50 })
      if (data.success && data.journals) {
        // Ensure newest first in UI
        const sorted = [...data.journals].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setJournals(sorted as any)
      }
    } catch (error) {
      console.error("[Journal] Error loading:", error)
      toast({
        title: "Error",
        description: "Failed to load journals",
        variant: "destructive",
      })
    } finally {
      setIsLoadingJournals(false)
    }
  }

  // Save journal entry and start reflection
  const saveAndReflect = async () => {
    if (!entry.trim()) {
      toast({
        title: "Empty entry",
        description: "Please write something before saving",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const data = await journalAPI.create({ content: entry.trim(), mood: moodLevel[0] })
      if (data.success && (data.journal || data.data?.journal)) {
        const newJournal = data.journal || data.data.journal
        setJournals([newJournal, ...journals])
        setSelectedJournal(newJournal)
        setSaveSuccess(true)
        // Notify other tabs (profile, etc.)
        try { localStorage.setItem('zenly_journal_updated', Date.now().toString()) } catch {}
        
        // Start AI reflection
        await startReflection(newJournal._id)
        
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (error) {
      console.error("[Journal] Save error:", error)
      toast({
        title: "Error",
        description: "Failed to save journal",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Start AI reflection - opens panel and starts conversation
  const startReflection = async (journalId: string) => {
    try {
      setIsAnalyzing(true)
      // We'll open the panel on analysis completion
      const token = localStorage.getItem("zenly_access_token")
      if (!token) return

      // Start analysis with SSE - token must be in query string
      setAnalysisStage("Analyzing your thoughts...")
      setAnalysisProgress(5)

      const es = new EventSource(`http://localhost:5001/journals/${journalId}/analyze-stream?token=${encodeURIComponent(token)}`)

      const onConnected = (e: MessageEvent) => {
        // Optional: use connection info
        // console.log('[SSE] connected', e.data)
      }
      const onProgress = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          const pct = data.progress && data.progress <= 1 ? Math.round(data.progress * 100) : Math.round((data.progress || 0) as number)
          setAnalysisStage(data.label || data.stage || "Analyzing...")
          setAnalysisProgress(Math.min(100, Math.max(0, pct)))
        } catch {}
      }
      const onComplete = async (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          setAnalysisProgress(100)
          setAnalysisStage("Analysis complete. Preparing reflection...")

          // Optimistically mark selected journal analyzed
          setJournals(prev => prev.map(j => j._id === journalId ? { ...j, status: "analyzed", aiAnalysis: data.analysis } as any : j))
          const updated = (prev => prev.find(j => j._id === journalId))((j => j)([...journals]))
          if (updated) setSelectedJournal({ ...updated, status: "analyzed", aiAnalysis: data.analysis } as any)

          // Open panel immediately for UX, then load messages and auto-send
          setIsAIPanelOpen(true)
          await loadJournalAndStartReflection(journalId, entry)
        } catch {}
        finally {
          es.close()
          analysisSSERef.current = null
          setIsAnalyzing(false)
        }
      }
      const onError = () => {
        try { es.close() } catch {}
        analysisSSERef.current = null
        setIsAnalyzing(false)
        toast({
          title: "Connection error",
          description: "Failed to connect to analysis service",
          variant: "destructive",
        })
      }

      es.addEventListener('connected', onConnected)
      es.addEventListener('progress', onProgress)
      es.addEventListener('complete', onComplete)
      es.addEventListener('error', onError as any)

      analysisSSERef.current = es
    } catch (error) {
      console.error("[Journal] Reflection error:", error)
      setIsAnalyzing(false)
    }
  }

  // Load journal reflection messages (NO conversation needed!)
  const loadJournalMessages = async (journalId: string) => {
    try {
      setIsLoadingMessages(true)
      const token = localStorage.getItem("zenly_access_token")
      if (!token) {
        console.error("[Journal AI] No auth token!")
        return
      }

      console.log("[Journal AI] Loading messages for journal:", journalId)

      // Get messages directly from journal
      const res = await fetch(`http://localhost:5001/journals/${journalId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Failed to load messages")

      const data = await res.json()
      console.log("[Journal AI] Messages loaded:", data)
      
      if (data.success && data.messages) {
        setMessages(data.messages)
        console.log("[Journal AI] Set", data.messages.length, "messages")
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("[Journal AI] Load messages error:", error)
      toast({
        title: "Error",
        description: "Failed to load reflection messages",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Load journal messages AND automatically send journal content to AI
  const loadJournalAndStartReflection = async (journalId: string, journalContent: string) => {
    try {
      console.log("[Journal AI] ========================================")
      console.log("[Journal AI] Starting reflection for journal:", journalId)
      console.log("[Journal AI] Journal content length:", journalContent.length)
      
      // First, load existing messages
      await loadJournalMessages(journalId)
      
      // Check if messages already exist (user reopening existing journal)
      const token = localStorage.getItem("zenly_access_token")
      if (!token) {
        console.error("[Journal AI] No auth token!")
        return
      }

      const msgRes = await fetch(`http://localhost:5001/journals/${journalId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const msgData = await msgRes.json()
      const existingMessages = msgData.success && msgData.messages ? msgData.messages : []
      
      if (existingMessages.length > 0) {
        console.log("[Journal AI] Messages already exist (", existingMessages.length, "), opening panel without sending")
        setIsAIPanelOpen(true)
        return
      }
      
      console.log("[Journal AI] No existing messages, will auto-send journal to AI")
      
      // Auto-send journal content as first message
      setIsSendingMessage(true)
      setIsAITyping(true)

      console.log("[Journal AI] Auto-sending journal content to AI for reflection...")

      // Create optimistic user message
      const tempUserMessage: Message = {
        _id: `temp-${Date.now()}`,
        role: "user",
        content: journalContent,
        createdAt: new Date().toISOString(),
        status: "sending",
      }
      setMessages(prev => {
        console.log("[Journal AI] Adding temp message, prev length:", prev.length)
        return [...prev, tempUserMessage]
      })

      console.log("[Journal AI] Sending POST to /journals/" + journalId + "/messages")

      const res = await fetch(`http://localhost:5001/journals/${journalId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: journalContent
        }),
      })

      console.log("[Journal AI] Response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[Journal AI] Failed to send message:", errorData)
        throw new Error(errorData.error || "Failed to send initial message")
      }

      const data = await res.json()
      console.log("[Journal AI] AI response received:", data)
      console.log("[Journal AI] User message:", data.userMessage)
      console.log("[Journal AI] AI message:", data.aiMessage)
      
      if (data.success) {
        // Replace temp message with real ones
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m._id !== tempUserMessage._id)
          const updated = [...withoutTemp, data.userMessage, data.aiMessage]
          console.log("[Journal AI] Updated messages, new length:", updated.length)
          return updated
        })
        
        // NOW open the panel - AI has responded!
        console.log("[Journal AI] Opening panel now!")
        setIsAIPanelOpen(true)
        
        toast({
          title: "AI Reflection Ready",
          description: "Your AI companion has responded to your journal entry",
        })
      }
      
      console.log("[Journal AI] ========================================")
    } catch (error) {
      console.error("[Journal AI] Auto-send error:", error)
      toast({
        title: "Error getting AI response",
        description: error instanceof Error ? error.message : "Failed to get AI reflection",
        variant: "destructive",
      })
      // Open panel anyway so user can try manually
      setIsAIPanelOpen(true)
    } finally {
      setIsSendingMessage(false)
      setIsAITyping(false)
      setIsLoadingMessages(false)
    }
  }

  // Send chat message - EXACT same as chat page
  // Send message in journal reflection (uses journal endpoints, NOT conversation!)
  const sendChatMessage = async () => {
    console.log("[Journal AI] sendChatMessage called")
    console.log("[Journal AI] chatInput:", chatInput)
    console.log("[Journal AI] selectedJournal:", selectedJournal?._id)
    
    if (!chatInput.trim() || !selectedJournal) {
      console.log("[Journal AI] Cannot send - no input or no selected journal")
      return
    }

    const userMessageContent = chatInput.trim()
    setChatInput("")
    setIsSendingMessage(true)
    setIsAITyping(true)

    console.log("[Journal AI] Sending message:", userMessageContent)

    // Optimistic update - add user message immediately
    const tempUserMessage: Message = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: userMessageContent,
      createdAt: new Date().toISOString(),
      status: "sending",
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const token = localStorage.getItem("zenly_access_token")

      const res = await fetch(`http://localhost:5001/journals/${selectedJournal._id}/messages`, {
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
      console.log("[Journal AI] Message response:", data)

      if (data.success) {
        // Replace temp user message with real one and add AI response
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m._id !== tempUserMessage._id)
          return [...withoutTemp, data.userMessage, data.aiMessage]
        })

        // Notify other tabs to refresh stats if needed
        try { localStorage.setItem('zenly_journal_updated', Date.now().toString()) } catch {}

        // Check for crisis
        if (data.aiMessage?.aiMetadata?.isCrisis) {
          const riskLevel = data.aiMessage.aiMetadata.riskLevel
          toast({
            title: "Crisis Support Available",
            description: riskLevel === "high" 
              ? "Please call the National Crisis Hotline: 988" 
              : "Support resources are available if you need them",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("[Journal AI] Error sending message:", error)

      // Update temp message to error state
      setMessages(prev =>
        prev.map(m =>
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
      setIsSendingMessage(false)
      setIsAITyping(false)
    }
  }

  // Select journal from list
  // Select journal from list
  const selectJournal = async (journal: Journal) => {
    console.log("[Journal] Selecting journal:", journal._id)
    setSelectedJournal(journal)
    setEntry(journal.content)
    setMoodLevel([journal.mood])

    // Load reflection messages for this journal and open panel
    await loadJournalMessages(journal._id)
    setIsAIPanelOpen(true)
    console.log("[Journal] Panel opened with existing messages")
  }

  // Delete journal
  const deleteJournal = async (journalId: string) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) return

    try {
      const token = localStorage.getItem("zenly_access_token")
      if (!token) return

      const res = await fetch(`http://localhost:5001/journals/${journalId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Failed to delete journal")

      setJournals(prev => prev.filter(j => j._id !== journalId))
      if (selectedJournal?._id === journalId) {
        setSelectedJournal(null)
        setEntry("")
        setMoodLevel([5])
      }

      toast({ title: "Journal deleted" })
    } catch (error) {
      console.error("[Journal] Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete journal",
        variant: "destructive",
      })
    }
  }

  // New entry
  const startNewEntry = () => {
    setSelectedJournal(null)
    setEntry("")
    setMoodLevel([5])
    setIsAIPanelOpen(false)
    setMessages([])
  }

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      try { analysisSSERef.current?.close() } catch {}
      analysisSSERef.current = null
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-semibold">My Journal</h1>
              </div>
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          
          {/* Recent Entries Sidebar - LEFT SIDE */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-lg">Recent Entries</CardTitle>
                <Button size="sm" onClick={startNewEntry} className="h-8">
                  <Sparkles className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">By Date</SelectItem>
                      <SelectItem value="mood">By Mood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="pt-0 px-4 space-y-2">
                {isLoadingJournals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredJournals.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {searchQuery || filterType !== "all" ? "No matching entries" : "No journals yet"}
                  </p>
                ) : (
                  filteredJournals.map((journal) => (
                    <div
                      key={journal._id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedJournal?._id === journal._id
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => selectJournal(journal)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg flex-shrink-0">{moodEmojis[journal.mood - 1]}</span>
                          {journal.status === "analyzing" && (
                            <Clock className="h-4 w-4 text-gray-400 animate-pulse flex-shrink-0" />
                          )}
                          {journal.status === "analyzed" && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-50 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteJournal(journal._id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {journal.content}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 truncate">
                          {new Date(journal.createdAt).toLocaleDateString()}
                        </span>
                        {journal.aiAnalysis?.sentiment && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {journal.aiAnalysis.sentiment.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Journal Editor - CENTER */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  Write Your Thoughts
                </CardTitle>
                <CardDescription>
                  Express yourself freely. Click "Reflect with AI" to get insights and talk about it.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <Textarea
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="What's on your mind today?"
                  className="flex-1 resize-none min-h-[300px]"
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    How are you feeling? ({moodLevel[0]}/10)
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={moodLevel}
                      onValueChange={setMoodLevel}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-2xl">{moodEmojis[moodLevel[0] - 1]}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={saveAndReflect}
                    disabled={isSaving || !entry.trim()}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Reflect with AI
                      </>
                    )}
                  </Button>
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{analysisStage}</span>
                      <span className="text-gray-500">{analysisProgress}%</span>
                    </div>
                    <Progress value={analysisProgress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Reflection Panel - SLIDES FROM RIGHT */}
      <Sheet open={isAIPanelOpen} onOpenChange={setIsAIPanelOpen}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-600" />
              AI Reflection
            </SheetTitle>
            <SheetDescription>
              Talk with AI about your journal entry
            </SheetDescription>
          </SheetHeader>
          
          <Separator />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isUser = msg.role === "user"
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div className="flex items-start gap-2 max-w-[85%]">
                            {!isUser && (
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Bot className="h-5 w-5 text-green-600" />
                              </div>
                            )}
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isUser
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.aiMetadata?.isCrisis && (
                                <Badge variant="destructive" className="mt-2">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Crisis Detected
                                </Badge>
                              )}
                            </div>
                            {isUser && (
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* AI Typing Indicator */}
                    {isAITyping && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-2 max-w-[85%]">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="rounded-lg px-4 py-2 bg-gray-100">
                            <div className="flex gap-1">
                              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="p-6 pt-4 border-t bg-gray-50/50">
                  <div className="flex gap-3">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendChatMessage()
                        }
                      }}
                      placeholder="Type your message..."
                      disabled={isSendingMessage || !selectedJournal}
                      className="flex-1 bg-white"
                    />
                    <Button
                      onClick={sendChatMessage}
                      disabled={isSendingMessage || !chatInput.trim() || !selectedJournal}
                      size="lg"
                      className="px-6"
                    >
                      {isSendingMessage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
