import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

router.get('/teachers', requireAuth(), async (req, res) => {
  const teachers = await User.find({ role: 'TEACHER' }).select('name subject _id teacherId email');
  res.json({ teachers });
});

router.get('/students', requireAuth('TEACHER'), async (req, res) => {
  const section = req.query.section; // optional filter
  const q = { role: 'STUDENT', ...(section ? { section } : {}) };
  const students = await User.find(q).select('name registrationNumber section _id email');
  res.json({ students });
});

export default router;


