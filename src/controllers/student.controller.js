import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Certificate from '../models/Certificate.js';
import SkillProfile from '../models/SkillProfile.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('name email phone registrationNumber course branch section');
  res.json({ user });
});

export const updateContact = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  const updated = await User.findByIdAndUpdate(req.user.id, { email, phone }, { new: true }).select('name email phone registrationNumber course branch section');
  res.json({ user: updated });
});

export const myAssignments = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user.id);
  const assignments = await Assignment.find({ sections: me.section }).sort({ createdAt: -1 });
  res.json({ assignments });
});

export const mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ student: req.user.id }).populate('assignment');
  res.json({ submissions });
});

export const myCertificates = asyncHandler(async (req, res) => {
  const certs = await Certificate.find({ student: req.user.id }).sort({ createdAt: -1 });
  res.json({ certificates: certs });
});

export const mySkills = asyncHandler(async (req, res) => {
  const profile = await SkillProfile.findOne({ student: req.user.id });
  res.json({ skillProfile: profile || { skills: [], summary: '', jobSuggestions: [] } });
});


