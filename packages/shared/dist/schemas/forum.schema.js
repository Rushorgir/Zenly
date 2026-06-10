"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSchema = exports.createForumPostSchema = void 0;
const zod_1 = require("zod");
exports.createForumPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters"),
    content: zod_1.z.string().min(10, "Content must be at least 10 characters"),
    category: zod_1.z.string().min(1, "Category is required"),
    isAnonymous: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.createCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Comment content cannot be empty"),
    isAnonymous: zod_1.z.boolean().default(false),
});
