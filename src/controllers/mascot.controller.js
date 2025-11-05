import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import SkillProfile from '../models/SkillProfile.js';
import Certificate from '../models/Certificate.js';
import { chatWithMascot, jobRolesWithDetails, isModelAvailable, isModelAvailableAsync, parseAssignmentCommand } from '../services/ai.service.js';
import MascotConversation from '../models/MascotConversation.js';

export const mascotChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) return res.status(400).json({ message: 'Message required' });

  // gather some context: user basic info and skill profile
  const userObj = await User.findById(req.user.id).select('name course branch section email registrationNumber role');
  const profile = await SkillProfile.findOne({ student: req.user.id });
  const certs = await Certificate.find({ student: req.user.id }).select('originalName mimeType skillsExtracted createdAt');

  const userContext = {
    user: userObj || {},
    skills: profile?.skills || [],
    summary: profile?.summary || '',
    jobSuggestions: profile?.jobSuggestions || [],
    certificates: certs || []
  };

  // first, use the parser to detect actionable intent (create assignment / query missing submissions)
  const parsed = await parseAssignmentCommand(message || '');
  try {
    if (parsed && parsed.action === 'create_assignment' && userObj?.role === 'TEACHER') {
      // dynamic import models to avoid circular requires
      const Assignment = (await import('../models/Assignment.js')).default;
      const assignmentData = {
        title: parsed.title || 'Untitled Assignment',
        subject: parsed.subject || 'General',
        description: parsed.description || '',
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        teacher: req.user.id,
      };
      const created = await Assignment.create(assignmentData);
      const reply = `Assignment "${created.title}" created successfully.`;
      return res.json({ reply, createdAssignment: created });
    }

    if (parsed && parsed.action === 'query_missing') {
      const Assignment = (await import('../models/Assignment.js')).default;
      const Submission = (await import('../models/Submission.js')).default;
      const UserModel = (await import('../models/User.js')).default;
      const assignment = await Assignment.findOne({ title: new RegExp(parsed.assignmentTitle, 'i'), teacher: req.user.id });
      if (!assignment) {
        return res.json({ reply: `I couldn't find an assignment matching "${parsed.assignmentTitle}".` });
      }
      const studentsQuery = assignment.sections && assignment.sections.length > 0 ? { section: { $in: assignment.sections } } : {};
      const students = await UserModel.find({ role: 'STUDENT', ...studentsQuery }).select('_id name email registrationNumber');
      const submitted = await Submission.find({ assignment: assignment._id }).distinct('student');
      const notSubmitted = students.filter((s) => !submitted.includes(String(s._id))).map((s) => ({ id: s._id, name: s.name, email: s.email, regNo: s.registrationNumber }));
  const reply = `Found ${notSubmitted.length} students who have not submitted "${assignment.title}".`;
  return res.json({ reply, missing: notSubmitted, assignmentId: assignment._id });
    }

    // fallback to normal chat
    const reply = await chatWithMascot(userContext, message);
    res.json({ reply });
  } catch (err) {
    console.error('mascotChat error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const getJobRoles = asyncHandler(async (req, res) => {
  // Accept optional skills via query (comma separated) so teachers can supply skills directly
  const qs = String(req.query.skills || '').trim();
  let skills = [];
  if (qs) skills = qs.split(',').map(s=>s.trim()).filter(Boolean);
  if (!skills || skills.length === 0) {
    const profile = await SkillProfile.findOne({ student: req.user.id });
    skills = profile?.skills || [];
  }
  // if still no skills, we still call the AI with empty list so it can suggest based on defaults
  const jobs = await jobRolesWithDetails(skills);
  res.json({ jobs });
});

export const mascotStatus = asyncHandler(async (req, res) => {
  // perform a quick connectivity test to verify the model is reachable (not just API key present)
  try {
    const ok = await isModelAvailableAsync(2500).catch(()=>false);
    res.json({ aiAvailable: Boolean(ok) });
  } catch (e) {
    res.json({ aiAvailable: false });
  }
});

export const getConversation = asyncHandler(async (req, res) => {
  const conv = await MascotConversation.findOne({ user: req.user.id });
  res.json({ messages: conv?.messages || [] });
});

export const saveConversation = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });
  const up = await MascotConversation.findOneAndUpdate({ user: req.user.id }, { messages }, { upsert: true, new: true });
  res.json({ ok: true });
});

export const clearConversation = asyncHandler(async (req, res) => {
  await MascotConversation.deleteOne({ user: req.user.id });
  res.json({ ok: true });
});
