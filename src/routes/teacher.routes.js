import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAssignment, listAssignments, listSubmissions, gradeSubmission, viewStudentProfile, listAssignmentStudents, deleteAssignment } from '../controllers/teacher.controller.js';

const router = Router();

router.use(requireAuth('TEACHER'));

router.post('/assignments', createAssignment);
router.get('/assignments', listAssignments);
router.delete('/assignments/:id', deleteAssignment);
router.get('/assignments/:id/submissions', listSubmissions);
router.get('/assignments/:id/students', listAssignmentStudents);
router.post('/submissions/:id/grade', gradeSubmission);
router.get('/students/:id', viewStudentProfile);

export default router;


