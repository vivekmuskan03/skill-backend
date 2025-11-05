import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import SkillProfile from '../models/SkillProfile.js';
import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';

export const overview = asyncHandler(async (_req, res) => {
  const students = await User.countDocuments({ role: 'STUDENT' });
  const teachers = await User.countDocuments({ role: 'TEACHER' });
  const certificates = await Certificate.countDocuments();
  res.json({ students, teachers, certificates });
});

export const listTeachers = asyncHandler(async (_req, res) => {
  const teachers = await User.find({ role: 'TEACHER' }).select('-passwordHash');
  res.json({ teachers });
});

export const createTeacher = asyncHandler(async (req, res) => {
  const { name, subject, teacherId, email, phone, password } = req.body;
  if (!name || !subject || !teacherId || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ $or: [{ email }, { teacherId }] });
  if (exists) return res.status(400).json({ message: 'Teacher exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await User.create({ role: 'TEACHER', name, subject, teacherId, email, phone, passwordHash });
  res.json({ teacher: { id: teacher._id, name: teacher.name, subject: teacher.subject, teacherId: teacher.teacherId, email: teacher.email, phone: teacher.phone } });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, subject, email, phone, password } = req.body;
  const update = { name, subject, email, phone };
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  const teacher = await User.findOneAndUpdate({ _id: id, role: 'TEACHER' }, update, { new: true }).select('-passwordHash');
  if (!teacher) return res.status(404).json({ message: 'Not found' });
  res.json({ teacher });
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await User.deleteOne({ _id: id, role: 'TEACHER' });
  res.json({ ok: true });
});

export const listStudents = asyncHandler(async (req, res) => {
  const section = req.query.section;
  const q = { role: 'STUDENT', ...(section ? { section } : {}) };
  const students = await User.find(q).select('name registrationNumber section _id email course branch');
  res.json({ students });
});

export const studentDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await User.findOne({ _id: id, role: 'STUDENT' }).select('-passwordHash');
  if (!student) return res.status(404).json({ message: 'Not found' });

  const certificates = await Certificate.find({ student: id }).select('-filePath');
  const skillProfile = await SkillProfile.findOne({ student: id }) || { skills: [], summary: '', jobSuggestions: [] };

  // gather marks grouped by subject
  const subs = await Submission.find({ student: id }).populate('assignment');
  const bySubject = {};
  for (const s of subs) {
    const subj = s.assignment?.subject || 'Unknown';
    if (!bySubject[subj]) bySubject[subj] = { subject: subj, submissions: [], totalMarks: 0, count: 0 };
    bySubject[subj].submissions.push({ assignmentTitle: s.assignment?.title || '', marks: s.marks ?? null, submittedAt: s.createdAt });
    if (typeof s.marks === 'number') { bySubject[subj].totalMarks += s.marks; bySubject[subj].count += 1; }
  }
  const marksBySubject = Object.values(bySubject).map(b => ({ subject: b.subject, avg: b.count ? (b.totalMarks / b.count) : null, submissions: b.submissions }));

  res.json({ student, certificates, skillProfile, marksBySubject });
});


