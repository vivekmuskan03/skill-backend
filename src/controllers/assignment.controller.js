import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';

export const listAllAssignments = asyncHandler(async (req, res) => {
  // Students see section-matched, teachers see theirs, admin sees all
  let query = {};
  if (req.user.role === 'STUDENT') {
    // We don't have section on token; rely on teacher route for student list. Here return all.
    query = {};
  } else if (req.user.role === 'TEACHER') {
    query = { teacher: req.user.id };
  }
  const list = await Assignment.find(query).sort({ createdAt: -1 });
  res.json({ assignments: list });
});

export const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const text = req.body?.text;
  if (!req.file && !text) return res.status(400).json({ message: 'File or text required' });
  const submission = await Submission.findOneAndUpdate(
    { assignment: assignmentId, student: req.user.id },
    {
      filePath: req.file?.path || '',
      originalName: req.file?.originalname || (text ? 'text.txt' : ''),
      textContent: text || undefined
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ submission });
});

export const downloadSubmission = asyncHandler(async (req, res) => {
  const sub = await Submission.findById(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Not found' });
  const abs = path.resolve(sub.filePath);
  if (!fs.existsSync(abs)) return res.status(404).json({ message: 'File missing' });
  res.download(abs, sub.originalName);
});


