import { z } from "zod";
export declare const createForumPostSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    category: z.ZodString;
    isAnonymous: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    content: string;
    title: string;
    category: string;
    isAnonymous: boolean;
    tags?: string[] | undefined;
}, {
    content: string;
    title: string;
    category: string;
    tags?: string[] | undefined;
    isAnonymous?: boolean | undefined;
}>;
export declare const createCommentSchema: z.ZodObject<{
    content: z.ZodString;
    isAnonymous: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    content: string;
    isAnonymous: boolean;
}, {
    content: string;
    isAnonymous?: boolean | undefined;
}>;
