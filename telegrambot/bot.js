// bot.js - Telegram бот для OrbiTest (Webhook режим)
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const mongoose = require("mongoose");
const Group = require("../groups/group.model");
const Exam = require("../exams/exam.model");
const { agenda } = require("../agenda/agenda");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// Создаем бота БЕЗ polling
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Создаем Express сервер для webhook
const app = express();
app.use(express.json());

const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg, err) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err),
  success: (msg) =>
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`),
};

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

async function linkGroupToTelegram(groupId, chatId) {
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return { success: false, message: "Группа не найдена в базе данных" };
    }

    if (group.telegramId && group.telegramId !== chatId.toString()) {
      return {
        success: false,
        message: `Группа "${group.groupName}" уже привязана к другому Telegram чату`,
      };
    }

    group.telegramId = chatId.toString();
    await group.save();

    log.success(
      `Группа ${group.groupName} успешно привязана к Telegram чату ${chatId}`,
    );

    return {
      success: true,
      message: `Группа "${group.groupName}" успешно подключена и теперь будет получать уведомления!`,
      groupName: group.groupName,
    };
  } catch (error) {
    log.error("Ошибка привязки группы:", error);
    return { success: false, message: "Произошла ошибка при привязке группы" };
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
          message: `Группа "${chatTitle}" уже существует и привязана к другому Telegram чату`,
        };
      }

      existingGroup.telegramId = chatId.toString();
      await existingGroup.save();

      return {
        success: true,
        message: `Группа "${chatTitle}" уже существовала в системе и успешно подключена!`,
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
      `Создана новая группа: ${chatTitle} и привязана к Telegram чату ${chatId}`,
    );

    return {
      success: true,
      message: `Новая группа "${chatTitle}" создана и успешно подключена к OrbiTest!\n\nТеперь вы будете получать уведомления о новых экзаменах.`,
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

const getStudentsThisGroup = async (chatid) => {
  const group = await Group.findOne({ telegramId: chatid }).populate(
    "students",
  );
  return group.students;
};

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat.type;

  log.info(
    `Получена команда /start от пользователя ${userId} в чате ${chatId}`,
  );

  if (!["group", "supergroup"].includes(chatType)) {
    return bot.sendMessage(
      chatId,
      "❌ Эта команда работает только в группах.\n\nДобавьте бота в группу и сделайте его администратором.",
    );
  }

  const userIsAdmin = await isUserAdmin(chatId, userId);
  if (!userIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⛔️ Только администраторы группы могут выполнять эту команду.",
    );
  }

  const botIsAdmin = await isBotAdmin(chatId);
  if (!botIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⚠️ Бот должен быть администратором группы для корректной работы.\n\nПожалуйста, назначьте бота администратором.",
    );
  }

  const linkedGroup = await isGroupAlreadyLinked(chatId);
  if (linkedGroup) {
    return bot.sendMessage(
      chatId,
      `✅ Эта Telegram группа уже подключена к OrbiTest группе: "${linkedGroup.groupName}"\n\n` +
        `Вы будете получать уведомления о новых экзаменах.`,
    );
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔗 Прикрепить эту группу", callback_data: "attach_group" }],
    ],
  };

  bot.sendMessage(
    chatId,
    "👋 Добро пожаловать в OrbiTest!\n\n" +
      "Нажмите кнопку ниже, чтобы привязать эту Telegram группу к группе студентов в системе OrbiTest.",
    { reply_markup: keyboard },
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  log.info(`Получена команда /help в чате ${chatId}`);

  const helpText =
    "📚 *OrbiTest Bot - Помощь*\n\n" +
    "*Доступные команды:*\n" +
    "/start - Начать настройку и привязать группу\n" +
    "/help - Показать это сообщение\n" +
    "/status - Проверить статус подключения\n" +
    "/students - Список студентов группы\n\n" +
    "*Возможности бота:*\n" +
    "✅ Привязка Telegram группы к OrbiTest\n" +
    "✅ Создание новой группы автоматически\n" +
    "✅ Уведомления о новых экзаменах\n" +
    "✅ Автоматические напоминания\n\n" +
    "*Требования:*\n" +
    "⚡️ Бот должен быть администратором группы\n" +
    "⚡️ Только админы могут управлять настройками";

  bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
});

bot.onText(/\/students/, async (msg) => {
  const chatId = msg.chat.id;
  log.info(`Получена команда /students в чате ${chatId}`);

  try {
    const students = await getStudentsThisGroup(chatId);

    if (!students || students.length === 0) {
      return bot.sendMessage(chatId, "📋 В этой группе пока нет студентов.");
    }

    const message =
      "👥 *Студенты группы:*\n\n" +
      students
        .map(
          (student, index) =>
            `${index + 1}. ${student.firstName} ${student.lastName} (${student.email})`,
        )
        .join("\n");

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    log.error("Ошибка получения студентов:", error);
    bot.sendMessage(chatId, "❌ Ошибка при получении списка студентов.");
  }
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  log.info(`Получена команда /status в чате ${chatId}`);

  const linkedGroup = await isGroupAlreadyLinked(chatId);

  if (linkedGroup) {
    bot.sendMessage(
      chatId,
      `✅ *Статус: Подключено*\n\n` +
        `📌 Группа: ${linkedGroup.groupName}\n` +
        `📝 Описание: ${linkedGroup.groupDescribe || "Не указано"}\n` +
        `👥 Студентов: ${linkedGroup.students?.length || 0}\n\n` +
        `Вы будете получать уведомления о новых экзаменах.`,
      { parse_mode: "Markdown" },
    );
  } else {
    bot.sendMessage(
      chatId,
      "❌ *Статус: Не подключено*\n\n" +
        "Эта группа ещё не привязана к OrbiTest.\n" +
        "Используйте /start для настройки.",
      { parse_mode: "Markdown" },
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

  log.info(
    `Получен callback: ${data} от пользователя ${userId} в чате ${chatId}`,
  );

  const userIsAdmin = await isUserAdmin(chatId, userId);
  if (!userIsAdmin) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: "⛔️ Только администраторы могут выполнять это действие",
      show_alert: true,
    });
  }

  if (data === "attach_group") {
    const groups = await getAllGroups();

    const keyboard = {
      inline_keyboard: groups.map((group) => [
        {
          text: `${group.groupName}`,
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

    bot.answerCallbackQuery(callbackQuery.id);

    let messageText =
      groups.length > 0
        ? "📋 Выберите группу из списка или создайте новую:"
        : "📋 В системе пока нет групп.\n\nВы можете создать новую группу автоматически:";

    bot.editMessageText(messageText, {
      chat_id: chatId,
      message_id: msg.message_id,
      reply_markup: keyboard,
    });
  } else if (data === "create_new") {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "Создаем новую группу...",
    });

    const chat = await bot.getChat(chatId);
    const chatTitle = chat.title || "Новая группа";

    const result = await createAndLinkNewGroup(chatId, chatTitle);

    if (result.success) {
      const successMessage = result.isNew
        ? `✅ ${result.message}\n\n📝 Название: ${chatTitle}\n\nВы можете изменить описание и добавить студентов в веб-интерфейсе OrbiTest.`
        : `✅ ${result.message}`;

      bot.editMessageText(successMessage, {
        chat_id: chatId,
        message_id: msg.message_id,
      });
    } else {
      bot.editMessageText(`❌ ${result.message}`, {
        chat_id: chatId,
        message_id: msg.message_id,
      });
    }
  } else if (data.startsWith("select_")) {
    const groupId = data.replace("select_", "");

    const result = await linkGroupToTelegram(groupId, chatId);

    bot.answerCallbackQuery(callbackQuery.id);

    if (result.success) {
      bot.editMessageText(`✅ ${result.message}`, {
        chat_id: chatId,
        message_id: msg.message_id,
      });
    } else {
      bot.editMessageText(`❌ ${result.message}`, {
        chat_id: chatId,
        message_id: msg.message_id,
      });
    }
  } else if (data === "cancel") {
    bot.answerCallbackQuery(callbackQuery.id);
    bot.editMessageText("❌ Операция отменена.", {
      chat_id: chatId,
      message_id: msg.message_id,
    });
  }
});

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

    const examName = exam.examTitle || "Новый экзамен";
    const deadline = exam.examEnd
      ? new Date(exam.examEnd).toLocaleString("ru-RU")
      : "Не указан";
    const examLink = exam.examResource?.link || "";

    let message =
      `🎓 *Новый экзамен доступен!*\n\n` +
      `📝 Название: ${examName}\n` +
      `⏰ Дедлайн: ${deadline}\n`;

    if (examLink) {
      message += `🔗 Ссылка: ${examLink}\n`;
    }

    message += `\n✅ Удачи на экзамене!`;

    await bot.sendMessage(group.telegramId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });

    log.success(
      `Уведомление о экзамене отправлено в группу ${group.groupName}`,
    );
    return { success: true, message: "Уведомление отправлено" };
  } catch (error) {
    log.error("Ошибка отправки уведомления о экзамене:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

// Endpoint для получения обновлений от Telegram

const webhookPath = `/bot/${encodeURIComponent(BOT_TOKEN)}`;

app.post(webhookPath, (req, res) => {
  log.info(`Получен webhook запрос: ${JSON.stringify(req.body)}`);
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Endpoint для проверки webhook
app.get("/webhook-info", async (req, res) => {
  try {
    const info = await bot.getWebHookInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Корневой маршрут
app.get("/", (req, res) => {
  res.send("OrbiTest Telegram Bot is running on webhook mode");
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ БОТА И СЕРВЕРА
// ============================================

async function initBot() {
  try {
    const botInfo = await bot.getMe();
    log.success(`Бот @${botInfo.username} инициализирован!`);
    log.info(`ID бота: ${botInfo.id}`);
    log.info(`Имя бота: ${botInfo.first_name}`);

    if (!WEBHOOK_URL) {
      log.error("WEBHOOK_URL не установлен в переменных окружения!");
      log.info("Используйте ngrok или другой туннель для локальной разработки");
      log.info("Например: WEBHOOK_URL=https://your-domain.ngrok.io");
      process.exit(1);
    }

    // Сначала удаляем старый webhook
    await bot.deleteWebHook();
    log.info("Старый webhook удален");

    // Устанавливаем новый webhook
    const webhookPath = `${WEBHOOK_URL}/bot${BOT_TOKEN}`;
    await bot.setWebHook(webhookPath);

    const webhookInfo = await bot.getWebHookInfo();
    log.success(`Webhook установлен: ${webhookInfo.url}`);
    log.info(`Pending updates: ${webhookInfo.pending_update_count}`);

    if (webhookInfo.last_error_date) {
      log.error(`Последняя ошибка webhook: ${webhookInfo.last_error_message}`);
      log.error(
        `Дата ошибки: ${new Date(webhookInfo.last_error_date * 1000).toISOString()}`,
      );
    }

    // Запускаем Express сервер
    app.listen(PORT, () => {
      log.success(`Express сервер запущен на порту ${PORT}`);
      log.info(`Webhook endpoint: POST ${webhookPath}`);
      log.info(`Health check: GET http://localhost:${PORT}/health`);
      log.info(`Webhook info: GET http://localhost:${PORT}/webhook-info`);
    });
  } catch (error) {
    log.error("Ошибка инициализации бота:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  log.info("Получен сигнал SIGINT. Останавливаем бота...");
  try {
    await bot.deleteWebHook();
    log.success("Webhook удален");
    process.exit(0);
  } catch (error) {
    log.error("Ошибка при удалении webhook:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  log.info("SIGTERM получен, останавливаем Agenda...");
  try {
    await agenda.stop(); // останавливаем задачи
    log.success("Agenda остановлена");
    process.exit(0);
  } catch (err) {
    log.error("Ошибка остановки Agenda:", err);
    process.exit(1);
  }
});

// Запускаем бота при импорте
initBot();

module.exports = {
  bot,
  sendExamNotification,
  initBot,
  createAndLinkNewGroup,
  app,
};
