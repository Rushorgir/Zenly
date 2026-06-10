import { z } from 'zod';

export const createJournalSchema = z.object({
  content: z.string().min(1, 'Journal content cannot be empty'),
  mood: z.number().min(0).max(10),
  tags: z.array(z.string()).optional()
});

export const updateJournalSchema = z.object({
  content: z.string().min(1, 'Journal content cannot be empty').optional(),
  mood: z.number().min(0).max(10).optional(),
  tags: z.array(z.string()).optional()
});
