import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['STUDENT', 'TEACHER', 'ADMIN'], required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    // Student fields
    registrationNumber: { type: String, unique: true, sparse: true },
    course: { type: String },
    branch: { type: String, enum: ['CSE','Civil','Mech','ACSE','BioTech','EEE','ECE'] },
    section: { type: String },
    // Teacher fields
    teacherId: { type: String, unique: true, sparse: true },
    subject: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);


