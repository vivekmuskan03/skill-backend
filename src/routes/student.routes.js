import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, updateContact, myAssignments, mySubmissions, myCertificates, mySkills } from '../controllers/student.controller.js';

const router = Router();

router.use(requireAuth('STUDENT'));

router.get('/me', getProfile);
router.put('/me', updateContact);
router.get('/assignments', myAssignments);
router.get('/submissions', mySubmissions);
router.get('/certificates', myCertificates);
router.get('/skills', mySkills);

export default router;


