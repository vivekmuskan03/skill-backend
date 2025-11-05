import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import adminRoutes from './routes/admin.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import chatRoutes from './routes/chat.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import mascotRoutes from './routes/mascot.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import directoryRoutes from './routes/directory.routes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { ensureUploadDirs } from './utils/ensureDirs.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use(limiter);

app.get('/', (_req, res) => res.json({ ok: true, service: 'Student Profile Tracer API' }));

ensureUploadDirs();

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/mascot', mascotRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/directory', directoryRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;


