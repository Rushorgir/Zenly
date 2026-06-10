import { z } from "zod";
export declare const updateMoodSchema: z.ZodObject<{
    mood: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mood: number;
    notes?: string | undefined;
}, {
    mood: number;
    notes?: string | undefined;
}>;
