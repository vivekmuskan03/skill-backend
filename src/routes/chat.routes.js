import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listMessages, sendMessage, listPeers } from '../controllers/chat.controller.js';

const router = Router();

router.use(requireAuth());

router.get('/peers', listPeers);
router.get('/:peerId', listMessages);
router.post('/:peerId', sendMessage);

export default router;


