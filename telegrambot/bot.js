// bot.js - Telegram бот для OrbiTest (Webhook режим) - С РОДИТЕЛЬСКИМИ ГРУППАМИ
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const Group = require("../groups/group.model");
const Exam = require("../exams/exam.model");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 10000;

const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
  success: (msg) =>
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

// Express сервер
const app = express();
app.use(express.json());

// Бот БЕЗ polling - ВАЖНО: webHook: true
const bot = new TelegramBot(BOT_TOKEN, {
  polling: false,
  webHook: true,
});

const webhookPath = "/telegram-webhook";

// ============================================
// ФУНКЦИИ ЭКРАНИРОВАНИЯ
// ============================================

// Экранирование HTML специальных символов
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Безопасная отправка сообщений с автоматическим fallback
async function safeSendMessage(chatId, text, options = {}) {
  try {
    // Пробуем отправить с HTML
    return await bot.sendMessage(chatId, text, {
      ...options,
      parse_mode: "HTML",
    });
  } catch (error) {
    log.error("Ошибка отправки с HTML, пробуем без форматирования:", error);
    try {
      // Если не получилось - отправляем без форматирования
      const { parse_mode, ...optionsWithoutParse } = options;
      return await bot.sendMessage(
        chatId,
        text.replace(/<\/?[^>]+(>|$)/g, ""),
        optionsWithoutParse
      );
    } catch (finalError) {
      log.error("Критическая ошибка отправки сообщения:", finalError);
      throw finalError;
    }
  }
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

async function isUserAdmin(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return ["creator", "administrator"].includes(member.status);
  } catch (error) {
    log.error("Ошибка проверки админских прав:", error);
    return false;
  }
}

async function isBotAdmin(chatId) {
  try {
    const botInfo = await bot.getMe();
    const member = await bot.getChatMember(chatId, botInfo.id);
    return ["creator", "administrator"].includes(member.status);
  } catch (error) {
    log.error("Ошибка проверки прав бота:", error);
    return false;
  }
}

async function getAllGroups() {
  try {
    const groups = await Group.find({}).select("_id groupName groupDescribe");
    return groups;
  } catch (error) {
    log.error("Ошибка получения групп из БД:", error);
    return [];
  }
}

async function isGroupAlreadyLinked(chatId) {
  try {
    const group = await Group.findOne({ telegramId: chatId.toString() });
    return group;
  } catch (error) {
    log.error("Ошибка проверки привязки группы:", error);
    return null;
  }
}

async function isParentGroupAlreadyLinked(chatId) {
  try {
    const group = await Group.findOne({ parentsTelegramId: chatId.toString() });
    return group;
  } catch (error) {
    log.error("Ошибка проверки привязки родительской группы:", error);
    return null;
  }
}

async function linkGroupToTelegram(groupId, chatId) {
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return { success: false, message: "Группа не найдена в базе данных" };
    }

    if (group.telegramId && group.telegramId !== chatId.toString()) {
      return {
        success: false,
        message: `Группа "${escapeHtml(group.groupName)}" уже привязана к другому Telegram чату`,
      };
    }

    group.telegramId = chatId.toString();
    await group.save();

    log.success(
      `Группа ${group.groupName} успешно привязана к Telegram чату ${chatId}`
    );

    return {
      success: true,
      message: `Группа "${escapeHtml(group.groupName)}" успешно подключена и теперь будет получать уведомления!`,
      groupName: group.groupName,
    };
  } catch (error) {
    log.error("Ошибка привязки группы:", error);
    return { success: false, message: "Произошла ошибка при привязке группы" };
  }
}

async function linkParentGroupToTelegram(groupId, chatId) {
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return { success: false, message: "Группа не найдена в базе данных" };
    }

    if (
      group.parentsTelegramId &&
      group.parentsTelegramId !== chatId.toString()
    ) {
      return {
        success: false,
        message: `Родительская группа для "${escapeHtml(group.groupName)}" уже привязана к другому Telegram чату`,
      };
    }

    group.parentsTelegramId = chatId.toString();
    await group.save();

    log.success(
      `Родительская группа для ${group.groupName} успешно привязана к Telegram чату ${chatId}`
    );

    return {
      success: true,
      message: `👨‍👩‍👧‍👦 Родительская группа для "${escapeHtml(group.groupName)}" успешно подключена!\n\nРодители будут получать результаты экзаменов своих детей.`,
      groupName: group.groupName,
    };
  } catch (error) {
    log.error("Ошибка привязки родительской группы:", error);
    return {
      success: false,
      message: "Произошла ошибка при привязке родительской группы",
    };
  }
}

async function createAndLinkNewGroup(chatId, chatTitle) {
  try {
    const existingGroup = await Group.findOne({ groupName: chatTitle });

    if (existingGroup) {
      if (
        existingGroup.telegramId &&
        existingGroup.telegramId !== chatId.toString()
      ) {
        return {
          success: false,
          message: `Группа "${escapeHtml(chatTitle)}" уже существует и привязана к другому Telegram чату`,
        };
      }

      existingGroup.telegramId = chatId.toString();
      await existingGroup.save();

      return {
        success: true,
        message: `Группа "${escapeHtml(chatTitle)}" уже существовала в системе и успешно подключена!`,
        groupName: existingGroup.groupName,
      };
    }

    const newGroup = new Group({
      groupName: chatTitle,
      groupDescribe: `Автоматически создано из Telegram группы`,
      telegramId: chatId.toString(),
      students: [],
      groupPerformance: 0,
    });

    await newGroup.save();

    log.success(
      `Создана новая группа: ${chatTitle} и привязана к Telegram чату ${chatId}`
    );

    return {
      success: true,
      message: `Новая группа "${escapeHtml(chatTitle)}" создана и успешно подключена к OrbiTest!\n\nТеперь вы будете получать уведомления о новых экзаменах.`,
      groupName: newGroup.groupName,
      isNew: true,
    };
  } catch (error) {
    log.error("Ошибка создания новой группы:", error);
    return {
      success: false,
      message: "Произошла ошибка при создании группы. Попробуйте позже.",
    };
  }
}

async function getStudentsThisGroup(chatid) {
  try {
    const group = await Group.findOne({ telegramId: chatid }).populate(
      "students"
    );
    return group?.students || [];
  } catch (error) {
    log.error("Ошибка получения студентов:", error);
    return [];
  }
}

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat.type;

  log.info(
    `Команда /start от пользователя ${userId} в чате ${chatId} (тип: ${chatType})`
  );

  try {
    // Для личного чата - приветствие без настройки
    if (chatType === "private") {
      return await safeSendMessage(
        chatId,
        "👋 Привет! Я OrbiTest бот.\n\n" +
          "🎓 Я помогаю группам получать уведомления о новых экзаменах.\n" +
          "👨‍👩‍👧‍👦 Родители могут получать результаты экзаменов своих детей.\n\n" +
          "📌 Чтобы начать работу:\n" +
          "1. Добавьте меня в групповой чат\n" +
          "2. Назначьте меня администратором\n" +
          "3. Напишите /start в группе\n\n" +
          "❓ Нужна помощь? Напишите /help"
      );
    }

    // Для групп - полная настройка
    if (!["group", "supergroup"].includes(chatType)) {
      return await safeSendMessage(chatId, "❌ Неподдерживаемый тип чата.");
    }

    const userIsAdmin = await isUserAdmin(chatId, userId);
    if (!userIsAdmin) {
      return await safeSendMessage(
        chatId,
        "⛔️ Только администраторы группы могут выполнять эту команду."
      );
    }

    const botIsAdmin = await isBotAdmin(chatId);
    if (!botIsAdmin) {
      return await safeSendMessage(
        chatId,
        "⚠️ Бот должен быть администратором группы для корректной работы.\n\nПожалуйста, назначьте бота администратором."
      );
    }

    // Проверяем оба типа привязки
    const linkedGroup = await isGroupAlreadyLinked(chatId);
    const linkedParentGroup = await isParentGroupAlreadyLinked(chatId);

    if (linkedGroup) {
      return await safeSendMessage(
        chatId,
        `✅ Эта Telegram группа уже подключена к OrbiTest группе: "${escapeHtml(linkedGroup.groupName)}"\n\n🎓 Вы будете получать уведомления о новых экзаменах.`
      );
    }

    if (linkedParentGroup) {
      return await safeSendMessage(
        chatId,
        `✅ Эта Telegram группа уже подключена как родительская для группы: "${escapeHtml(linkedParentGroup.groupName)}"\n\n👨‍👩‍👧‍👦 Вы будете получать результаты экзаменов студентов.`
      );
    }

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎓 Прикрепить как группу студентов",
            callback_data: "attach_group",
          },
        ],
        [
          {
            text: "👨‍👩‍👧‍👦 Прикрепить как группу родителей",
            callback_data: "attach_parent_group",
          },
        ],
      ],
    };

    await safeSendMessage(
      chatId,
      "👋 Добро пожаловать в OrbiTest!\n\n" +
        "Выберите тип группы:\n" +
        "🎓 <b>Группа студентов</b> - получает уведомления о новых экзаменах\n" +
        "👨‍👩‍👧‍👦 <b>Группа родителей</b> - получает результаты экзаменов детей",
      { reply_markup: keyboard }
    );
  } catch (error) {
    log.error("Ошибка в команде /start:", error);
    await safeSendMessage(chatId, "❌ Произошла ошибка. Попробуйте позже.");
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /help в чате ${chatId} (тип: ${chatType})`);

  try {
    const helpText =
      "📚 <b>OrbiTest Bot - Помощь</b>\n\n" +
      "<b>Доступные команды:</b>\n" +
      "/start - Начать настройку и привязать группу\n" +
      "/help - Показать это сообщение\n" +
      "/status - Проверить статус подключения\n" +
      "/students - Список студентов группы\n" +
      "/exams - Активные экзамены группы\n\n" +
      "<b>Типы групп:</b>\n" +
      "🎓 <b>Группа студентов</b> - получает:\n" +
      "  • Уведомления о новых экзаменах\n" +
      "  • Напоминания о дедлайнах\n" +
      "  • Информацию об экзаменах\n\n" +
      "👨‍👩‍👧‍👦 <b>Группа родителей</b> - получает:\n" +
      "  • Результаты экзаменов детей\n" +
      "  • Статистику успеваемости\n" +
      "  • Отчеты о выполнении заданий\n\n" +
      "<b>Возможности бота:</b>\n" +
      "✅ Привязка Telegram группы к OrbiTest\n" +
      "✅ Создание новой группы автоматически\n" +
      "✅ Уведомления о новых экзаменах\n" +
      "✅ Отправка результатов родителям\n" +
      "✅ Автоматические напоминания\n\n" +
      "<b>Требования:</b>\n" +
      "⚡️ Бот должен быть администратором группы\n" +
      "⚡️ Только админы могут управлять настройками";

    await safeSendMessage(chatId, helpText);
  } catch (error) {
    log.error("Ошибка в команде /help:", error);
  }
});

bot.onText(/\/students/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /students в чате ${chatId} (тип: ${chatType})`);

  try {
    // Только для групп
    if (chatType === "private") {
      return await safeSendMessage(
        chatId,
        "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
      );
    }

    const students = await getStudentsThisGroup(chatId);

    if (!students || students.length === 0) {
      return await safeSendMessage(
        chatId,
        "📋 В этой группе пока нет студентов."
      );
    }

    const message =
      "👥 <b>Студенты группы:</b>\n\n" +
      students
        .map(
          (student, index) =>
            `${index + 1}. ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)} (${escapeHtml(student.email)})`
        )
        .join("\n");

    await safeSendMessage(chatId, message);
  } catch (error) {
    log.error("Ошибка получения студентов:", error);
    await safeSendMessage(chatId, "❌ Ошибка при получении списка студентов.");
  }
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /status в чате ${chatId} (тип: ${chatType})`);

  try {
    // Только для групп
    if (chatType === "private") {
      return await safeSendMessage(
        chatId,
        "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
      );
    }

    const linkedGroup = await isGroupAlreadyLinked(chatId);
    const linkedParentGroup = await isParentGroupAlreadyLinked(chatId);

    if (linkedGroup) {
      await safeSendMessage(
        chatId,
        `✅ <b>Статус: Подключено (Группа студентов)</b>\n\n` +
          `📌 Группа: ${escapeHtml(linkedGroup.groupName)}\n` +
          `📝 Описание: ${escapeHtml(linkedGroup.groupDescribe || "Не указано")}\n` +
          `👥 Студентов: ${linkedGroup.students?.length || 0}\n` +
          `👨‍👩‍👧‍👦 Родительская группа: ${linkedGroup.parentsTelegramId ? "Подключена ✅" : "Не подключена ❌"}\n\n` +
          `🎓 Вы будете получать уведомления о новых экзаменах.`
      );
    } else if (linkedParentGroup) {
      await safeSendMessage(
        chatId,
        `✅ <b>Статус: Подключено (Группа родителей)</b>\n\n` +
          `📌 Группа студентов: ${escapeHtml(linkedParentGroup.groupName)}\n` +
          `📝 Описание: ${escapeHtml(linkedParentGroup.groupDescribe || "Не указано")}\n` +
          `👥 Студентов: ${linkedParentGroup.students?.length || 0}\n\n` +
          `👨‍👩‍👧‍👦 Вы будете получать результаты экзаменов студентов.`
      );
    } else {
      await safeSendMessage(
        chatId,
        "❌ <b>Статус: Не подключено</b>\n\n" +
          "Эта группа ещё не привязана к OrbiTest.\n" +
          "Используйте /start для настройки."
      );
    }
  } catch (error) {
    log.error("Ошибка в команде /status:", error);
    await safeSendMessage(chatId, "❌ Произошла ошибка при проверке статуса.");
  }
});

bot.onText(/\/exams/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /exams в чате ${chatId} (тип: ${chatType})`);

  try {
    // Только для групп
    if (chatType === "private") {
      return await safeSendMessage(
        chatId,
        "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
      );
    }

    const group = await Group.findOne({ telegramId: chatId.toString() });

    if (!group) {
      return await safeSendMessage(
        chatId,
        "❌ Эта группа еще не подключена к OrbiTest.\n\nИспользуйте /start для настройки."
      );
    }

    const exams = await Exam.find({ group: group._id, status: "underway" });

    if (!exams || exams.length === 0) {
      return await safeSendMessage(
        chatId,
        "📋 У вашей группы нет активных экзаменов или они все завершены."
      );
    }

    const message =
      "📚 <b>Активные экзамены:</b>\n\n" +
      exams
        .map((exam, i) => {
          const endDate = new Date(exam.examEnd);
          const startDate = new Date(exam.examStart);

          const endMonth = endDate.getMonth() + 1;
          const endDay = endDate.getDate();
          const endHour = endDate.getHours().toString().padStart(2, "0");
          const endMinute = endDate.getMinutes().toString().padStart(2, "0");

          const startMonth = startDate.getMonth() + 1;
          const startDay = startDate.getDate();
          const startHour = startDate.getHours().toString().padStart(2, "0");
          const startMinute = startDate
            .getMinutes()
            .toString()
            .padStart(2, "0");

          return (
            `${i + 1}. <b>${escapeHtml(exam.examTitle)}</b>\n` +
            `📝 Описание: ${escapeHtml(exam.examDescribe || "Не указано")}\n` +
            `🟢 Начало: ${startDay}.${startMonth.toString().padStart(2, "0")} в ${startHour}:${startMinute}\n` +
            `🔴 Дедлайн: ${endDay}.${endMonth.toString().padStart(2, "0")} в ${endHour}:${endMinute}\n`
          );
        })
        .join("\n");

    await safeSendMessage(chatId, message);
  } catch (error) {
    log.error("Ошибка при получении экзаменов:", error);
    await safeSendMessage(
      chatId,
      "❌ Произошла ошибка при получении списка экзаменов. Попробуйте позже."
    );
  }
});

// ============================================
// ОБРАБОТЧИКИ CALLBACK ЗАПРОСОВ
// ============================================

bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  log.info(`Callback: ${data} от пользователя ${userId} в чате ${chatId}`);

  try {
    const userIsAdmin = await isUserAdmin(chatId, userId);
    if (!userIsAdmin) {
      return await bot.answerCallbackQuery(callbackQuery.id, {
        text: "⛔️ Только администраторы могут выполнять это действие",
        show_alert: true,
      });
    }

    if (data === "attach_group") {
      const groups = await getAllGroups();

      const keyboard = {
        inline_keyboard: groups.map((group) => [
          {
            text: escapeHtml(group.groupName),
            callback_data: `select_${group._id}`,
          },
        ]),
      };

      keyboard.inline_keyboard.push([
        { text: "➕ Создать новую группу", callback_data: "create_new" },
      ]);

      keyboard.inline_keyboard.push([
        { text: "❌ Отмена", callback_data: "cancel" },
      ]);

      await bot.answerCallbackQuery(callbackQuery.id);

      let messageText =
        groups.length > 0
          ? "📋 Выберите группу из списка или создайте новую:"
          : "📋 В системе пока нет групп.\n\nВы можете создать новую группу автоматически:";

      await bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: keyboard,
      });
    } else if (data === "attach_parent_group") {
      const groups = await getAllGroups();

      const keyboard = {
        inline_keyboard: groups.map((group) => [
          {
            text: escapeHtml(group.groupName),
            callback_data: `select_parent_${group._id}`,
          },
        ]),
      };

      keyboard.inline_keyboard.push([
        { text: "❌ Отмена", callback_data: "cancel" },
      ]);

      await bot.answerCallbackQuery(callbackQuery.id);

      let messageText =
        groups.length > 0
          ? "👨‍👩‍👧‍👦 Выберите группу студентов, для которой эта группа будет родительской:"
          : "❌ В системе пока нет групп студентов.\n\nСначала создайте группу студентов.";

      await bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: keyboard,
      });
    } else if (data === "create_new") {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Создаем новую группу...",
      });

      const chat = await bot.getChat(chatId);
      const chatTitle = chat.title || "Новая группа";

      const result = await createAndLinkNewGroup(chatId, chatTitle);

      if (result.success) {
        const successMessage = result.isNew
          ? `✅ ${result.message}\n\n📝 Название: ${escapeHtml(chatTitle)}\n\nВы можете изменить описание и добавить студентов в веб-интерфейсе OrbiTest.`
          : `✅ ${result.message}`;

        await bot.editMessageText(successMessage, {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: "HTML",
        });
      } else {
        await bot.editMessageText(`❌ ${result.message}`, {
          chat_id: chatId,
          message_id: msg.message_id,
        });
      }
    } else if (data.startsWith("select_parent_")) {
      const groupId = data.replace("select_parent_", "");

      const result = await linkParentGroupToTelegram(groupId, chatId);

      await bot.answerCallbackQuery(callbackQuery.id);

      if (result.success) {
        await bot.editMessageText(`✅ ${result.message}`, {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: "HTML",
        });
      } else {
        await bot.editMessageText(`❌ ${result.message}`, {
          chat_id: chatId,
          message_id: msg.message_id,
        });
      }
    } else if (data.startsWith("select_")) {
      const groupId = data.replace("select_", "");

      const result = await linkGroupToTelegram(groupId, chatId);

      await bot.answerCallbackQuery(callbackQuery.id);

      if (result.success) {
        await bot.editMessageText(`✅ ${result.message}`, {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: "HTML",
        });
      } else {
        await bot.editMessageText(`❌ ${result.message}`, {
          chat_id: chatId,
          message_id: msg.message_id,
        });
      }
    } else if (data === "cancel") {
      await bot.answerCallbackQuery(callbackQuery.id);
      await bot.editMessageText("❌ Операция отменена.", {
        chat_id: chatId,
        message_id: msg.message_id,
      });
    }
  } catch (error) {
    log.error("Ошибка в callback_query:", error);
    try {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Произошла ошибка. Попробуйте позже.",
        show_alert: true,
      });
    } catch (err) {
      log.error("Не удалось ответить на callback:", err);
    }
  }
});

// ============================================
// ФУНКЦИИ ОТПРАВКИ УВЕДОМЛЕНИЙ
// ============================================

async function sendExamNotification(exam) {
  try {
    const group = await Group.findById(exam.group);

    if (!group) {
      log.error(`Группа не найдена для экзамена ${exam._id}`);
      return { success: false, message: "Группа не найдена" };
    }

    if (!group.telegramId) {
      log.info(`Группа ${group.groupName} не привязана к Telegram`);
      return { success: false, message: "Группа не привязана к Telegram" };
    }

    const examName = escapeHtml(exam.examTitle || "Новый экзамен");
    const examDescribe = escapeHtml(exam.examDescribe || "");
    const deadline = exam.examEnd
      ? new Date(exam.examEnd).toLocaleString("ru-RU", {
          timeZone: "Asia/Tashkent",
        })
      : "Не указан";
    const examLink = exam.examResource?.link || "";

    let message =
      `🎓 <b>Новый экзамен доступен!</b>\n\n` + `📝 Название: ${examName}\n`;

    if (examDescribe) {
      message += `📄 Описание: ${examDescribe}\n`;
    }

    message += `⏰ Дедлайн: ${deadline}\n`;

    if (examLink) {
      // Проверяем что ссылка валидная
      try {
        new URL(examLink);
        message += `🔗 <a href="${examLink}">Перейти к экзамену</a>\n`;
      } catch (e) {
        message += `🔗 Ссылка: ${escapeHtml(examLink)}\n`;
      }
    }

    message += `\n✅ Удачи на экзамене!`;

    await safeSendMessage(group.telegramId, message, {
      disable_web_page_preview: false,
    });

    log.success(`Уведомление отправлено в группу ${group.groupName}`);
    return { success: true, message: "Уведомление отправлено" };
  } catch (error) {
    log.error("Ошибка отправки уведомления:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// ФУНКЦИИ ДЛЯ РОДИТЕЛЬСКИХ ГРУПП
// ============================================

/**
 * Отправка текстовых результатов экзамена родителям
 * @param {Object} examResults - Результаты экзамена
 * @param {String} examResults.groupId - ID группы
 * @param {String} examResults.examTitle - Название экзамена
 * @param {Array} examResults.results - Массив результатов студентов
 * @param {String} examResults.examEnd - Дата окончания экзамена
 */
async function sendExamResultsToParents(examResults) {
  try {
    const { groupId, examTitle, results, examEnd } = examResults;

    const group = await Group.findById(groupId).populate("students");

    if (!group) {
      log.error(`Группа не найдена для результатов экзамена`);
      return { success: false, message: "Группа не найдена" };
    }

    if (!group.parentsTelegramId) {
      log.info(`Родительская группа не привязана для ${group.groupName}`);
      return { success: false, message: "Родительская группа не подключена" };
    }

    const examTitleEscaped = escapeHtml(examTitle || "Экзамен");
    const endDate = examEnd
      ? new Date(examEnd).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })
      : "Не указан";

    let message =
      `📊 <b>Результаты экзамена</b>\n\n` +
      `📝 Экзамен: ${examTitleEscaped}\n` +
      `📅 Завершен: ${endDate}\n` +
      `👥 Группа: ${escapeHtml(group.groupName)}\n\n` +
      `<b>Результаты студентов:</b>\n\n`;

    if (!results || results.length === 0) {
      message += "❌ Пока нет результатов\n";
    } else {
      // Сортируем по баллам (по убыванию)
      const sortedResults = [...results].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
      );

      sortedResults.forEach((result, index) => {
        const studentName = escapeHtml(
          result.studentName || "Неизвестный студент"
        );
        const score = result.score !== undefined ? result.score : "—";
        const maxScore = result.maxScore !== undefined ? result.maxScore : "—";
        const percentage =
          result.percentage !== undefined
            ? `${result.percentage.toFixed(1)}%`
            : "—";

        // Эмодзи в зависимости от процента
        let emoji = "📝";
        if (result.percentage >= 90) emoji = "🌟";
        else if (result.percentage >= 75) emoji = "✅";
        else if (result.percentage >= 60) emoji = "👍";
        else if (result.percentage >= 50) emoji = "📊";
        else if (result.percentage < 50) emoji = "❗️";

        message +=
          `${index + 1}. ${emoji} <b>${studentName}</b>\n` +
          `   Балл: ${score}/${maxScore} (${percentage})\n`;

        if (result.completedAt) {
          const completedDate = new Date(result.completedAt).toLocaleString(
            "ru-RU",
            {
              timeZone: "Asia/Tashkent",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }
          );
          message += `   Сдано: ${completedDate}\n`;
        }
        message += `\n`;
      });

      // Статистика группы
      const avgScore =
        results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
      const avgPercentage =
        results.reduce((sum, r) => sum + (r.percentage || 0), 0) /
        results.length;
      const completedCount = results.filter((r) => r.completed).length;

      message +=
        `\n📈 <b>Статистика:</b>\n` +
        `Средний балл: ${avgScore.toFixed(1)}\n` +
        `Средний процент: ${avgPercentage.toFixed(1)}%\n` +
        `Сдали: ${completedCount}/${results.length}\n`;
    }

    await safeSendMessage(group.parentsTelegramId, message);

    log.success(
      `Результаты экзамена отправлены родителям группы ${group.groupName}`
    );
    return { success: true, message: "Результаты отправлены родителям" };
  } catch (error) {
    log.error("Ошибка отправки результатов родителям:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Отправка PDF файла с результатами родителям
 * @param {Object} params
 * @param {String} params.groupId - ID группы
 * @param {String} params.examTitle - Название экзамена
 * @param {Buffer} params.pdfBuffer - PDF файл в виде Buffer
 * @param {String} params.caption - Подпись к файлу (опционально)
 */
async function sendExamResultsPDFToParents(params) {
  try {
    const { groupId, examTitle, pdfBuffer, caption } = params;

    const group = await Group.findById(groupId);

    if (!group) {
      log.error(`Группа не найдена`);
      return { success: false, message: "Группа не найдена" };
    }

    if (!group.parentsTelegramId) {
      log.info(`Родительская группа не привязана для ${group.groupName}`);
      return { success: false, message: "Родительская группа не подключена" };
    }

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      log.error("PDF файл не предоставлен или имеет неверный формат");
      return { success: false, message: "Неверный формат PDF файла" };
    }

    const examTitleEscaped = escapeHtml(examTitle || "Экзамен");
    const groupNameEscaped = escapeHtml(group.groupName);

    const fileName =
      `Результаты_${examTitle || "экзамена"}_${group.groupName}.pdf`.replace(
        /[^a-zA-Zа-яА-Я0-9._-]/g,
        "_"
      );

    const messageCaption =
      caption ||
      `📊 <b>Результаты экзамена</b>\n\n` +
        `📝 Экзамен: ${examTitleEscaped}\n` +
        `👥 Группа: ${groupNameEscaped}\n\n` +
        `📄 Подробные результаты в прикрепленном файле`;

    await bot.sendDocument(
      group.parentsTelegramId,
      pdfBuffer,
      {
        caption: messageCaption,
        parse_mode: "HTML",
      },
      {
        filename: fileName,
        contentType: "application/pdf",
      }
    );

    log.success(
      `PDF с результатами отправлен родителям группы ${group.groupName}`
    );
    return { success: true, message: "PDF отправлен родителям" };
  } catch (error) {
    log.error("Ошибка отправки PDF родителям:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Отправка краткого уведомления родителям о завершении экзамена
 * @param {Object} params
 * @param {String} params.groupId - ID группы
 * @param {String} params.examTitle - Название экзамена
 * @param {Number} params.completedCount - Количество сдавших
 * @param {Number} params.totalStudents - Всего студентов
 * @param {Number} params.averageScore - Средний балл (опционально)
 */
async function sendExamCompletionNoticeToParents(params) {
  try {
    const { groupId, examTitle, completedCount, totalStudents, averageScore } =
      params;

    const group = await Group.findById(groupId);

    if (!group) {
      log.error(`Группа не найдена`);
      return { success: false, message: "Группа не найдена" };
    }

    if (!group.parentsTelegramId) {
      log.info(`Родительская группа не привязана для ${group.groupName}`);
      return { success: false, message: "Родительская группа не подключена" };
    }

    const examTitleEscaped = escapeHtml(examTitle || "Экзамен");
    const groupNameEscaped = escapeHtml(group.groupName);

    let message =
      `✅ <b>Экзамен завершен</b>\n\n` +
      `📝 Название: ${examTitleEscaped}\n` +
      `👥 Группа: ${groupNameEscaped}\n` +
      `📊 Сдали: ${completedCount}/${totalStudents}\n`;

    if (averageScore !== undefined) {
      message += `📈 Средний балл: ${averageScore.toFixed(1)}\n`;
    }

    message += `\n📄 Подробные результаты будут отправлены отдельно.`;

    await safeSendMessage(group.parentsTelegramId, message);

    log.success(
      `Уведомление о завершении экзамена отправлено родителям группы ${group.groupName}`
    );
    return { success: true, message: "Уведомление отправлено родителям" };
  } catch (error) {
    log.error("Ошибка отправки уведомления родителям:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

function webhookHandler(req, res) {
  try {
    log.info("Webhook получен от Telegram");

    // Не логируем весь body в продакшене (может быть слишком много данных)
    if (process.env.NODE_ENV !== "production") {
      log.info(`Update: ${JSON.stringify(req.body)}`);
    }

    // Передаем обновление боту
    bot.processUpdate(req.body);

    res.sendStatus(200);
  } catch (error) {
    log.error("Ошибка обработки webhook:", error);
    res.sendStatus(500);
  }
}

function healthHandler(req, res) {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    bot: "active",
    webhook: "configured",
  });
}

async function webhookInfoHandler(req, res) {
  try {
    const info = await bot.getWebHookInfo();
    res.json({
      url: info.url,
      has_custom_certificate: info.has_custom_certificate,
      pending_update_count: info.pending_update_count,
      last_error_date: info.last_error_date
        ? new Date(info.last_error_date * 1000).toISOString()
        : null,
      last_error_message: info.last_error_message || null,
      max_connections: info.max_connections,
      allowed_updates: info.allowed_updates,
    });
  } catch (error) {
    log.error("Ошибка получения информации о webhook:", error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ БОТА И СЕРВЕРА
// ============================================

async function initBot() {
  try {
    log.info("Начинаем инициализацию Telegram бота...");

    const botInfo = await bot.getMe();
    log.success(`Бот @${botInfo.username} инициализирован`);
    log.info(`ID: ${botInfo.id}`);

    if (!WEBHOOK_URL) {
      log.error("WEBHOOK_URL не установлен в .env!");
      throw new Error("WEBHOOK_URL is required");
    }

    // Удаляем старый webhook
    await bot.deleteWebHook({ drop_pending_updates: true });
    log.info("Старый webhook удален");

    // Небольшая задержка для стабильности
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Устанавливаем новый webhook
    const webhookUrl = `${WEBHOOK_URL}${webhookPath}`;
    await bot.setWebHook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
      max_connections: 40,
    });

    // Проверяем webhook
    const webhookInfo = await bot.getWebHookInfo();
    log.success(`Webhook установлен: ${webhookInfo.url}`);
    log.info(`Pending updates: ${webhookInfo.pending_update_count}`);
    log.info(`Max connections: ${webhookInfo.max_connections}`);

    if (webhookInfo.last_error_date) {
      log.error(`Последняя ошибка webhook: ${webhookInfo.last_error_message}`);
      log.error(
        `Дата: ${new Date(webhookInfo.last_error_date * 1000).toISOString()}`
      );
    } else {
      log.success("Webhook работает без ошибок");
    }

    log.info(`Webhook endpoint: ${webhookUrl}`);
    log.info(`Health check: ${WEBHOOK_URL}/health`);
    log.info(`Webhook info: ${WEBHOOK_URL}/webhook-info`);

    return true;
  } catch (error) {
    log.error("Критическая ошибка инициализации бота:", error);
    throw error;
  }
}

// ============================================
// ОБРАБОТКА ОШИБОК
// ============================================

// Обработка необработанных ошибок бота
bot.on("polling_error", (error) => {
  log.error("Polling error (не должно происходить в webhook режиме):", error);
});

bot.on("webhook_error", (error) => {
  log.error("Webhook error:", error);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on("SIGINT", async () => {
  log.info("SIGINT получен, запускаем graceful shutdown...");
  try {
    await bot.deleteWebHook();
    log.info("Webhook удален");
  } catch (error) {
    log.error("Ошибка при удалении webhook:", error);
  }
});

process.on("SIGTERM", async () => {
  log.info("SIGTERM получен для OnRender deployment - продолжаем работу");
});

// Обработка необработанных промисов
process.on("unhandledRejection", (reason, promise) => {
  log.error("Необработанное отклонение промиса:", reason);
});

process.on("uncaughtException", (error) => {
  log.error("Необработанное исключение:", error);
  // Не завершаем процесс в продакшене
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
  bot,
  sendExamNotification,
  sendExamResultsToParents,
  sendExamResultsPDFToParents,
  sendExamCompletionNoticeToParents,
  initBot,
  createAndLinkNewGroup,
  webhookHandler,
  healthHandler,
  webhookInfoHandler,
  webhookPath,
};
