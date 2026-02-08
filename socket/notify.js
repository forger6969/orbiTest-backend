// socket/notify.js
const { getIO } = require("./io");
const Notify = require("../notification/notify.model");
const MentorNotify = require("../notification/mentorNotify.model");

// Получаем Maps только когда они нужны (избегаем циклической зависимости)
const getConnectedUsers = () => {
  const { connectedUsers } = require("./socket");
  return connectedUsers;
};

const getConnectedMentors = () => {
  const { connectedMentors } = require("./socket");
  return connectedMentors;
};

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
      status: "pending",
    });

    // Пробуем отправить через сокет, если пользователь онлайн
    const connectedUsers = getConnectedUsers();
    const socketId = connectedUsers.get(userId.toString());

    if (socketId) {
      const io = getIO();
      io.of("/students").to(socketId).emit("notification", notification);
      console.log(`✅ Notification sent to user ${userId} via socket`);
    } else {
      console.log(`📭 User ${userId} offline. Notification saved to DB`);
    }

    return notification;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};

/**
 * Отправка уведомления ментору о завершении теста студентом
 * @param {string} mentorId - ID ментора
 * @param {object} notificationData - Данные уведомления
 */
const sendToMentor = async (mentorId, notificationData) => {
  try {
    const notification = await MentorNotify.create({
      title: notificationData.title,
      text: notificationData.text,
      mentor: mentorId,
      student: notificationData.student,
      test: notificationData.test,
      result: notificationData.result,
      notifyType: notificationData.notifyType || "testCompleted",
      additionalData: notificationData.additionalData,
      status: "pending",
    });

    await notification.populate("student", "firstName lastName grade");
    await notification.populate("test", "testTitle");

    const connectedMentors = getConnectedMentors();
    const socketId = connectedMentors.get(mentorId.toString());

    if (socketId) {
      const io = getIO();
      io.of("/mentors").to(socketId).emit("notification", notification);
      console.log(`✅ Notification sent to mentor ${mentorId} via socket`);
    } else {
      console.log(`📭 Mentor ${mentorId} offline. Notification saved to DB`);
    }

    return notification;
  } catch (error) {
    console.error("❌ Error sending mentor notification:", error);
    throw error;
  }
};

/**
 * Отправка уведомления всем менторам (использовать только для системных оповещений)
 * @param {object} notificationData - Данные уведомления
 * @deprecated Используйте sendToMentor для отправки конкретному ментору
 */
const sendToAllMentors = async (notificationData) => {
  try {
    const Mentor = require("../mentors/mentor.model");
    const mentors = await Mentor.find().select("_id");

    if (!mentors || mentors.length === 0) {
      console.log("⚠️ No mentors found in database");
      return [];
    }

    const notifications = [];
    for (const mentor of mentors) {
      try {
        const notification = await sendToMentor(mentor._id, notificationData);
        notifications.push(notification);
      } catch (error) {
        console.error(
          `❌ Error sending notification to mentor ${mentor._id}:`,
          error
        );
        // Продолжаем отправку другим менторам даже если одному не удалось
      }
    }

    console.log(`✅ Notifications sent to ${notifications.length} mentors`);
    return notifications;
  } catch (error) {
    console.error("❌ Error sending notifications to all mentors:", error);
    throw error;
  }
};

/**
 * Отправка уведомления ментору студента
 * @param {string} studentId - ID студента
 * @param {object} notificationData - Данные уведомления
 */
const sendToStudentMentor = async (studentId, notificationData) => {
  try {
    const { User } = require("../user/user.model");

    // Находим студента и получаем его ментора
    const student = await User.findById(studentId).select("mentor");

    if (!student) {
      console.log(`⚠️ Student ${studentId} not found`);
      return null;
    }

    if (!student.mentor) {
      console.log(`⚠️ Student ${studentId} has no assigned mentor`);
      return null;
    }

    // Отправляем уведомление только ментору этого студента
    const notification = await sendToMentor(student.mentor, {
      ...notificationData,
      student: studentId,
    });

    console.log(`✅ Notification sent to student's mentor ${student.mentor}`);
    return notification;
  } catch (error) {
    console.error("❌ Error sending notification to student's mentor:", error);
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

    const notifications = await Notify.find(query).sort({ createdAt: -1 });
    return notifications;
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Получить все уведомления ментора
 * @param {string} mentorId - ID ментора
 * @param {string} status - Фильтр по статусу (optional)
 */
const getMentorNotifications = async (mentorId, status = null) => {
  try {
    const query = { mentor: mentorId };
    if (status) query.status = status;

    const notifications = await MentorNotify.find(query)
      .populate("student", "firstName lastName grade")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 });

    return notifications;
  } catch (error) {
    console.error("❌ Error fetching mentor notifications:", error);
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
    console.error("❌ Error marking notification as viewed:", error);
    throw error;
  }
};

/**
 * Пометить уведомление ментора как прочитанное
 * @param {string} notificationId - ID уведомления
 */
const markMentorNotifyAsViewed = async (notificationId) => {
  try {
    const notification = await MentorNotify.findByIdAndUpdate(
      notificationId,
      { status: "viewed" },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error("❌ Error marking mentor notification as viewed:", error);
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
      status: "viewed",
    });
    return result;
  } catch (error) {
    console.error("❌ Error deleting viewed notifications:", error);
    throw error;
  }
};

/**
 * Удалить все прочитанные уведомления ментора
 * @param {string} mentorId - ID ментора
 */
const deleteMentorViewedNotifications = async (mentorId) => {
  try {
    const result = await MentorNotify.deleteMany({
      mentor: mentorId,
      status: "viewed",
    });
    return result;
  } catch (error) {
    console.error("❌ Error deleting mentor viewed notifications:", error);
    throw error;
  }
};

module.exports = {
  sendToUser,
  sendToMentor,
  sendToAllMentors,
  sendToStudentMentor, // Новая функция
  getUserNotifications,
  getMentorNotifications,
  markAsViewed,
  markMentorNotifyAsViewed,
  deleteViewedNotifications,
  deleteMentorViewedNotifications,
};
