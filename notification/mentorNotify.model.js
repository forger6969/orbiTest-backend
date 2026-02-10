// mentorNotify.model.js
const { default: mongoose } = require("mongoose");

const mentorNotifySchema = mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
  result: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
  notifyType: {
    type: String,
    enum: [
      // Общие
      "info", // Обычное информационное уведомление
      "warning", // Предупреждение
      "success", // Успешное действие
      "error", // Ошибка

      // Студенты
      "newStudent", // Новый студент в группе
      "studentLeft", // Студент покинул группу
      "studentInactive", // Студент неактивен
      "studentBirthday", // День рождения студента

      // Тесты
      "testCompleted", // Тест завершён
      "testStarted", // Студент начал тест
      "testFailed", // Тест провален
      "testPerfect", // Идеальный результат теста
      "retakeRequest", // Запрос на пересдачу

      // Оценки и достижения
      "gradeUp", // Повышение оценки
      "gradeDown", // Понижение оценки
      "achievement", // Достижение разблокировано
      "milestone", // Важная веха
      "topStudent", // Лучший студент

      // Посещаемость
      "attendance", // Отметка о посещении
      "absence", // Пропуск занятия
      "lateArrival", // Опоздание

      // Система
      "systemUpdate", // Обновление системы
      "reminder", // Напоминание
      "deadline", // Приближение дедлайна
    ],
    default: "info",
  },
  status: {
    type: String,
    enum: ["viewed", "pending"],
    default: "pending",
  },
  additionalData: {
    score: Number,
    successRate: Number,
    testTitle: String,
    studentName: String,
    studentGrade: String,
    totalTests: Number,
    averageScore: Number,
    daysInactive: Number,
    deadlineDate: Date,
    groupName: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // 7 дней
  },
});

const MentorNotify = mongoose.model("MentorNotify", mentorNotifySchema);
module.exports = MentorNotify;
