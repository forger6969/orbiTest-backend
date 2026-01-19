const { getIO } = require("./io");
const { connectedUsers } = require("./socket");
const Notify = require("../notification/notify.model"); // путь к вашей модели

/**
 * Создает и отправляет уведомление пользователю
 * @param {string} userId - ID пользователя
 * @param {object} notificationData - Данные уведомления
 * @param {string} notificationData.title - Заголовок
 * @param {string} notificationData.text - Текст уведомления
 * @param {string} notificationData.notifyType - Тип (gradeUp, error, warning, success)
 */
const sendToUser = async (userId, notificationData) => {
  try {
    // Создаем уведомление в БД
    const notification = await Notify.create({
      title: notificationData.title,
      text: notificationData.text,
      user: userId,
      notifyType: notificationData.notifyType,
      status: "pending"
    });

    // Пробуем отправить через сокет, если пользователь онлайн
    const socketId = connectedUsers.get(userId.toString());
    
    if (socketId) {
      const io = getIO();
      io.to(socketId).emit("notification", notification);
      console.log(`Notification sent to user ${userId} via socket`);
    } else {
      console.log(`User ${userId} offline. Notification saved to DB`);
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

/**
 * Получить все уведомления пользователя
 * @param {string} userId - ID пользователя
 * @param {string} status - Фильтр по статусу (optional)
 */
const getUserNotifications = async (userId, status = null) => {
  try {
    const query = { user: userId };
    if (status) query.status = status;

    const notifications = await Notify.find(query)
      .sort({ createdAt: -1 });
    
    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Пометить уведомление как прочитанное
 * @param {string} notificationId - ID уведомления
 */
const markAsViewed = async (notificationId) => {
  try {
    const notification = await Notify.findByIdAndUpdate(
      notificationId,
      { status: "viewed" },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error("Error marking notification as viewed:", error);
    throw error;
  }
};

/**
 * Удалить все прочитанные уведомления пользователя
 * @param {string} userId - ID пользователя
 */
const deleteViewedNotifications = async (userId) => {
  try {
    const result = await Notify.deleteMany({
      user: userId,
      status: "viewed"
    });
    return result;
  } catch (error) {
    console.error("Error deleting viewed notifications:", error);
    throw error;
  }
};

module.exports = { 
  sendToUser,
  getUserNotifications,
  markAsViewed,
  deleteViewedNotifications
};