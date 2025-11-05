import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    sections: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', AssignmentSchema);


