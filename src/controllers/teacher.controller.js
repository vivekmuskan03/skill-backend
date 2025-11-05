import asyncHandler from 'express-async-handler';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

export const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, subject, dueDate, sections } = req.body;
  if (!title || !subject || !dueDate || !sections?.length) return res.status(400).json({ message: 'Missing fields' });
  const assignment = await Assignment.create({ title, description, subject, dueDate, sections, teacher: req.user.id });
  res.json({ assignment });
});

export const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({ teacher: req.user.id }).sort({ createdAt: -1 });
  res.json({ assignments });
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subs = await Submission.find({ assignment: id }).populate('student', 'name registrationNumber section');
  res.json({ submissions: subs });
});

export const gradeSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { marks, feedback } = req.body;
  const sub = await Submission.findByIdAndUpdate(id, { marks, feedback }, { new: true });
  res.json({ submission: sub });
});

export const listAssignmentStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const assignment = await Assignment.findById(id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  const students = await User.find({ role: 'STUDENT', section: { $in: assignment.sections } }).select('name registrationNumber section');
  const submissions = await Submission.find({ assignment: id }).select('student _id marks originalName textContent createdAt');
  const map = new Map();
  for (const s of submissions) map.set(String(s.student), s);
  const list = students.map(s => ({
    student: s,
    submission: map.get(String(s._id)) || null
  }));
  res.json({ students: list });
});

export const viewStudentProfile = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id).select('name registrationNumber course branch section email phone');
  res.json({ student });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // remove assignment and all related submissions
  await Assignment.findOneAndDelete({ _id: id, teacher: req.user.id });
  await Submission.deleteMany({ assignment: id });
  res.json({ ok: true });
});


