import { z } from "zod";
export declare const createJournalSchema: z.ZodObject<{
    content: z.ZodString;
    mood: z.ZodNumber;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    content: string;
    mood: number;
    tags?: string[] | undefined;
}, {
    content: string;
    mood: number;
    tags?: string[] | undefined;
}>;
export declare const updateJournalSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    mood: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    content?: string | undefined;
    mood?: number | undefined;
    tags?: string[] | undefined;
}, {
    content?: string | undefined;
    mood?: number | undefined;
    tags?: string[] | undefined;
}>;
