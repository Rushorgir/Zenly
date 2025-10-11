/**
 * Forum Page - Enhanced with Search, Pagination, and Real-time Updates
 * 
 * Features:
 * - Case-insensitive dynamic search
 * - Pagination (8 posts per page)
 * - Socket.IO real-time updates
 * - React.memo optimization
 * - Accessible keyboard navigation
 * 
 * @page
 */

"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  MessageCircle,
  ThumbsUp,
  Eye,
  Plus,
  Pin,
  Search,
  Loader2,
  Wifi,
  WifiOff,
  Shield,
  ArrowLeft,
  Heart,
  Users,
} from 'lucide-react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import ProfileDropdown from "@/components/ProfileDropdown"
import ForumPostCard from "@/components/ForumPostCard"
import ForumPagination from "@/components/ForumPagination"
import { forumAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useSocket } from "@/hooks/use-socket"

interface ForumPost {
  _id: string
  title: string
  content: string
  userId?: {
    firstName?: string
    lastName?: string
  }
  isAnonymous: boolean
  category: string
  createdAt: string
  commentsCount: number
  likesCount: number
  views: number
  isPinned: boolean
  tags: string[]
  userLiked?: boolean
}

// Constants
const POSTS_PER_PAGE = 8

export default function ForumPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Socket.IO for real-time updates
  const { connected: socketConnected, on, off, emit } = useSocket({
    autoConnect: true
  })

  // State management
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [showNewPost, setShowNewPost] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "",
    isAnonymous: false,
    tags: "",
  })

  // Refs for optimization
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const forumContainerRef = useRef<HTMLDivElement | null>(null)

  // Load profile picture
  useEffect(() => {
    const storedProfilePic = localStorage.getItem("zenly_profile_picture")
    if (storedProfilePic) {
      setProfilePicture(storedProfilePic)
    }
  }, [])

  // Load posts on mount and when filters change
  useEffect(() => {
    loadPosts()
  }, [selectedCategory])

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socketConnected) return

    // Join forum room for real-time updates
    emit('forum:join')

    // Listen for new posts
    const handleNewPost = (post: ForumPost) => {
      console.log('[Forum] New post received:', post._id)
      setPosts(prev => [post, ...prev])
    }

    // Listen for post updates (likes, comments, etc.)
    const handlePostUpdate = (update: { postId: string; updates: Partial<ForumPost> }) => {
      console.log('[Forum] Post update received:', update.postId)
      setPosts(prev => prev.map(post => 
        post._id === update.postId 
          ? { ...post, ...update.updates }
          : post
      ))
    }

    // Listen for post deletions
    const handlePostDelete = (postId: string) => {
      console.log('[Forum] Post deleted:', postId)
      setPosts(prev => prev.filter(post => post._id !== postId))
    }

    on('forum:newPost', handleNewPost)
    on('forum:postUpdate', handlePostUpdate)
    on('forum:postDelete', handlePostDelete)

    return () => {
      emit('forum:leave')
      off('forum:newPost', handleNewPost)
      off('forum:postUpdate', handlePostUpdate)
      off('forum:postDelete', handlePostDelete)
    }
  }, [socketConnected, on, off, emit])

  /**
   * Load posts from API
   */
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCategory !== 'all') params.category = selectedCategory
      
      const response = await forumAPI.listPosts(params)
      if (response.success) {
        setPosts(response.data || [])
        // Reset to page 1 when filters change
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  /**
   * Frontend search - case-insensitive, filters posts by title, content, and selected tags
   * Posts are sorted by number of matching tags (most matches first)
   */
  const searchPosts = useMemo(() => {
    let filtered = posts

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        (post.tags && Array.isArray(post.tags) && post.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    // Tag filter - posts must have at least one of the selected tags
    if (selectedTags.size > 0) {
      filtered = filtered.filter(post => {
        if (!post.tags || !Array.isArray(post.tags)) return false
        return post.tags.some(tag => selectedTags.has(tag.toLowerCase()))
      })

      // Sort by number of matching tags (most matches at top)
      filtered = filtered.sort((a, b) => {
        const aMatches = a.tags?.filter(tag => selectedTags.has(tag.toLowerCase())).length || 0
        const bMatches = b.tags?.filter(tag => selectedTags.has(tag.toLowerCase())).length || 0
        return bMatches - aMatches
      })
    }

    return filtered
  }, [posts, searchQuery, selectedTags])

  /**
   * Paginate filtered posts
   */
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE
    const endIndex = startIndex + POSTS_PER_PAGE
    return searchPosts.slice(startIndex, endIndex)
  }, [searchPosts, currentPage])

  /**
   * Calculate total pages
   */
  const totalPages = useMemo(() => {
    return Math.ceil(searchPosts.length / POSTS_PER_PAGE)
  }, [searchPosts])

  /**
   * Handle search input with debounce
   */
  const handleSearchChange = useCallback((value: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search to avoid excessive re-renders
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1) // Reset to first page on search
    }, 300) // 300ms debounce
  }, [])

  /**
   * Handle page change - smooth scroll to top
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    
    // Smooth scroll to top of forum container
    if (forumContainerRef.current) {
      forumContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }, [])

  /**
   * Handle tag toggle - add/remove from selected tags
   */
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const newTags = new Set(prev)
      if (newTags.has(tag)) {
        newTags.delete(tag)
      } else {
        newTags.add(tag)
      }
      setCurrentPage(1) // Reset to first page
      return newTags
    })
  }, [])

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      router.push('/auth/login')
      return
    }

    try {
      const response = await forumAPI.likePost(postId)
      if (response.success) {
        // Update local state - response.data contains liked and likesCount
        setPosts(posts.map(post => 
          post._id === postId 
            ? { ...post, likesCount: response.data.likesCount, userLiked: response.data.liked }
            : post
        ))
        
        if (response.data.liked) {
          setLikedPosts(new Set(likedPosts).add(postId))
        } else {
          const newLiked = new Set(likedPosts)
          newLiked.delete(postId)
          setLikedPosts(newLiked)
        }
      }
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const handleReportPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setReportingPostId(postId)
    setShowReportDialog(true)
  }

  const submitReport = async () => {
    if (!reportingPostId) return

    try {
      await forumAPI.reportPost(reportingPostId, reportReason)
      setShowReportDialog(false)
      setReportReason("")
      setReportingPostId(null)
      // Show success message
      alert('Post reported successfully. Our moderators will review it.')
    } catch (error) {
      console.error('Failed to report post:', error)
      alert('Failed to report post. Please try again.')
    }
  }

  const categories = [
    "all",
    "Academic Stress",
    "Social Connection",
    "Sleep & Wellness",
    "Coping Strategies",
    "Depression",
    "Anxiety",
  ]

  const handleSubmitPost = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    try {
      const tags = newPost.tags.split(',').map(t => t.trim()).filter(t => t)
      const response = await forumAPI.createPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        tags,
        isAnonymous: newPost.isAnonymous
      })

      if (response.success) {
        setShowNewPost(false)
        setNewPost({ title: "", content: "", category: "", isAnonymous: false, tags: "" })
        loadPosts()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('Failed to create post. Please try again.')
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "1d ago"
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks === 1) return "1w ago"
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`
    return date.toLocaleDateString()
  }

  const getAuthorName = (post: ForumPost) => {
    if (post.isAnonymous) return "Anonymous"
    if (post.userId?.firstName || post.userId?.lastName) {
      return `${post.userId.firstName || ''} ${post.userId.lastName || ''}`.trim()
    }
    return "Anonymous"
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
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Peer Support Forum</h1>
            </div>
          </div>
          <ProfileDropdown />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Community Guidelines */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-0">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-primary mb-1">Community Guidelines</h3>
                <p className="text-sm text-muted-foreground">
                  This is a safe space for peer support. Be respectful, supportive, and remember that everyone's
                  experience is valid. Trained moderators monitor all posts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, topics, or tags..."
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              aria-label="Search forum posts"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-4 gap-6" ref={forumContainerRef}>
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Connection Status Indicator */}
            {socketConnected ? (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Wifi className="h-3 w-3 text-green-500" />
                <span>Real-time updates active</span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <WifiOff className="h-3 w-3 text-orange-500" />
                <span>Reconnecting...</span>
              </div>
            )}

            {/* Posts List */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : paginatedPosts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No posts found matching "{searchQuery}"</p>
                        <p className="text-sm mt-2">Try a different search term or clear the filter</p>
                      </>
                    ) : (
                      <>
                        <p>No posts found. Be the first to start a discussion!</p>
                        <Button
                          className="mt-4"
                          onClick={() => {
                            if (!user) {
                              router.push('/auth/login')
                            } else {
                              setShowNewPost(true)
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Post
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedPosts.map((post) => (
                    <ForumPostCard
                      key={post._id}
                      post={post}
                      onLike={handleLikePost}
                      onReport={handleReportPost}
                      onClick={(postId) => router.push(`/forum/${postId}`)}
                      formatTimeAgo={formatTimeAgo}
                      getAuthorName={getAuthorName}
                      isLiked={likedPosts.has(post._id)}
                    />
                  ))}
                  
                  {/* Pagination */}
                  <ForumPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                  
                  {/* Results Summary */}
                  <div className="text-center text-sm text-muted-foreground mt-4">
                    Showing {((currentPage - 1) * POSTS_PER_PAGE) + 1}-
                    {Math.min(currentPage * POSTS_PER_PAGE, searchPosts.length)} of {searchPosts.length} posts
                    {searchQuery && ` matching "${searchQuery}"`}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Popular Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Tags</CardTitle>
                <CardDescription className="text-xs">
                  {selectedTags.size > 0 
                    ? `${selectedTags.size} tag${selectedTags.size === 1 ? '' : 's'} selected`
                    : 'Click to filter posts'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    "anxiety",
                    "depression",
                    "study-tips",
                    "friendship",
                    "sleep",
                    "stress",
                    "mindfulness",
                    "college-life",
                  ].map((tag) => {
                    const isSelected = selectedTags.has(tag)
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                            : 'hover:bg-primary hover:text-primary-foreground'
                        }`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        #{tag}
                      </Badge>
                    )
                  })}
                </div>
                {selectedTags.size > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTags(new Set())}
                    className="mt-3 w-full text-xs"
                  >
                    Clear all tags
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Posts</span>
                  <span className="text-sm font-medium">{posts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Members</span>
                  <span className="text-sm font-medium">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Posts This Week</span>
                  <span className="text-sm font-medium">89</span>
                </div>
              </CardContent>
            </Card>

            {/* Crisis Resources */}
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-0">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Need Immediate Help?</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  If you&apos;re in crisis, please reach out for professional help immediately.
                </p>
                <div className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    <strong>Crisis Line:</strong> 14416
                  </p>
                  <p>
                    <strong>Campus Counseling:</strong> (555) 123-4567
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => {
            if (!user) {
              router.push('/auth/login')
            } else {
              setShowNewPost(true)
            }
          }}
          className="fixed bottom-8 right-8 bg-primary text-primary-foreground rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Create new post"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* New Post Dialog */}
        <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>Share your experience or ask for support from the community</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="What would you like to discuss?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    placeholder="Share your thoughts, experiences, or questions..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (optional)</label>
                  <Input
                    placeholder="anxiety, study-tips, friendship (comma separated)"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newPost.isAnonymous}
                    onChange={(e) => setNewPost({ ...newPost, isAnonymous: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="anonymous" className="text-sm">
                    Post anonymously
                  </label>
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPost(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitPost} disabled={!newPost.title || !newPost.content || !newPost.category}>
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Post</DialogTitle>
              <DialogDescription>
                Help us maintain a safe community by reporting inappropriate content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for reporting</label>
                <Textarea
                  placeholder="Please describe why you're reporting this post..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowReportDialog(false)
                setReportReason("")
              }}>
                Cancel
              </Button>
              <Button onClick={submitReport} disabled={!reportReason.trim()}>
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
