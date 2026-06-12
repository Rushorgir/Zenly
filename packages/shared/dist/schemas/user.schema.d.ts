import { z } from 'zod';
export declare const updateProfileSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    university: z.ZodOptional<z.ZodString>;
    academicYear: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    university?: string | undefined;
    academicYear?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name?: string | undefined;
    university?: string | undefined;
    academicYear?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
