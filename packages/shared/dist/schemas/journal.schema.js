"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJournalSchema = exports.createJournalSchema = void 0;
const zod_1 = require("zod");
exports.createJournalSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Journal content cannot be empty'),
    mood: zod_1.z.number().min(0).max(10),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
exports.updateJournalSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Journal content cannot be empty').optional(),
    mood: zod_1.z.number().min(0).max(10).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
