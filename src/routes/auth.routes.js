import { Router } from 'express';
import { studentSignup, studentLogin, teacherLogin, adminLogin, me, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/student/signup', studentSignup);
router.post('/student/login', studentLogin);
router.post('/teacher/login', teacherLogin);
router.post('/admin/login', adminLogin);
router.get('/me', requireAuth(), me);
router.post('/logout', logout);

export default router;


