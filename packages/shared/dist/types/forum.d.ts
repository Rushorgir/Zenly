export interface ForumPost {
    _id: string;
    title: string;
    content: string;
    userId?: {
        firstName?: string;
        lastName?: string;
    };
    isAnonymous: boolean;
    category: string;
    createdAt: string;
    commentsCount: number;
    likesCount: number;
    views: number;
    isPinned: boolean;
    tags: string[];
    userLiked?: boolean;
}
