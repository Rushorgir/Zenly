import { z } from 'zod';

export const updateMoodSchema = z.object({
  mood: z.number().min(0).max(10),
  notes: z.string().optional()
});
