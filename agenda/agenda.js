// exam-notifications.js - Модуль автоматических уведомлений о экзаменах
require("dotenv").config();
const Agenda = require("agenda");
const mongoose = require("mongoose");
const Exam = require("../exams/exam.model");
const Group = require("../groups/group.model");
const {
  bot,
  sendExamCompletionNoticeToParents,
} = require("../telegrambot/bot");
const { sendToMentor } = require("../socket/notify");

// Конфигурация
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/orbitest";
const CHECK_INTERVAL = "3 minutes";
const REMINDER_THRESHOLD_HOURS = 3;

// Инициализация Agenda
const agenda = new Agenda({
  db: { address: MONGODB_URI, collection: "agendaJobs" },
  processEvery: "1 minute",
  maxConcurrency: 20,
});

// Логирование
const log = {
  info: (msg) =>
    console.log(`[AGENDA INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) =>
    console.error(`[AGENDA ERROR] ${new Date().toISOString()} - ${msg}`, err),
  success: (msg) =>
    console.log(`[AGENDA SUCCESS] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) =>
    console.warn(`[AGENDA WARN] ${new Date().toISOString()} - ${msg}`),
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Форматирует оставшееся время в человекочитаемый формат
 */
function formatTimeRemaining(milliseconds) {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}

/**
 * Проверяет, нужно ли отправить напоминание
 * Отправляем каждые 3 часа до конца экзамена
 */
function shouldSendReminder(timeRemaining, lastReminderTime) {
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);

  // Если экзамен уже закончился
  if (hoursRemaining <= 0) {
    return { send: false, isCompleted: true };
  }

  // Если осталось больше 3 часов - не отправляем
  if (hoursRemaining > REMINDER_THRESHOLD_HOURS) {
    return { send: false, isCompleted: false };
  }

  // Если напоминание еще не отправлялось
  if (!lastReminderTime) {
    return { send: true, isCompleted: false };
  }

  // Проверяем, прошло ли 3 часа с последнего напоминания
  const timeSinceLastReminder = Date.now() - lastReminderTime;
  const hoursSinceLastReminder = timeSinceLastReminder / (1000 * 60 * 60);

  if (hoursSinceLastReminder >= 3) {
    return { send: true, isCompleted: false };
  }

  return { send: false, isCompleted: false };
}

/**
 * Отправляет напоминание о экзамене в Telegram группу
 */
async function sendReminderToGroup(exam, group, timeRemaining) {
  try {
    if (!group.telegramId) {
      log.warn(`Группа ${group.groupName} не привязана к Telegram`);
      return { success: false, message: "Группа не привязана к Telegram" };
    }

    const formattedTime = formatTimeRemaining(timeRemaining);
    const examName = exam.examTitle || "Экзамен";

    const message =
      `⏰ *Напоминание об экзамене!*\n\n` +
      `📝 Название: ${examName}\n` +
      `⏳ Осталось времени: ${formattedTime}\n` +
      `\n⚡️ Успейте завершить экзамен вовремя!`;

    await bot.sendMessage(group.telegramId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

    await sendToMentor(group.mentor, {
      title: `Напоминание: экзамен "${examName}"`,
      text: `До завершения экзамена "${examName}" осталось ${formattedTime}. Группа: ${group.groupName}`,
      notifyType: "reminder",
      additionalData: {
        examId: exam._id,
        groupId: group._id,
        timeRemaining: formattedTime,
      },
    });

    log.success(
      `Напоминание отправлено в группу ${group.groupName} для экзамена ${examName}`
    );
    return { success: true };
  } catch (error) {
    log.error(
      `Ошибка отправки напоминания в группу ${group.groupName}:`,
      error
    );
    return { success: false, message: error.message };
  }
}

/**
 * Отправляет уведомление о завершении экзамена
 */
async function sendCompletionNotification(exam, group) {
  try {
    if (!group.telegramId) {
      return { success: false, message: "Группа не привязана к Telegram" };
    }

    const examName = exam.examTitle || "Экзамен";
    const endTime = exam.examEnd
      ? new Date(exam.examEnd).toLocaleString("ru-RU")
      : "Не указано";

    const message =
      `✅ *Экзамен завершен!*\n\n` +
      `📝 Название: ${examName}\n` +
      `🕐 Время завершения: ${endTime}\n\n` +
      `📊 Результаты будут доступны в ближайшее время.\n` +
      `Спасибо за участие!`;

    await bot.sendMessage(group.telegramId, message, {
      parse_mode: "Markdown",
    });

    await sendExamCompletionNoticeToParents(exam._id);
    await sendToMentor(group.mentor, {
      title: `Эказмен "${examName}" завершен`,
      text: `Экзамен "${examName}" завершен , оцените работы и отправьте результат родителям`,
      notifyType: "reminder",
    });
    log.success(`отправлено ссокет`);

    log.success(`Уведомление о завершении отправлено для экзамена ${examName}`);
    return { success: true };
  } catch (error) {
    log.error("Ошибка отправки уведомления о завершении:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Обновляет статус экзамена на завершенный
 */
async function markExamAsCompleted(examId) {
  try {
    const exam = await Exam.findByIdAndUpdate(
      examId,
      {
        status: "completed",
        isEnd: true,
      },
      { new: true }
    );

    if (exam) {
      log.success(`Экзамен ${exam.examTitle} отмечен как завершенный`);
      return { success: true, exam };
    }

    return { success: false, message: "Экзамен не найден" };
  } catch (error) {
    log.error("Ошибка обновления статуса экзамена:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// ОПРЕДЕЛЕНИЕ ЗАДАЧ AGENDA
// ============================================

/**
 * Основная задача: проверка и отправка напоминаний о экзаменах
 */
agenda.define("check-active-exams", async (job) => {
  log.info("Запуск проверки активных экзаменов...");

  try {
    const now = new Date();

    // Находим все активные экзамены (status не "completed" и isEnd не true)
    const activeExams = await Exam.find({
      status: { $ne: "completed" },
      isEnd: { $ne: true },
      examEnd: { $exists: true, $ne: null },
    }).populate("group");

    log.info(`Найдено активных экзаменов: ${activeExams.length}`);

    for (const exam of activeExams) {
      try {
        const examEndTime = new Date(exam.examEnd);
        const timeRemaining = examEndTime - now;

        // Проверяем, закончился ли экзамен
        if (timeRemaining <= 0) {
          log.info(`Экзамен "${exam.examTitle}" завершился`);

          // Получаем группу
          const group = exam.group || (await Group.findById(exam.group));

          if (group) {
            // Отправляем уведомление о завершении
            await sendCompletionNotification(exam, group);
          }

          // Обновляем статус экзамена
          await markExamAsCompleted(exam._id);
          continue;
        }

        // Проверяем, нужно ли отправить напоминание
        const reminderCheck = shouldSendReminder(
          timeRemaining,
          exam.lastReminderSent
        );

        if (reminderCheck.send) {
          log.info(`Отправка напоминания для экзамена "${exam.examTitle}"`);

          // Получаем группу
          const group = exam.group || (await Group.findById(exam.group));

          if (group) {
            // Отправляем напоминание
            const result = await sendReminderToGroup(
              exam,
              group,
              timeRemaining
            );

            if (result.success) {
              // Обновляем время последнего напоминания
              await Exam.findByIdAndUpdate(exam._id, {
                lastReminderSent: Date.now(),
              });
            }
          } else {
            log.warn(`Группа не найдена для экзамена ${exam._id}`);
          }
        }
      } catch (examError) {
        log.error(`Ошибка обработки экзамена ${exam._id}:`, examError);
        // Продолжаем обработку других экзаменов
      }
    }

    log.success("Проверка экзаменов завершена");
  } catch (error) {
    log.error("Критическая ошибка при проверке экзаменов:", error);
  }
});

/**
 * Задача очистки старых завершенных задач
 */
agenda.define("cleanup-old-jobs", async (job) => {
  log.info("Запуск очистки старых задач...");

  try {
    const result = await agenda.cancel({
      lastFinishedAt: {
        $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Старше 7 дней
      },
    });

    log.success(`Очищено старых задач: ${result}`);
  } catch (error) {
    log.error("Ошибка очистки старых задач:", error);
  }
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ И ЗАПУСК
// ============================================

/**
 * Инициализация и запуск Agenda
 */
async function startAgenda() {
  try {
    // Запускаем Agenda
    await agenda.start();
    log.success("Agenda успешно запущена!");

    // Отменяем все существующие задачи при перезапуске
    await agenda.cancel({ name: "check-active-exams" });
    await agenda.cancel({ name: "cleanup-old-jobs" });

    // Запускаем периодическую проверку экзаменов
    await agenda.every(CHECK_INTERVAL, "check-active-exams");
    log.info(
      `Задача проверки экзаменов запланирована каждые ${CHECK_INTERVAL}`
    );

    // Запускаем очистку старых задач раз в день
    await agenda.every("1 day", "cleanup-old-jobs");
    log.info("Задача очистки старых задач запланирована каждый день");

    // Запускаем первую проверку сразу
    await agenda.now("check-active-exams");
    log.info("Первая проверка экзаменов запущена немедленно");
  } catch (error) {
    log.error("Ошибка запуска Agenda:", error);
    throw error;
  }
}

/**
 * Корректное завершение работы (только для локальной разработки)
 */
async function gracefulShutdown() {
  log.info("Получен сигнал завершения, останавливаем Agenda...");

  try {
    await agenda.stop();
    log.success("Agenda успешно остановлена");
    // НЕ ВЫЗЫВАЕМ process.exit() - пусть основной процесс управляет
  } catch (error) {
    log.error("Ошибка при остановке Agenda:", error);
  }
}

// ============================================
// ОБРАБОТЧИКИ СИГНАЛОВ - ОТКЛЮЧЕНО ДЛЯ PRODUCTION
// ============================================

// ВАЖНО: На Render эти обработчики вызывают проблемы
// Закомментировано для production, раскомментируйте для локальной разработки

// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);

// Обработка необработанных ошибок (оставляем только логи, без остановки)
process.on("unhandledRejection", (reason, promise) => {
  log.error("Необработанное отклонение промиса:", reason);
  // НЕ вызываем process.exit() или gracefulShutdown()
});

process.on("uncaughtException", (error) => {
  log.error("Необработанное исключение:", error);
  // НЕ вызываем gracefulShutdown()
});

// ============================================
// ПУБЛИЧНЫЙ API ДЛЯ РУЧНОГО УПРАВЛЕНИЯ
// ============================================

/**
 * Ручной запуск проверки экзаменов
 */
async function checkExamsNow() {
  try {
    log.info("Ручной запуск проверки экзаменов...");
    await agenda.now("check-active-exams");
    return { success: true, message: "Проверка запущена" };
  } catch (error) {
    log.error("Ошибка ручного запуска проверки:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Отправка немедленного напоминания о конкретном экзамене
 */
async function sendImmediateReminder(examId) {
  try {
    const exam = await Exam.findById(examId).populate("group");

    if (!exam) {
      return { success: false, message: "Экзамен не найден" };
    }

    if (!exam.group) {
      return { success: false, message: "Группа не найдена" };
    }

    const now = new Date();
    const examEndTime = new Date(exam.examEnd);
    const timeRemaining = examEndTime - now;

    if (timeRemaining <= 0) {
      return { success: false, message: "Экзамен уже завершен" };
    }

    const result = await sendReminderToGroup(exam, exam.group, timeRemaining);

    if (result.success) {
      // Обновляем время последнего напоминания
      await Exam.findByIdAndUpdate(examId, {
        lastReminderSent: Date.now(),
      });
    }

    return result;
  } catch (error) {
    log.error("Ошибка отправки немедленного напоминания:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Получение статистики по задачам
 */
async function getAgendaStats() {
  try {
    const jobs = await agenda.jobs({});
    const runningJobs = jobs.filter((job) => job.attrs.lockedAt);
    const scheduledJobs = jobs.filter((job) => !job.attrs.lockedAt);

    return {
      total: jobs.length,
      running: runningJobs.length,
      scheduled: scheduledJobs.length,
      jobs: jobs.map((job) => ({
        name: job.attrs.name,
        nextRunAt: job.attrs.nextRunAt,
        lastRunAt: job.attrs.lastRunAt,
        lastFinishedAt: job.attrs.lastFinishedAt,
      })),
    };
  } catch (error) {
    log.error("Ошибка получения статистики:", error);
    return null;
  }
}

module.exports = {
  agenda,
  startAgenda,
  checkExamsNow,
  sendImmediateReminder,
  getAgendaStats,
  gracefulShutdown,
};
