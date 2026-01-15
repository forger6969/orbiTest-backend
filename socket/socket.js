const connectedUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // 🔐 пользователь регистрируется
    socket.on("register", (userId) => {
      connectedUsers.set(userId, socket.id);
      console.log("User registered:", userId);
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};

module.exports = {
  initSocket,
  connectedUsers,
};
