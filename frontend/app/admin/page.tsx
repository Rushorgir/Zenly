"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
// Select component not used here; removed to satisfy lint
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Heart,
  Calendar,
  MessageCircle,
  BookOpen,
  BarChart3,
  LucidePieChart as RechartsPieChart,
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  Trash2,
  X,
  ThumbsUp,
  Eye,
} from "lucide-react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { AdminCharts } from "@/components/AdminCharts"
import { adminAPI, forumAPI } from "@/lib/api"

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("7d")
  const [selectedMetric, setSelectedMetric] = useState("all")
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reportedPosts, setReportedPosts] = useState<any[]>([])
  const [allPosts, setAllPosts] = useState<any[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingAllPosts, setLoadingAllPosts] = useState(false)
  const [searchPosts, setSearchPosts] = useState("")
  const [totalPosts, setTotalPosts] = useState(0)
  const [moderationEnabled, setModerationEnabled] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check admin authentication
    const checkAuth = () => {
      const isAdminAuth = localStorage.getItem("zenly_admin_authenticated")
      const loginTime = localStorage.getItem("zenly_admin_login_time")
      
      if (isAdminAuth === "true" && loginTime) {
        // Check if session is still valid (24 hours)
        const now = Date.now()
        const loginTimestamp = parseInt(loginTime)
        const sessionDuration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        
        if (now - loginTimestamp < sessionDuration) {
          setIsAuthenticated(true)
        } else {
          // Session expired
          localStorage.removeItem("zenly_admin_authenticated")
          localStorage.removeItem("zenly_admin_login_time")
          router.push("/admin/login")
          return
        }
      } else {
        // Not authenticated
        router.push("/admin/login")
        return
      }
      
      setIsLoading(false)
    }

    checkAuth()

    // Load profile picture from localStorage
    const storedProfilePic = localStorage.getItem("zenly_profile_picture")
    if (storedProfilePic) {
      setProfilePicture(storedProfilePic)
    }
    
    // Load reported posts
    loadReportedPosts()
    loadAllPosts()
  }, [router])

  const loadAllPosts = async () => {
    try {
      setLoadingAllPosts(true)
      // Try admin endpoint first
      try {
        const response = await adminAPI.getAllPosts({ limit: 1000 })
        if (response?.success) {
          setAllPosts(response.data || [])
          setTotalPosts(response.total || (response.data?.length ?? 0))
          setModerationEnabled(true)
          return
        }
        // If response is a raw array
        if (Array.isArray(response)) {
          setAllPosts(response)
          setTotalPosts(response.length)
          setModerationEnabled(true)
          return
        }
        // Fall through to fallback
      } catch (e) {
        // Likely unauthorized (non-admin) – fallback to public forum list
        setModerationEnabled(false)
      }

      const fallback = await forumAPI.listPosts({ limit: 1000 })
      const posts = fallback?.data || fallback?.posts || []
      setAllPosts(posts)
      setTotalPosts(posts.length)
    } catch (error) {
      console.error('Failed to load all posts:', error)
    } finally {
      setLoadingAllPosts(false)
    }
  }

  const loadReportedPosts = async () => {
    try {
      setLoadingReports(true)
      // Try admin endpoint first
      try {
        const response = await adminAPI.getReportedPosts()
        if (response?.success) {
          setReportedPosts(response.data || [])
          setModerationEnabled(true)
          return
        }
        if (Array.isArray(response)) {
          setReportedPosts(response)
          setModerationEnabled(true)
          return
        }
      } catch (e) {
        setModerationEnabled(false)
      }

      // Fallback: fetch all posts publicly and filter for reported ones
      const fallback = await forumAPI.listPosts({ limit: 1000 })
      const posts = (fallback?.data || []).filter((p: any) => (p.reportCount || 0) > 0)
      // Sort by report count desc then createdAt desc
      posts.sort((a: any, b: any) => (b.reportCount || 0) - (a.reportCount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setReportedPosts(posts)
    } catch (error) {
      console.error('Failed to load reported posts:', error)
    } finally {
      setLoadingReports(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      if (!moderationEnabled) throw new Error('Admin privileges required')
      const response = await adminAPI.deletePost(postId)
      if (response?.success) {
        setReportedPosts(prev => prev.filter(post => post._id !== postId))
        setAllPosts(prev => prev.filter(post => post._id !== postId))
        setTotalPosts(prev => Math.max(0, prev - 1))
      } else {
        throw new Error(response?.error || 'Failed to delete post')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post. ' + (error as any)?.message)
    }
  }

  const handleDismissReports = async (postId: string) => {
    try {
      if (!moderationEnabled) throw new Error('Admin privileges required')
      const response = await adminAPI.dismissReports(postId)
      if (response?.success) {
        setReportedPosts(prev => prev.filter(post => post._id !== postId))
      } else {
        throw new Error(response?.error || 'Failed to dismiss reports')
      }
    } catch (error) {
      console.error('Failed to dismiss reports:', error)
      alert('Failed to dismiss reports. ' + (error as any)?.message)
    }
  }

  const formatTimeAgo = (date: string | Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    
    if (seconds < 60) return `${seconds} seconds ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return new Date(date).toLocaleDateString()
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render the dashboard (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Mock data for charts
  const usageData = [
    { date: "Mon", users: 45, sessions: 67, journalEntries: 23 },
    { date: "Tue", users: 52, sessions: 78, journalEntries: 31 },
    { date: "Wed", users: 48, sessions: 71, journalEntries: 28 },
    { date: "Thu", users: 61, sessions: 89, journalEntries: 35 },
    { date: "Fri", users: 55, sessions: 82, journalEntries: 29 },
    { date: "Sat", users: 38, sessions: 54, journalEntries: 18 },
    { date: "Sun", users: 42, sessions: 61, journalEntries: 22 },
  ]

  const mentalHealthTrends = [
    { category: "Anxiety", count: 156, percentage: 35, trend: "up" },
    { category: "Academic Stress", count: 134, percentage: 30, trend: "up" },
    { category: "Depression", count: 89, percentage: 20, trend: "stable" },
    { category: "Sleep Issues", count: 67, percentage: 15, trend: "down" },
  ]

  const pieData = [
    { name: "Anxiety", value: 35, color: "#ef4444" },
    { name: "Academic Stress", value: 30, color: "#f97316" },
    { name: "Depression", value: 20, color: "#eab308" },
    { name: "Sleep Issues", value: 15, color: "#22c55e" },
  ]

  const riskAlerts = [
    {
      id: "1",
      type: "high",
      message: "User reported suicidal ideation in journal entry",
      timestamp: "2 minutes ago",
      action: "Crisis intervention initiated",
    },
    {
      id: "2",
      type: "medium",
      message: "Spike in anxiety-related posts in forum",
      timestamp: "15 minutes ago",
      action: "Monitoring increased",
    },
    {
      id: "3",
      type: "medium",
      message: "User missed 3 consecutive counseling appointments",
      timestamp: "1 hour ago",
      action: "Outreach scheduled",
    },
  ]

  

  const forumStats = {
    totalPosts: 1247,
    activeUsers: 89,
    moderationQueue: 5,
    reportedPosts: reportedPosts.length,
  }

  const exportData = () => {
    // Mock export functionality
    console.log("Exporting anonymized data...")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <ProfileDropdown />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Active Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.type === "high" ? "border-red-300 bg-red-100" : "border-yellow-300 bg-yellow-100"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                      </div>
                      <Badge variant={alert.type === "high" ? "destructive" : "secondary"}>
                        {alert.type === "high" ? "High Risk" : "Medium Risk"}
                      </Badge>
                    </div>
                    <p className="text-xs mt-2 font-medium">Action: {alert.action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% from last week
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Journal Entries</p>
                  <p className="text-2xl font-bold">186</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +8% from last week
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Counseling Sessions</p>
                  <p className="text-2xl font-bold">59</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +15% from last week
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Forum Posts</p>
                  <p className="text-2xl font-bold">89</p>
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                    <Activity className="h-3 w-3" />
                    Stable
                  </p>
                </div>
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="trends">Mental Health Trends</TabsTrigger>
            <TabsTrigger value="forum">Forum Management</TabsTrigger>
            <TabsTrigger value="all-posts">All Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Usage Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Platform Usage Analytics
                </CardTitle>
                <CardDescription>Daily active users, sessions, and journal entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <AdminCharts usageData={usageData} pieData={pieData} type="area" />
                </div>
              </CardContent>
            </Card>

            {/* User Engagement */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Daily Active Users</span>
                      <span className="font-medium">67%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "67%" }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Weekly Retention</span>
                      <span className="font-medium">84%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: "84%" }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Feature Adoption</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">System Uptime</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        99.9%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Response Time</span>
                      <Badge variant="secondary">&lt; 200ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Data Privacy</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Compliant
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Security Status</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Secure
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Mental Health Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RechartsPieChart className="h-5 w-5 text-primary" />
                    Mental Health Concerns Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <AdminCharts usageData={usageData} pieData={pieData} type="pie" />
                  </div>
                </CardContent>
              </Card>

              {/* Trending Issues */}
              <Card>
                <CardHeader>
                  <CardTitle>Trending Mental Health Issues</CardTitle>
                  <CardDescription>Based on journal analysis and forum posts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mentalHealthTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{trend.category}</p>
                          <p className="text-sm text-muted-foreground">{trend.count} mentions</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{trend.percentage}%</span>
                          <Badge
                            variant={
                              trend.trend === "up" ? "destructive" : trend.trend === "down" ? "secondary" : "outline"
                            }
                          >
                            {trend.trend === "up" ? "↑" : trend.trend === "down" ? "↓" : "→"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RechartsPieChart className="h-5 w-5 text-primary" />
                  Risk Assessment Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800">Low Risk</h4>
                    <p className="text-2xl font-bold text-green-600">1,089</p>
                    <p className="text-sm text-green-600">87% of users</p>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800">Medium Risk</h4>
                    <p className="text-2xl font-bold text-yellow-600">134</p>
                    <p className="text-sm text-yellow-600">11% of users</p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800">High Risk</h4>
                    <p className="text-2xl font-bold text-red-600">24</p>
                    <p className="text-sm text-red-600">2% of users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          

          <TabsContent value="forum" className="space-y-6">
            {/* Forum Statistics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{forumStats.totalPosts}</p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{forumStats.activeUsers}</p>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{forumStats.moderationQueue}</p>
                    <p className="text-sm text-muted-foreground">Pending Moderation</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{forumStats.reportedPosts}</p>
                    <p className="text-sm text-muted-foreground">Reported Posts</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reported Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Reported Posts</CardTitle>
                <CardDescription>Posts that have been reported by users</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading reported posts...</p>
                  </div>
                ) : reportedPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reported posts
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportedPosts.map((post) => (
                      <div key={post._id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{post.title}</h4>
                              <Badge variant="destructive">{post.reportCount} {post.reportCount === 1 ? 'report' : 'reports'}</Badge>
                              {post.isFlagged && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Flagged
                                </Badge>
                              )}
                              <Badge variant="outline">{post.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Posted by {post.isAnonymous ? 'Anonymous' : `${post.userId?.firstName || 'Unknown'} ${post.userId?.lastName || ''}`}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(post.createdAt)}</span>
                              <span>•</span>
                              <span>{post.likesCount} likes</span>
                              <span>•</span>
                              <span>{post.commentsCount} comments</span>
                            </div>
                            {post.reports && post.reports.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Report Reasons:</p>
                                <div className="space-y-1">
                                  {post.reports.slice(0, 3).map((report: any, idx: number) => (
                                    <div key={idx} className="text-xs text-muted-foreground">
                                      • {report.reason} {report.userId && `(by ${report.userId.email || 'user'})`}
                                    </div>
                                  ))}
                                  {post.reports.length > 3 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      +{post.reports.length - 3} more reports
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDismissReports(post._id)}
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Dismiss
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeletePost(post._id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-posts" className="space-y-6">
            {/* All Posts Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Forum Posts</CardTitle>
                    <CardDescription>Manage all posts - {totalPosts} total posts</CardDescription>
                  </div>
                  <Button onClick={loadAllPosts} variant="outline" size="sm">
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6">
                  <Input
                    placeholder="Search posts by title or content..."
                    value={searchPosts}
                    onChange={(e) => setSearchPosts(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                {loadingAllPosts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading posts...</p>
                  </div>
                ) : allPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No posts found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allPosts
                      .filter(post => {
                        if (!searchPosts) return true;
                        const search = searchPosts.toLowerCase();
                        return post.title.toLowerCase().includes(search) ||
                               post.content.toLowerCase().includes(search);
                      })
                      .map((post) => (
                      <div key={post._id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="font-medium truncate">{post.title}</h4>
                              <Badge variant="outline" className="shrink-0">{post.category}</Badge>
                              {post.isPinned && (
                                <Badge variant="secondary" className="shrink-0">Pinned</Badge>
                              )}
                              {post.reportCount > 0 && (
                                <Badge variant="destructive" className="shrink-0">
                                  {post.reportCount} {post.reportCount === 1 ? 'report' : 'reports'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {post.isAnonymous ? 'Anonymous' : `${post.userId?.firstName || 'Unknown'} ${post.userId?.lastName || ''}`}
                              </span>
                              <span>•</span>
                              <span>{formatTimeAgo(post.createdAt)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {post.likesCount}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {post.commentsCount}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {post.views}
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeletePost(post._id)}
                            className="gap-2 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
