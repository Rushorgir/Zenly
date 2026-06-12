"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMoodSchema = void 0;
const zod_1 = require("zod");
exports.updateMoodSchema = zod_1.z.object({
    mood: zod_1.z.number().min(0).max(10),
    notes: zod_1.z.string().optional()
});
