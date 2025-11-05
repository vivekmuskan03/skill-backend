import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mascotChat, getJobRoles, mascotStatus, getConversation, saveConversation, clearConversation } from '../controllers/mascot.controller.js';

const router = Router();

// public status endpoint so the frontend can check AI availability before auth
router.get('/status', mascotStatus);

router.use(requireAuth());
router.post('/chat', mascotChat);
router.get('/jobs', getJobRoles);
router.get('/conversation', getConversation);
router.post('/conversation', saveConversation);
router.delete('/conversation', clearConversation);

export default router;
