/**
 * Forum Post Card Component
 * 
 * Memoized component for rendering individual forum posts.
 * Optimized with React.memo to prevent unnecessary re-renders.
 * 
 * @component
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, ThumbsUp, Flag, Users, Eye, Pin } from 'lucide-react'

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

interface ForumPostCardProps {
  post: ForumPost
  onLike: (postId: string, e: React.MouseEvent) => void
  onReport: (postId: string, e: React.MouseEvent) => void
  onClick: (postId: string) => void
  formatTimeAgo: (date: string) => string
  getAuthorName: (post: ForumPost) => string
  isLiked: boolean
}

/**
 * Memoized Forum Post Card
 * Only re-renders when props change
 */
export const ForumPostCard = React.memo<ForumPostCardProps>(({
  post,
  onLike,
  onReport,
  onClick,
  formatTimeAgo,
  getAuthorName,
  isLiked
}) => {
  return (
    <Card
      className="hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onClick(post._id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {post.category}
              </Badge>
              {post.isPinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
            <CardTitle className="text-lg leading-tight mb-2">
              {post.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {post.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-500 flex-shrink-0"
            onClick={(e) => onReport(post._id, e)}
            aria-label="Report post"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags && Array.isArray(post.tags) && post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {getAuthorName(post)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {post.likesCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.views}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`hover:text-primary ${
              isLiked || post.userLiked ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={(e) => onLike(post._id, e)}
            aria-label={isLiked || post.userLiked ? 'Unlike post' : 'Like post'}
          >
            <ThumbsUp
              className={`h-4 w-4 ${isLiked || post.userLiked ? 'fill-current' : ''}`}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.post._id === nextProps.post._id &&
    prevProps.post.likesCount === nextProps.post.likesCount &&
    prevProps.post.commentsCount === nextProps.post.commentsCount &&
    prevProps.post.views === nextProps.post.views &&
    prevProps.isLiked === nextProps.isLiked
  )
})

ForumPostCard.displayName = 'ForumPostCard'

export default ForumPostCard
