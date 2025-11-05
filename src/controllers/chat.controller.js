import asyncHandler from 'express-async-handler';
import Message from '../models/Chat.js';
import User from '../models/User.js';

export const listMessages = asyncHandler(async (req, res) => {
  const peerId = req.params.peerId;
  const me = req.user.id;
  const msgs = await Message.find({
    $or: [
      { sender: me, receiver: peerId },
      { sender: peerId, receiver: me }
    ]
  }).sort({ createdAt: 1 });
  res.json({ messages: msgs });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const peerId = req.params.peerId;
  const me = req.user.id;
  const { body } = req.body;
  if (!body) return res.status(400).json({ message: 'Message body required' });
  const message = await Message.create({ sender: me, receiver: peerId, body });
  const io = req.app.get('io');
  io.to(peerId).emit('chat:message', { message });
  res.json({ message });
});

export const listPeers = asyncHandler(async (req, res) => {
  const me = req.user.id;
  // Distinct user IDs that have chatted with me
  const msgs = await Message.find({ $or: [{ sender: me }, { receiver: me }] }).select('sender receiver').lean();
  const peerIds = new Set();
  for (const m of msgs) {
    if (String(m.sender) !== String(me)) peerIds.add(String(m.sender));
    if (String(m.receiver) !== String(me)) peerIds.add(String(m.receiver));
  }
  const peers = await User.find({ _id: { $in: Array.from(peerIds) } }).select('name role registrationNumber teacherId subject section email');
  res.json({ peers });
});


