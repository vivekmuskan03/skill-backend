import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { uploadCertificate, listCertificates, deleteCertificate, extractSkills, downloadCertificate } from '../controllers/certificate.controller.js';

const router = Router();

// download route: allow any authenticated user, controller will check ownership/role
router.get('/:id/download', requireAuth(), downloadCertificate);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'backend', 'uploads', 'certificates')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.use(requireAuth('STUDENT'));
router.post('/', upload.single('file'), uploadCertificate);
router.get('/', listCertificates);
router.delete('/:id', deleteCertificate);
router.post('/extract', extractSkills);

export default router;


