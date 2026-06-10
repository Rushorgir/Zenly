import { z } from 'zod';

export const createForumPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  isAnonymous: z.boolean().default(false),
  tags: z.array(z.string()).optional()
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
  isAnonymous: z.boolean().default(false)
});
