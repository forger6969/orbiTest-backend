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
 * @param {string} notificationData.notifyType - Тип уведомления
 * @param {string} [notificationData.priority] - Приоритет (low, normal, high, urgent)
 * @param {object} [notificationData.additionalData] - Дополнительные данные
 * @param {string} [notificationData.actionUrl] - URL для перехода
 * @param {string} [notificationData.mentor] - ID ментора
 * @param {string} [notificationData.test] - ID теста
 * @param {string} [notificationData.result] - ID результата
 */
const sendToUser = async (userId, notificationData) => {
  try {
    // Создаем уведомление в БД
    const notification = await Notify.create({
      title: notificationData.title,
      text: notificationData.text,
      user: userId,
      notifyType: notificationData.notifyType || "info",
      priority: notificationData.priority || "normal",
      status: "pending",
      mentor: notificationData.mentor,
      test: notificationData.test,
      result: notificationData.result,
      additionalData: notificationData.additionalData,
      actionUrl: notificationData.actionUrl,
    });

    // Популяция связанных данных
    await notification.populate("mentor", "firstName lastName");
    await notification.populate("test", "testTitle");

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
 * Отправка уведомления о назначении теста
 */
const sendTestAssignedNotification = async (userId, testData) => {
  return sendToUser(userId, {
    title: "📝 Новый тест назначен",
    text: `Вам назначен тест "${testData.testTitle}". ${
      testData.deadline
        ? `Срок выполнения: ${new Date(testData.deadline).toLocaleDateString()}`
        : ""
    }`,
    notifyType: "testAssigned",
    priority: "high",
    test: testData.testId,
    mentor: testData.mentorId,
    additionalData: {
      testTitle: testData.testTitle,
      deadlineDate: testData.deadline,
      mentorName: testData.mentorName,
    },
    actionUrl: `/tests/${testData.testId}`,
  });
};

/**
 * Отправка уведомления о завершении теста
 */
const sendTestCompletedNotification = async (userId, resultData) => {
  const isPerfect = resultData.successRate === 100;
  const isPassed = resultData.successRate >= 60;

  let notifyType = "testCompleted";
  let title = "✅ Тест завершён";
  let priority = "normal";

  if (isPerfect) {
    notifyType = "testPerfect";
    title = "🎉 Идеальный результат!";
    priority = "high";
  } else if (!isPassed) {
    notifyType = "testFailed";
    title = "❌ Тест не пройден";
    priority = "high";
  } else if (resultData.successRate >= 90) {
    notifyType = "testPassed";
    title = "🌟 Отличный результат!";
    priority = "normal";
  }

  return sendToUser(userId, {
    title,
    text: `Тест "${resultData.testTitle}" завершён. Результат: ${resultData.score} баллов (${resultData.successRate}%)`,
    notifyType,
    priority,
    test: resultData.testId,
    result: resultData.resultId,
    additionalData: {
      testTitle: resultData.testTitle,
      score: resultData.score,
      successRate: resultData.successRate,
    },
    actionUrl: `/results/${resultData.resultId}`,
  });
};

/**
 * Отправка уведомления о повышении оценки
 */
const sendGradeUpNotification = async (userId, gradeData) => {
  return sendToUser(userId, {
    title: "📈 Оценка повышена!",
    text: `Поздравляем! Ваша оценка повышена с ${gradeData.previousGrade} на ${gradeData.newGrade}`,
    notifyType: "gradeUp",
    priority: "high",
    mentor: gradeData.mentorId,
    additionalData: {
      previousGrade: gradeData.previousGrade,
      newGrade: gradeData.newGrade,
      mentorName: gradeData.mentorName,
    },
  });
};

/**
 * Отправка уведомления о достижении
 */
const sendAchievementNotification = async (userId, achievementData) => {
  return sendToUser(userId, {
    title: "🏆 Достижение разблокировано!",
    text: `Поздравляем! Вы получили достижение "${achievementData.achievementName}"`,
    notifyType: "achievement",
    priority: "high",
    additionalData: {
      achievementName: achievementData.achievementName,
      description: achievementData.description,
    },
    actionUrl: "/achievements",
  });
};

/**
 * Отправка уведомления о серии дней обучения
 */
const sendStudyStreakNotification = async (userId, streakDays) => {
  return sendToUser(userId, {
    title: "🔥 Отличная серия!",
    text: `Вы занимаетесь ${streakDays} ${
      streakDays === 1 ? "день" : streakDays < 5 ? "дня" : "дней"
    } подряд! Продолжайте в том же духе!`,
    notifyType: "studyStreak",
    priority: "normal",
    additionalData: {
      streakDays,
    },
  });
};

/**
 * Отправка напоминания о тесте
 */
const sendTestReminderNotification = async (userId, testData) => {
  return sendToUser(userId, {
    title: "⏰ Напоминание о тесте",
    text: `Не забудьте пройти тест "${testData.testTitle}". ${
      testData.deadline
        ? `Осталось времени до ${new Date(
            testData.deadline
          ).toLocaleDateString()}`
        : ""
    }`,
    notifyType: "testReminder",
    priority: "high",
    test: testData.testId,
    additionalData: {
      testTitle: testData.testTitle,
      deadlineDate: testData.deadline,
    },
    actionUrl: `/tests/${testData.testId}`,
  });
};

/**
 * Отправка уведомления о назначении ментора
 */
const sendMentorAssignedNotification = async (userId, mentorData) => {
  return sendToUser(userId, {
    title: "👨‍🏫 Назначен ментор",
    text: `${mentorData.mentorName} теперь ваш ментор. Свяжитесь с ним для планирования занятий.`,
    notifyType: "mentorAssigned",
    priority: "high",
    mentor: mentorData.mentorId,
    additionalData: {
      mentorName: mentorData.mentorName,
    },
    actionUrl: `/mentor/${mentorData.mentorId}`,
  });
};

/**
 * Отправка уведомления с обратной связью от ментора
 */
const sendMentorFeedbackNotification = async (userId, feedbackData) => {
  return sendToUser(userId, {
    title: "💬 Обратная связь от ментора",
    text: feedbackData.message,
    notifyType: "mentorFeedback",
    priority: "normal",
    mentor: feedbackData.mentorId,
    test: feedbackData.testId,
    additionalData: {
      mentorName: feedbackData.mentorName,
    },
    actionUrl: feedbackData.actionUrl,
  });
};

/**
 * Отправка уведомления о доступности пересдачи
 */
const sendRetakeAvailableNotification = async (userId, testData) => {
  return sendToUser(userId, {
    title: "🔄 Доступна пересдача",
    text: `Вы можете пересдать тест "${testData.testTitle}" для улучшения результата`,
    notifyType: "retakeAvailable",
    priority: "normal",
    test: testData.testId,
    additionalData: {
      testTitle: testData.testTitle,
      previousScore: testData.previousScore,
    },
    actionUrl: `/tests/${testData.testId}/retake`,
  });
};

/**
 * Отправка уведомления о прогрессе по курсу
 */
const sendCourseProgressNotification = async (userId, progressData) => {
  return sendToUser(userId, {
    title: "📊 Прогресс по курсу",
    text: `Вы завершили ${progressData.progressPercentage}% курса "${progressData.courseName}"`,
    notifyType: "courseProgress",
    priority: "low",
    additionalData: {
      courseName: progressData.courseName,
      progressPercentage: progressData.progressPercentage,
    },
    actionUrl: `/courses/${progressData.courseId}`,
  });
};

/**
 * Отправка приветственного уведомления
 */
const sendWelcomeNotification = async (userId, userData) => {
  return sendToUser(userId, {
    title: "👋 Добро пожаловать!",
    text: `Здравствуйте, ${userData.firstName}! Добро пожаловать в нашу образовательную платформу.`,
    notifyType: "welcome",
    priority: "normal",
    additionalData: {
      firstName: userData.firstName,
    },
  });
};

// ============ ФУНКЦИИ ДЛЯ МЕНТОРОВ ============

/**
 * Отправка уведомления ментору
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
      notifyType: notificationData.notifyType || "info",
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
 * Отправка уведомления ментору студента
 * @param {string} studentId - ID студента
 * @param {object} notificationData - Данные уведомления
 */
const sendToStudentMentor = async (studentId, notificationData) => {
  try {
    const { User } = require("../user/user.model");

    const student = await User.findById(studentId).select("mentor");

    if (!student) {
      console.log(`⚠️ Student ${studentId} not found`);
      return null;
    }

    if (!student.mentor) {
      console.log(`⚠️ Student ${studentId} has no assigned mentor`);
      return null;
    }

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
 * Отправка уведомления всем менторам (только для системных оповещений)
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
      }
    }

    console.log(`✅ Notifications sent to ${notifications.length} mentors`);
    return notifications;
  } catch (error) {
    console.error("❌ Error sending notifications to all mentors:", error);
    throw error;
  }
};

// ============ ФУНКЦИИ ПОЛУЧЕНИЯ УВЕДОМЛЕНИЙ ============

/**
 * Получить все уведомления пользователя
 * @param {string} userId - ID пользователя
 * @param {string} status - Фильтр по статусу (optional)
 * @param {number} limit - Лимит количества (optional)
 */
const getUserNotifications = async (userId, status = null, limit = 50) => {
  try {
    const query = { user: userId };
    if (status) query.status = status;

    const notifications = await Notify.find(query)
      .populate("mentor", "firstName lastName")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 })
      .limit(limit);

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
 * @param {number} limit - Лимит количества (optional)
 */
const getMentorNotifications = async (mentorId, status = null, limit = 50) => {
  try {
    const query = { mentor: mentorId };
    if (status) query.status = status;

    const notifications = await MentorNotify.find(query)
      .populate("student", "firstName lastName grade")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 })
      .limit(limit);

    return notifications;
  } catch (error) {
    console.error("❌ Error fetching mentor notifications:", error);
    throw error;
  }
};

/**
 * Получить количество непрочитанных уведомлений
 */
const getUnreadCount = async (userId) => {
  try {
    const count = await Notify.countDocuments({
      user: userId,
      status: "pending",
    });
    return count;
  } catch (error) {
    console.error("❌ Error getting unread count:", error);
    throw error;
  }
};

/**
 * Получить количество непрочитанных уведомлений ментора
 */
const getMentorUnreadCount = async (mentorId) => {
  try {
    const count = await MentorNotify.countDocuments({
      mentor: mentorId,
      status: "pending",
    });
    return count;
  } catch (error) {
    console.error("❌ Error getting mentor unread count:", error);
    throw error;
  }
};

// ============ ФУНКЦИИ УПРАВЛЕНИЯ УВЕДОМЛЕНИЯМИ ============

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
 * Пометить все уведомления пользователя как прочитанные
 */
const markAllAsViewed = async (userId) => {
  try {
    const result = await Notify.updateMany(
      { user: userId, status: "pending" },
      { status: "viewed" }
    );
    return result;
  } catch (error) {
    console.error("❌ Error marking all notifications as viewed:", error);
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
 * Пометить все уведомления ментора как прочитанные
 */
const markAllMentorNotifyAsViewed = async (mentorId) => {
  try {
    const result = await MentorNotify.updateMany(
      { mentor: mentorId, status: "pending" },
      { status: "viewed" }
    );
    return result;
  } catch (error) {
    console.error(
      "❌ Error marking all mentor notifications as viewed:",
      error
    );
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

// В файл socket/notify.js добавьте эти функции:

/**
 * Отправка уведомления о назначении нового экзамена
 */
const sendExamAssignedNotification = async (userId, examData) => {
  const daysUntilStart = Math.ceil(
    (new Date(examData.examStart) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return sendToUser(userId, {
    title: "📋 Назначен новый экзамен",
    text: `Вам назначен экзамен "${examData.examTitle}". Начало: ${new Date(
      examData.examStart
    ).toLocaleDateString()}. Окончание: ${new Date(
      examData.examEnd
    ).toLocaleDateString()}`,
    notifyType: "examAssigned",
    priority: "high",
    exam: examData.examId,
    additionalData: {
      examTitle: examData.examTitle,
      examStartDate: examData.examStart,
      examEndDate: examData.examEnd,
      examMaxScore: examData.maxScore,
      examTotalRequirements: examData.requirements?.length || 0,
      daysUntilDeadline: Math.ceil(
        (new Date(examData.examEnd) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    },
    actionUrl: `/exams/${examData.examId}`,
  });
};

/**
 * Отправка напоминания об экзамене
 */
const sendExamReminderNotification = async (userId, examData) => {
  const daysLeft = Math.ceil(
    (new Date(examData.examEnd) - new Date()) / (1000 * 60 * 60 * 24)
  );
  const hoursLeft = Math.ceil(
    (new Date(examData.examEnd) - new Date()) / (1000 * 60 * 60)
  );

  let timeText = "";
  if (daysLeft > 1) {
    timeText = `Осталось ${daysLeft} ${
      daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"
    }`;
  } else if (hoursLeft > 0) {
    timeText = `Осталось ${hoursLeft} ${
      hoursLeft === 1 ? "час" : hoursLeft < 5 ? "часа" : "часов"
    }`;
  } else {
    timeText = "Срок сдачи истекает сегодня!";
  }

  return sendToUser(userId, {
    title: "⏰ Напоминание об экзамене",
    text: `Не забудьте сдать экзамен "${examData.examTitle}". ${timeText}`,
    notifyType: "examReminder",
    priority: daysLeft <= 1 ? "urgent" : "high",
    exam: examData.examId,
    additionalData: {
      examTitle: examData.examTitle,
      examEndDate: examData.examEnd,
      daysUntilDeadline: daysLeft,
      hoursUntilDeadline: hoursLeft,
    },
    actionUrl: `/exams/${examData.examId}`,
  });
};

/**
 * Отправка уведомления о приближении дедлайна экзамена
 */
const sendExamDeadlineNotification = async (userId, examData) => {
  const hoursLeft = Math.ceil(
    (new Date(examData.examEnd) - new Date()) / (1000 * 60 * 60)
  );

  return sendToUser(userId, {
    title: "🚨 Дедлайн экзамена близко!",
    text: `Экзамен "${examData.examTitle}" завершается через ${hoursLeft} ${
      hoursLeft === 1 ? "час" : hoursLeft < 5 ? "часа" : "часов"
    }. Успейте сдать работу!`,
    notifyType: "examDeadline",
    priority: "urgent",
    exam: examData.examId,
    additionalData: {
      examTitle: examData.examTitle,
      examEndDate: examData.examEnd,
      hoursUntilDeadline: hoursLeft,
    },
    actionUrl: `/exams/${examData.examId}`,
  });
};

/**
 * Отправка уведомления об успешной отправке экзамена
 */
const sendExamSubmittedNotification = async (userId, examData) => {
  return sendToUser(userId, {
    title: "✅ Экзамен отправлен",
    text: `Ваша работа по экзамену "${examData.examTitle}" успешно отправлена на проверку`,
    notifyType: "examSubmitted",
    priority: "normal",
    exam: examData.examId,
    examResult: examData.resultId,
    additionalData: {
      examTitle: examData.examTitle,
      examProjectLink: examData.projectLink,
    },
    actionUrl: `/exams/${examData.examId}/results/${examData.resultId}`,
  });
};

/**
 * Отправка уведомления об оценке экзамена (успешно)
 */
const sendExamAppreciatedNotification = async (userId, resultData) => {
  const isPerfect =
    resultData.score === resultData.maxScore && resultData.maxScore > 0;
  const successRate = resultData.maxScore
    ? ((resultData.score / resultData.maxScore) * 100).toFixed(1)
    : 0;

  let title = "✅ Экзамен оценён";
  let notifyType = "examAppreciated";
  let priority = "high";

  if (isPerfect) {
    title = "🎉 Идеальный результат!";
    notifyType = "examPerfect";
  } else if (successRate >= 90) {
    title = "🌟 Отличный результат!";
    notifyType = "examPassed";
  } else if (successRate >= 60) {
    title = "👍 Экзамен сдан";
    notifyType = "examPassed";
  }

  return sendToUser(userId, {
    title,
    text: `Ваш экзамен "${resultData.examTitle}" оценён: ${resultData.score}/${resultData.maxScore} баллов (${successRate}%)${
      resultData.feedback ? `. Комментарий: ${resultData.feedback}` : ""
    }`,
    notifyType,
    priority,
    exam: resultData.examId,
    examResult: resultData.resultId,
    additionalData: {
      examTitle: resultData.examTitle,
      examScore: resultData.score,
      examMaxScore: resultData.maxScore,
      examSuccessRate: successRate,
      examFeedback: resultData.feedback,
      examCompletedRequirements: resultData.completedRequirements,
      examTotalRequirements: resultData.totalRequirements,
    },
    actionUrl: `/exams/${resultData.examId}/results/${resultData.resultId}`,
  });
};

/**
 * Отправка уведомления об отклонении экзамена
 */
const sendExamRejectedNotification = async (userId, resultData) => {
  return sendToUser(userId, {
    title: "❌ Экзамен отклонён",
    text: `Ваша работа по экзамену "${resultData.examTitle}" отклонена.${
      resultData.feedback ? ` Причина: ${resultData.feedback}` : ""
    } Требуется повторная отправка.`,
    notifyType: "examRejected",
    priority: "urgent",
    exam: resultData.examId,
    examResult: resultData.resultId,
    additionalData: {
      examTitle: resultData.examTitle,
      examFeedback: resultData.feedback,
      examResubmitReason: resultData.feedback,
      examScore: resultData.score,
      examMaxScore: resultData.maxScore,
    },
    actionUrl: `/exams/${resultData.examId}`,
  });
};

/**
 * Отправка уведомления о том, что экзамен на проверке
 */
const sendExamPendingNotification = async (userId, examData) => {
  return sendToUser(userId, {
    title: "⏳ Экзамен на проверке",
    text: `Ваша работа по экзамену "${examData.examTitle}" находится на проверке. Ожидайте результатов.`,
    notifyType: "examPending",
    priority: "low",
    exam: examData.examId,
    examResult: examData.resultId,
    additionalData: {
      examTitle: examData.examTitle,
      examStatus: "pending",
    },
    actionUrl: `/exams/${examData.examId}/results/${examData.resultId}`,
  });
};

/**
 * Отправка уведомления о том, что экзамен скоро начнётся
 */
const sendExamStartingSoonNotification = async (userId, examData) => {
  const hoursUntilStart = Math.ceil(
    (new Date(examData.examStart) - new Date()) / (1000 * 60 * 60)
  );

  return sendToUser(userId, {
    title: "🔔 Экзамен скоро начнётся",
    text: `Экзамен "${examData.examTitle}" начнётся через ${hoursUntilStart} ${
      hoursUntilStart === 1 ? "час" : hoursUntilStart < 5 ? "часа" : "часов"
    }. Подготовьтесь!`,
    notifyType: "examStartingSoon",
    priority: "high",
    exam: examData.examId,
    additionalData: {
      examTitle: examData.examTitle,
      examStartDate: examData.examStart,
      hoursUntilDeadline: hoursUntilStart,
    },
    actionUrl: `/exams/${examData.examId}`,
  });
};

/**
 * Отправка уведомления об окончании экзамена
 */
const sendExamEndedNotification = async (userId, examData) => {
  return sendToUser(userId, {
    title: "⏰ Экзамен завершён",
    text: `Приём работ по экзамену "${examData.examTitle}" завершён. ${
      examData.hasSubmitted
        ? "Ваша работа отправлена на проверку."
        : "Вы не успели отправить работу."
    }`,
    notifyType: "examEnded",
    priority: examData.hasSubmitted ? "normal" : "high",
    exam: examData.examId,
    additionalData: {
      examTitle: examData.examTitle,
      examEndDate: examData.examEnd,
    },
    actionUrl: `/exams/${examData.examId}`,
  });
};

/**
 * Отправка уведомления об обновлении оценки экзамена
 */
const sendExamScoreUpdatedNotification = async (userId, resultData) => {
  const successRate = resultData.maxScore
    ? ((resultData.score / resultData.maxScore) * 100).toFixed(1)
    : 0;

  return sendToUser(userId, {
    title: "🔄 Оценка обновлена",
    text: `Оценка за экзамен "${resultData.examTitle}" обновлена: ${resultData.score}/${resultData.maxScore} баллов (${successRate}%)`,
    notifyType: "examScoreUpdated",
    priority: "normal",
    exam: resultData.examId,
    examResult: resultData.resultId,
    additionalData: {
      examTitle: resultData.examTitle,
      examScore: resultData.score,
      examMaxScore: resultData.maxScore,
      examSuccessRate: successRate,
    },
    actionUrl: `/exams/${resultData.examId}/results/${resultData.resultId}`,
  });
};

/**
 * Отправка уведомления с обратной связью по экзамену
 */
const sendExamFeedbackNotification = async (userId, feedbackData) => {
  return sendToUser(userId, {
    title: "💬 Обратная связь по экзамену",
    text: `Ментор оставил комментарий к вашему экзамену "${feedbackData.examTitle}": ${feedbackData.feedback}`,
    notifyType: "examFeedback",
    priority: "normal",
    exam: feedbackData.examId,
    examResult: feedbackData.resultId,
    mentor: feedbackData.mentorId,
    additionalData: {
      examTitle: feedbackData.examTitle,
      examFeedback: feedbackData.feedback,
      mentorName: feedbackData.mentorName,
    },
    actionUrl: `/exams/${feedbackData.examId}/results/${feedbackData.resultId}`,
  });
};

module.exports = {
  // Основные функции отправки
  sendToUser,
  sendToMentor,
  sendToAllMentors,
  sendToStudentMentor,

  // Специфичные уведомления для студентов
  sendTestAssignedNotification,
  sendTestCompletedNotification,
  sendGradeUpNotification,
  sendAchievementNotification,
  sendStudyStreakNotification,
  sendTestReminderNotification,
  sendMentorAssignedNotification,
  sendMentorFeedbackNotification,
  sendRetakeAvailableNotification,
  sendCourseProgressNotification,
  sendWelcomeNotification,

  // Получение уведомлений
  getUserNotifications,
  getMentorNotifications,
  getUnreadCount,
  getMentorUnreadCount,

  // Управление уведомлениями
  markAsViewed,
  markAllAsViewed,
  markMentorNotifyAsViewed,
  markAllMentorNotifyAsViewed,
  deleteViewedNotifications,
  deleteMentorViewedNotifications,

  sendExamAssignedNotification,
  sendExamReminderNotification,
  sendExamDeadlineNotification,
  sendExamSubmittedNotification,
  sendExamAppreciatedNotification,
  sendExamRejectedNotification,
  sendExamPendingNotification,
  sendExamStartingSoonNotification,
  sendExamEndedNotification,
  sendExamScoreUpdatedNotification,
  sendExamFeedbackNotification,
};
