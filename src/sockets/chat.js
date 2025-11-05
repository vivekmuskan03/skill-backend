export function attachChatHandlers(io, socket) {
  const userId = socket.handshake.auth?.userId;
  if (userId) {
    socket.join(userId);
  }
  socket.on('disconnect', () => {
    // noop
  });
}


