import mongoose from 'mongoose';

const SkillProfileSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    skills: [{ type: String }],
    summary: { type: String },
    jobSuggestions: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model('SkillProfile', SkillProfileSchema);


