"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  Heart, 
  ArrowLeft, 
  User, 
  LogOut, 
  Key, 
  Settings,
  TrendingUp,
  Calendar,
  Edit,
  Loader2
} from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { userAPI } from "@/lib/api"
import { journalAPI, moodAPI } from "@/lib/api"

type Journal = {
  _id: string
  content: string
  mood: number
  createdAt: string
}

type MoodEntry = {
  _id?: string
  mood: number
  notes?: string
  createdAt: string
}

type UserProfile = {
  _id: string
  name: string
  email: string
  firstName?: string
  lastName?: string
  university?: string
  academicYear?: string
  avatarUrl?: string
  role: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [journals, setJournals] = useState<Journal[]>([])
  const [averageMood, setAverageMood] = useState(0)
  const [loading, setLoading] = useState(true)
  const [daysActive, setDaysActive] = useState(0)
  const [journalCount, setJournalCount] = useState(0)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadProfileData()
    // Refresh when returning to the tab
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadProfileData()
    }

    // Listen for cross-tab updates (other pages can set these keys after creating/updating)
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key === 'zenly_journal_updated' || e.key === 'zenly_mood_updated' || e.key === 'zenly_user') {
        loadProfileData()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('storage', onStorage)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const loadProfileData = async () => {
    try {
      setLoading(true)
      
      // Load user profile
      const profileResponse = await userAPI.getProfile()
      if (profileResponse.success) {
        setUser(profileResponse.data)
      }
      
      // Load journal entries (use pagination total for accurate count) and moods
      const journalResponse = await journalAPI.list({ limit: 50 })
      const moodResponse = await moodAPI.list()

      // journalAPI.list returns { success, journals, pagination }
      const journalEntries: Journal[] = (journalResponse?.journals) || (journalResponse?.data) || []
      const totalJournals: number = journalResponse?.pagination?.total ?? journalEntries.length ?? 0
      setJournalCount(totalJournals)

      // moodAPI.list returns a raw array from backend
      const moodEntries: MoodEntry[] = Array.isArray(moodResponse)
        ? moodResponse
        : (moodResponse?.data || moodResponse?.moods || [])

      setJournals(journalEntries)

      // Combine mood-bearing entries from journals and standalone mood entries
      const combinedMoodValues: { mood: number; createdAt: string }[] = []

      journalEntries.forEach((j) => {
        if (typeof j.mood === 'number') {
          combinedMoodValues.push({ mood: j.mood, createdAt: j.createdAt })
        }
      })

      moodEntries.forEach((m) => {
        if (typeof m.mood === 'number') {
          // Mood logs use `date`; fallback to createdAt if present
          const created = (m as any).date || (m as any).createdAt || new Date().toISOString()
          combinedMoodValues.push({ mood: m.mood, createdAt: created })
        }
      })

      // Calculate average mood from combined entries
      if (combinedMoodValues.length > 0) {
        const totalMood = combinedMoodValues.reduce((sum, it) => sum + (it.mood || 0), 0)
        setAverageMood(Math.round((totalMood / combinedMoodValues.length) * 10) / 10)

        // Calculate days active based on earliest entry
        const earliest = combinedMoodValues.reduce((min, it) => {
          const t = new Date(it.createdAt).getTime()
          return t < min ? t : min
        }, new Date(combinedMoodValues[0].createdAt).getTime())

        const days = Math.max(1, Math.ceil((Date.now() - earliest) / (24 * 60 * 60 * 1000)))
        setDaysActive(days)
      } else {
        setAverageMood(0)
        setDaysActive(0)
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    localStorage.clear()
    window.location.href = "/"
  }

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size must be less than 5MB",
          variant: "destructive"
        })
        return
      }

      setUploadingAvatar(true)
      
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const originalImage = e.target?.result as string
          
          // Compress image before uploading
          const img = new Image()
          img.onload = async () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            // Calculate new dimensions (max 400x400)
            let width = img.width
            let height = img.height
            const maxSize = 400
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width
                width = maxSize
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height
                height = maxSize
              }
            }
            
            canvas.width = width
            canvas.height = height
            
            // Draw and compress
            ctx?.drawImage(img, 0, 0, width, height)
            const compressedImage = canvas.toDataURL('image/jpeg', 0.7) // 70% quality
            
            // Upload compressed image to backend
            const response = await userAPI.updateAvatar(compressedImage)
            
            if (response.success) {
              setUser(response.data)
              toast({
                title: "Success",
                description: "Profile picture updated successfully"
              })
            } else {
              throw new Error(response.error || "Failed to update avatar")
            }
          }
          img.src = originalImage
        }
        reader.readAsDataURL(file)
      } catch (error: any) {
        console.error("Failed to upload avatar:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to update profile picture",
          variant: "destructive"
        })
      } finally {
        setUploadingAvatar(false)
      }
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      })
      return
    }

    setChangingPassword(true)

    try {
      const response = await userAPI.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      if (response.success) {
        toast({
          title: "Success",
          description: "Password changed successfully"
        })
        setIsPasswordDialogOpen(false)
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })
      } else {
        throw new Error(response.error || "Failed to change password")
      }
    } catch (error: any) {
      console.error("Failed to change password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Prepare line chart data: last 8 journal entries with a mood
  const chartData = (() => {
    const points = journals
      .filter((j) => typeof j.mood === 'number')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .reverse()
      .map((j) => ({
        time: new Date(j.createdAt).getTime(),
        mood: j.mood,
      }))
    return points
  })()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="-ml-2 mr-2">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Profile</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut} size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div 
                className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center cursor-pointer group"
                onClick={handleProfilePictureClick}
              >
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Edit className="h-4 w-4 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploadingAvatar}
              />
              <div>
                <h2 className="text-2xl font-bold">{user?.name || "User"}</h2>
                <p className="text-muted-foreground">
                  {user?.university || "University not set"}
                  {user?.academicYear && ` • ${user.academicYear}`}
                </p>
                {user?.role === "admin" && (
                  <Badge variant="default" className="mt-1">Admin</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{journalCount}</p>
                <p className="text-sm text-muted-foreground">Journal Entries</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{averageMood}/10</p>
                <p className="text-sm text-muted-foreground">Average Mood</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{daysActive}</p>
                <p className="text-sm text-muted-foreground">Days Active</p>
              </div>
            </div>
            
            <div className="mt-6">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and choose a new one
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsPasswordDialogOpen(false)
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        })
                      }}
                      disabled={changingPassword}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleChangePassword} disabled={changingPassword}>
                      {changingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Mood Graph */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Mood Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer
                className="h-64 w-full"
                config={{
                  mood: { label: 'Mood', color: 'hsl(var(--primary))' },
                }}
              >
                <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    minTickGap={24}
                  />
                  <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} allowDecimals={false} />
                  <ChartTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={<ChartTooltipContent formatter={(value) => `${value}/10`} />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#000000" 
                    strokeWidth={2} 
                    dot={{ r: 3, stroke: '#000000', fill: '#000000' }}
                    activeDot={{ r: 4, stroke: '#000000', fill: '#000000' }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Start journaling to see your mood trends here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}