import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateResumePdf } from '../controllers/resume.controller.js';

const router = Router();

router.post('/generate', requireAuth('STUDENT'), generateResumePdf);

export default router;


