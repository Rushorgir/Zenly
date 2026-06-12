"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    university: zod_1.z.string().optional(),
    academicYear: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().url('Invalid avatar URL').optional()
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters')
});
