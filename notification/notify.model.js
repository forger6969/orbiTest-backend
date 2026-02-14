// notification/notify.model.js
const { default: mongoose } = require("mongoose");

const notifySchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
  },
  result: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Result",
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
  },
  examResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "examResult",
  },
  notifyType: {
    type: String,
    enum: [
      // Общие
      "info", // Обычное информационное уведомление
      "warning", // Предупреждение
      "success", // Успешное действие
      "error", // Ошибка

      // Оценки и достижения
      "gradeUp", // Повышение оценки
      "gradeDown", // Понижение оценки
      "achievement", // Достижение разблокировано
      "milestone", // Важная веха
      "topStudent", // Вы лучший студент
      "personalRecord", // Личный рекорд

      // Тесты
      "testAssigned", // Назначен новый тест
      "testReminder", // Напоминание о тесте
      "testCompleted", // Тест завершён
      "testPassed", // Тест пройден успешно
      "testFailed", // Тест провален
      "testPerfect", // Идеальный результат теста
      "retakeAvailable", // Доступна пересдача
      "testDeadline", // Приближается дедлайн теста

      // Экзамены
      "examAssigned", // Назначен новый экзамен
      "examReminder", // Напоминание об экзамене
      "examDeadline", // Приближается дедлайн экзамена
      "examSubmitted", // Экзамен отправлен на проверку
      "examAppreciated", // Экзамен оценён (успешно)
      "examRejected", // Экзамен отклонён
      "examPending", // Экзамен на проверке
      "examResubmitRequired", // Требуется повторная отправка
      "examPerfect", // Идеальный результат экзамена
      "examPassed", // Экзамен сдан
      "examFailed", // Экзамен не сдан
      "examStartingSoon", // Экзамен скоро начнётся
      "examEnded", // Экзамен завершён
      "examStatusChanged", // Статус экзамена изменён
      "examScoreUpdated", // Оценка за экзамен обновлена
      "examFeedback", // Обратная связь по экзамену

      // Ментор
      "mentorAssigned", // Назначен новый ментор
      "mentorMessage", // Сообщение от ментора
      "mentorFeedback", // Обратная связь от ментора
      "mentorPraise", // Похвала от ментора

      // Обучение
      "newLesson", // Новый урок доступен
      "lessonCompleted", // Урок завершён
      "courseProgress", // Прогресс по курсу
      "studyStreak", // Серия дней обучения
      "studyReminder", // Напоминание о занятиях

      // Система
      "systemUpdate", // Обновление системы
      "maintenance", // Техническое обслуживание
      "deadline", // Приближение дедлайна
      "welcome", // Приветственное уведомление
    ],
    default: "info",
  },
  status: {
    type: String,
    enum: ["viewed", "pending"],
    default: "pending",
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal",
  },
  additionalData: {
    // Общие данные
    score: Number,
    successRate: Number,
    mentorName: String,
    previousGrade: String,
    newGrade: String,
    totalTests: Number,
    averageScore: Number,
    deadlineDate: Date,
    streakDays: Number,
    achievementName: String,
    courseName: String,
    lessonTitle: String,
    progressPercentage: Number,
    rank: Number,
    totalStudents: Number,

    // Данные для тестов
    testTitle: String,

    // Данные для экзаменов
    examTitle: String,
    examId: String,
    examStartDate: Date,
    examEndDate: Date,
    examMaxScore: Number,
    examScore: Number,
    examSuccessRate: Number,
    examStatus: String, // "appreciated", "rejected", "pending"
    examRequirements: Array,
    examCompletedRequirements: Number,
    examTotalRequirements: Number,
    examProjectLink: String,
    examFeedback: String,
    examResubmitReason: String,
    daysUntilDeadline: Number,
    hoursUntilDeadline: Number,
  },
  actionUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // 7 дней
  },
});

// Индексы для быстрого поиска
notifySchema.index({ user: 1, status: 1, createdAt: -1 });
notifySchema.index({ user: 1, notifyType: 1 });
notifySchema.index({ exam: 1 });
notifySchema.index({ examResult: 1 });

const Notify = mongoose.model("Notify", notifySchema);

module.exports = Notify;
