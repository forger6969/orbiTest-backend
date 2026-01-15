const { getIO } = require("./io");
const { connectedUsers } = require("./socket");

const sendToUser = (userId, event, payload) => {
  const socketId = connectedUsers.get(userId.toString());

  if (!socketId) return;

  const io = getIO(); // ✅ теперь всегда существует
  io.to(socketId).emit(event, payload);
};

module.exports = { sendToUser };