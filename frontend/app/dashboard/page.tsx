"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Heart,
  Brain,
  Users,
  BookOpen,
  MessageCircle,
  Settings,
  Save,
  Sparkles,
  X,
  Send,
  User,
  Bot,
  Library,
  Folder,
  Book,
  Files,
} from "lucide-react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { useAuth } from "@/hooks/use-auth"
import { journalAPI, moodAPI, activityAPI } from "@/lib/api"

export default function DashboardPage() {
  const [journalEntry, setJournalEntry] = useState("")
  const [moodLevel, setMoodLevel] = useState([5])
  const [showAI, setShowAI] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{ type: "user" | "ai"; content: string }>>([])
  const [aiInput, setAiInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const aiPanelRef = useRef<HTMLDivElement>(null)
  const { user, loading } = useAuth()
  const [activities, setActivities] = useState<Array<any>>([])

  const moodEmojis = ["😢", "😔", "😐", "🙂", "😊", "😄", "🤩", "🥳", "😍", "🌟"]

  useEffect(() => {
    // Load profile picture from localStorage
    const storedProfilePic = localStorage.getItem("zenly_profile_picture")
    if (storedProfilePic) {
      setProfilePicture(storedProfilePic)
    }
    // Load recent activities
    activityAPI
      .listRecent(2)
      .then((res) => {
        if (res?.success) setActivities(res.data || [])
      })
      .catch((e) => console.warn("Failed to load recent activities", e))
  }, [])

  const handleSaveJournal = async () => {
    if (!journalEntry.trim()) return

    setIsAnalyzing(true)

    try {
      // Save journal to backend
      const result = await journalAPI.create({
        content: journalEntry,
        mood: moodLevel[0],
      })

      // Update today's mood
      await moodAPI.updateToday(moodLevel[0])

      // Clear form
      setJournalEntry("")
      
      // Show success message (optional)
      alert("Journal entry saved successfully!")
      
      // Could navigate to journal page or show AI insights
      window.location.href = "/journal"
    } catch (error) {
      console.error("Failed to save journal", error)
      alert("Failed to save journal entry. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSendMessage = () => {
    if (!aiInput.trim()) return

    setAiMessages((prev) => [...prev, { type: "user", content: aiInput }])

    // Simulate AI response (in production, this would call the AI API)
    setTimeout(() => {
      const responses = [
        "That's a great question. Let me help you with that...",
        "I understand how you're feeling. Here's what I suggest...",
        "Thank you for sharing that with me. Have you considered...",
        "That sounds challenging. Let's work through this together...",
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setAiMessages((prev) => [...prev, { type: "ai", content: randomResponse }])
    }, 1000)

    setAiInput("")
  }

  const quickActions = [
    { icon: <BookOpen className="md:h-7 md:w-7" />, label: "Journal", href: "/journal" },
    { icon: <Users className="md:h-7 md:w-7" />, label: "Peer Support", href: "/forum" },
    { icon: <Folder className="md:h-7 md:w-7" />, label: "Resource Hub", href: "/resources" },
    { icon: <MessageCircle className="md:h-7 md:w-7" />, label: "AI Chat", href: "/chat" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Zenly</h1>
          </div>
          <ProfileDropdown />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className={`transition-all duration-300 ${showAI ? "mr-80" : ""}`}>
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-balance">Welcome back, {user?.name || "Student"}!</h2>
            <p className="text-muted-foreground text-pretty">
              How are you feeling today? Take a moment to reflect and share your thoughts.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5 mb-8">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="w-[250px] h-[120px] hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className="text-primary flex items-center justify-center">{action.icon}</div>
                    <span className="text-base md:text-lg font-semibold leading-tight">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Journal Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Daily Journal
              </CardTitle>
              <CardDescription>
                Share your thoughts, feelings, and experiences. Our AI will provide personalized insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood Slider */}
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

              {/* Journal Textarea */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your thoughts for today</label>
                <Textarea
                  placeholder="What's on your mind today? Share your thoughts, experiences, challenges, or anything you'd like to reflect on..."
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Your entries are private and secure. AI analysis helps provide personalized support.
                </p>
                <Button
                  onClick={handleSaveJournal}
                  disabled={!journalEntry.trim() || isAnalyzing}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save & Reflect
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your mental wellness journey overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity yet. Try saving a journal or exploring resources.</p>
                )}
                {activities.map((act) => {
                  const isJournal = act.kind === 'journal'
                  const icon = isJournal ? <Brain className="h-5 w-5 text-primary" /> : <Folder className="h-5 w-5 text-primary" />
                  const title = isJournal ? 'Journal Entry' : `${(act.resourceType || 'Resource')[0].toUpperCase()}${(act.resourceType || 'Resource').slice(1)} Viewed`
                  const subtitle = isJournal 
                    ? (act.mood ? `Mood ${act.mood}/10` : (act.preview || '').slice(0, 60))
                    : (act.title || act.url)
                  const when = new Date(act.createdAt).toLocaleString()
                  return (
                    <div key={act.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {icon}
                        <div>
                          <p className="font-medium">{title}</p>
                          <p className="text-sm text-muted-foreground">{subtitle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{when}</p>
                        </div>
                      </div>
                      {isJournal ? (
                        <Badge>Saved</Badge>
                      ) : (
                        <Badge variant="secondary">Viewed</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Panel */}
        {showAI && (
          <div
            ref={aiPanelRef}
            className="fixed right-0 top-0 h-full w-80 bg-background border-l shadow-lg z-50 animate-slide-in-right"
          >
            <div className="flex flex-col h-full">
              {/* AI Panel Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">AI Reflection</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAI(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-secondary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask me anything..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button size="sm" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
