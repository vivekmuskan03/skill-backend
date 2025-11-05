import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createTeacher, listTeachers, updateTeacher, deleteTeacher, overview, listStudents, studentDetail } from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAuth('ADMIN'));

router.get('/overview', overview);
router.get('/teachers', listTeachers);
router.post('/teachers', createTeacher);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.get('/students', listStudents);
router.get('/students/:id', studentDetail);

export default router;


