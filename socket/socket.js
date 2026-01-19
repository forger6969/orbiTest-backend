const connectedUsers = new Map(); // userId -> socketId
const Notify = require("../notification/notify.model"); // путь к вашей модели

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // 🔐 пользователь регистрируется
    socket.on("register", (userId) => {
      connectedUsers.set(userId, socket.id);
      console.log("User registered:", userId);

      // Отправляем непрочитанные уведомления при подключении
      sendPendingNotifications(userId, socket);
    });

    // Пометить уведомление как прочитанное
    socket.on("markAsViewed", async (notificationId) => {
      try {
        await Notify.findByIdAndUpdate(notificationId, { status: "viewed" });
        console.log("Notification marked as viewed:", notificationId);
      } catch (error) {
        console.error("Error marking notification as viewed:", error);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log("User disconnected:", userId);
          break;
        }
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};

// Отправка всех непрочитанных уведомлений при подключении
const sendPendingNotifications = async (userId, socket) => {
  try {
    const pendingNotifications = await Notify.find({
      user: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (pendingNotifications.length > 0) {
      socket.emit("pendingNotifications", pendingNotifications);
    }
  } catch (error) {
    console.error("Error fetching pending notifications:", error);
  }
};

module.exports = {
  initSocket,
  connectedUsers,
};
