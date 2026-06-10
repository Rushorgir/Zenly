import express from 'express';
import { getMe, updateMe, updateAvatar, changePassword } from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { sanitizePayload } from '../middleware/sanitize.middleware.js';

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

router.get('/', getMe);
router.patch('/', sanitizePayload({ urlFields: ['avatarUrl'] }), updateMe);
router.put('/avatar', sanitizePayload({ urlFields: ['avatarUrl'] }), updateAvatar);
router.post('/password', changePassword);


export default router;
