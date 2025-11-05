import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    path: { type: String, required: true },
    skillsExtracted: { type: Boolean, default: false },
    skills: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', CertificateSchema);


