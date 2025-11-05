import asyncHandler from 'express-async-handler';
import Certificate from '../models/Certificate.js';
import SkillProfile from '../models/SkillProfile.js';
import { extractSkillsFromCertificates } from '../services/ai.service.js';
import path from 'path';
import fs from 'fs';

export const uploadCertificate = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File required' });
  const cert = await Certificate.create({
    student: req.user.id,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    path: req.file.path
  });
  res.json({ certificate: cert });
});

export const listCertificates = asyncHandler(async (req, res) => {
  const list = await Certificate.find({ student: req.user.id }).sort({ createdAt: -1 });
  res.json({ certificates: list });
});

export const deleteCertificate = asyncHandler(async (req, res) => {
  await Certificate.deleteOne({ _id: req.params.id, student: req.user.id });
  res.json({ ok: true });
});

export const extractSkills = asyncHandler(async (req, res) => {
  const certs = await Certificate.find({ student: req.user.id });
  // If user has no certificates, do not create or expose skills
  if (!certs || certs.length === 0) {
    return res.json({ skillProfile: { skills: [], summary: '', jobSuggestions: [] } });
  }

  const result = await extractSkillsFromCertificates(certs);
  // Normalize and dedupe extracted skills
  const skillSet = Array.from(new Set((result.skills || []).map(s => String(s).trim()).filter(Boolean)));

  // mark certificates as processed
  await Certificate.updateMany({ student: req.user.id }, { $set: { skillsExtracted: true } });

  // merge with any existing SkillProfile: keep previously tracked skills and only add new unique ones
  const existing = await SkillProfile.findOne({ student: req.user.id });
  const merged = existing && Array.isArray(existing.skills)
    ? Array.from(new Set([...(existing.skills || []), ...skillSet]))
    : skillSet;

  const profile = await SkillProfile.findOneAndUpdate(
    { student: req.user.id },
    { skills: merged, summary: result.summary || (existing?.summary || ''), jobSuggestions: result.jobs || (existing?.jobSuggestions || []) },
    { new: true, upsert: true }
  );

  res.json({ skillProfile: profile });
});

export const downloadCertificate = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const cert = await Certificate.findById(id);
  if (!cert) return res.status(404).json({ message: 'Not found' });
  // allow owner (student) or admin
  const isOwner = String(cert.student) === String(req.user.id);
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Forbidden' });

  let filePath = cert.path;
  const candidates = [];
  if (filePath) candidates.push(filePath);
  // try common alternative locations (project started from repo root or backend folder)
  const baseName = filePath ? path.basename(filePath) : null;
  if (baseName) {
    candidates.push(path.join(process.cwd(), 'uploads', 'certificates', baseName));
    candidates.push(path.join(process.cwd(), 'backend', 'uploads', 'certificates', baseName));
    candidates.push(path.join(process.cwd(), '..', 'backend', 'uploads', 'certificates', baseName));
  }

  let found = null;
  for (const p of candidates) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) { found = p; break; }
    } catch (e) {}
  }

  if (!found) {
    console.error('downloadCertificate: file not found. candidates=', candidates);
    return res.status(404).json({ message: 'File not found' });
  }

  // use res.download which sets headers appropriately
  return res.download(path.resolve(found), cert.originalName, (err) => {
    if (err) console.error('downloadCertificate send error', err);
  });
});


