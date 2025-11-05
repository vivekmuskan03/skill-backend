import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { setAuthCookies, clearAuthCookies } from '../middleware/auth.js';

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const studentSignup = asyncHandler(async (req, res) => {
  const { name, registrationNumber, course, branch, section, email, phone, password, confirmPassword } = req.body;
  if (!name || !registrationNumber || !course || !branch || !section || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Missing fields' });
  }
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
  const exists = await User.findOne({ $or: [{ email }, { registrationNumber }] });
  if (exists) return res.status(400).json({ message: 'User already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ role: 'STUDENT', name, registrationNumber, course, branch, section, email, phone, passwordHash });
  const token = signToken(user);
  setAuthCookies(res, token);
  res.json({ user: { id: user._id, role: user.role, name: user.name } });
});

export const studentLogin = asyncHandler(async (req, res) => {
  const { registrationNumber, password } = req.body;
  const user = await User.findOne({ registrationNumber, role: 'STUDENT' });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
  const token = signToken(user);
  setAuthCookies(res, token);
  res.json({ user: { id: user._id, role: user.role, name: user.name } });
});

export const teacherLogin = asyncHandler(async (req, res) => {
  const { teacherId, password } = req.body;
  const user = await User.findOne({ teacherId, role: 'TEACHER' });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
  const token = signToken(user);
  setAuthCookies(res, token);
  res.json({ user: { id: user._id, role: user.role, name: user.name } });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const user = { _id: 'admin', role: 'ADMIN', name: 'Admin' };
  const token = signToken(user);
  setAuthCookies(res, token);
  res.json({ user: { id: 'admin', role: 'ADMIN', name: 'Admin' } });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.id === 'admin') return res.json({ user: { id: 'admin', role: 'ADMIN', name: 'Admin' } });
  const user = await User.findById(req.user.id).select('name role email phone registrationNumber course branch section teacherId subject');
  res.json({ user });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});


