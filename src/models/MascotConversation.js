import mongoose from 'mongoose';

const MascotConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  messages: { type: Array, default: [] },
}, { timestamps: true });

const MascotConversation = mongoose.model('MascotConversation', MascotConversationSchema);
export default MascotConversation;
