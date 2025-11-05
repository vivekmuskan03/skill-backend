import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { listAllAssignments, submitAssignment, downloadSubmission } from '../controllers/assignment.controller.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'backend', 'uploads', 'submissions')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/', requireAuth(), listAllAssignments);
router.post('/:assignmentId/submit', requireAuth('STUDENT'), upload.single('file'), submitAssignment);
router.get('/submissions/:id/download', requireAuth(), downloadSubmission);

export default router;


