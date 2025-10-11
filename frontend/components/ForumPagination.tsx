/**
 * Enhanced Pagination Component for Forum
 * 
 * A modern, accessible pagination component with:
 * - Page numbers with smart ellipsis
 * - Next/prev and first/last navigation
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * - Responsive design
 * 
 * @component
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface ForumPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxVisiblePages?: number
  className?: string
}

/**
 * Generates array of page numbers to display with ellipsis
 */
const generatePageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | 'ellipsis')[] => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = []
  const halfVisible = Math.floor(maxVisible / 2)

  // Always show first page
  pages.push(1)

  if (currentPage <= halfVisible + 1) {
    // Near start
    for (let i = 2; i <= Math.min(maxVisible - 1, totalPages - 1); i++) {
      pages.push(i)
    }
    if (totalPages > maxVisible - 1) {
      pages.push('ellipsis')
    }
  } else if (currentPage >= totalPages - halfVisible) {
    // Near end
    pages.push('ellipsis')
    for (let i = totalPages - (maxVisible - 2); i < totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Middle
    pages.push('ellipsis')
    for (let i = currentPage - halfVisible + 2; i <= currentPage + halfVisible - 2; i++) {
      pages.push(i)
    }
    pages.push('ellipsis')
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

export const ForumPagination = React.memo<ForumPaginationProps>(({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
  className = ''
}) => {
  if (totalPages <= 1) return null

  const pageNumbers = generatePageNumbers(currentPage, totalPages, maxVisiblePages)

  const handleKeyDown = (e: React.KeyboardEvent, page: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPageChange(page)
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="Forum pagination"
      className={`flex items-center justify-center gap-1 mt-8 ${className}`}
    >
      {/* First Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="Go to first page"
        className="hidden sm:flex"
        tabIndex={currentPage === 1 ? -1 : 0}
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
        tabIndex={currentPage === 1 ? -1 : 0}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Previous</span>
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground select-none"
                aria-hidden="true"
              >
                …
              </span>
            )
          }

          const isActive = page === currentPage

          return (
            <Button
              key={page}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              onKeyDown={(e) => handleKeyDown(e, page)}
              aria-label={`${isActive ? 'Current page, ' : ''}Page ${page}`}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-[40px] ${isActive ? 'pointer-events-none font-semibold' : ''}`}
              tabIndex={isActive ? -1 : 0}
            >
              {page}
            </Button>
          )
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
        tabIndex={currentPage === totalPages ? -1 : 0}
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Go to last page"
        className="hidden sm:flex"
        tabIndex={currentPage === totalPages ? -1 : 0}
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </nav>
  )
})

ForumPagination.displayName = 'ForumPagination'

export default ForumPagination
