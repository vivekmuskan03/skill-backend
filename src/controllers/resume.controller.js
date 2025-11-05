import asyncHandler from 'express-async-handler';
import PDFDocument from 'pdfkit';
import SkillProfile from '../models/SkillProfile.js';
import User from '../models/User.js';
import { generateResumeContent } from '../services/ai.service.js';

export const generateResumePdf = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const profile = await SkillProfile.findOne({ student: req.user.id });
  const content = await generateResumeContent(profile, user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text(user.name, { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Email: ${user.email || ''} | Phone: ${user.phone || ''}`);
  doc.moveDown();
  doc.fontSize(14).text('Objective');
  doc.fontSize(12).text(content.objective || '');
  doc.moveDown();
  doc.fontSize(14).text('Education');
  doc.fontSize(12).text(content.education || '');
  doc.moveDown();
  doc.fontSize(14).text('Skills');
  doc.fontSize(12).text((content.skills || []).join(', '));
  doc.moveDown();
  if (content.projects?.length) {
    doc.fontSize(14).text('Projects');
    for (const p of content.projects) {
      doc.fontSize(12).text(`${p.name}: ${p.description}`);
    }
    doc.moveDown();
  }
  if (content.experience?.length) {
    doc.fontSize(14).text('Experience');
    for (const e of content.experience) {
      doc.fontSize(12).text(`${e.role} at ${e.company} - ${e.description}`);
    }
  }
  doc.end();
});


