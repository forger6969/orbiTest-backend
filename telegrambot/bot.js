// bot.js - Telegram бот для OrbiTest (Webhook режим)
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const mongoose = require("mongoose");
const Group = require("../groups/group.model");
const Exam = require("../exams/exam.model");

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

/**
 * Проверяет, является ли бот администратором группы
 */
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

/**
 * Получает все группы из MongoDB
 */
async function getAllGroups() {
  try {
    const groups = await Group.find({}).select("_id groupName groupDescribe");
    return groups;
  } catch (error) {
    log.error("Ошибка получения групп из БД:", error);
    return [];
  }
}

/**
 * Проверяет, привязана ли уже какая-то группа к этому Telegram chat
 */
async function isGroupAlreadyLinked(chatId) {
  try {
    const group = await Group.findOne({ telegramId: chatId.toString() });
    return group;
  } catch (error) {
    log.error("Ошибка проверки привязки группы:", error);
    return null;
  }
}

/**
 * Привязывает группу к Telegram
 */
async function linkGroupToTelegram(groupId, chatId) {
  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return { success: false, message: "Группа не найдена в базе данных" };
    }

    // Проверяем, не привязана ли уже эта группа к другому чату
    if (group.telegramId && group.telegramId !== chatId.toString()) {
      return {
        success: false,
        message: `Группа "${group.groupName}" уже привязана к другому Telegram чату`,
      };
    }

    // Привязываем
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

/**
 * Создает новую группу в MongoDB и сразу привязывает к Telegram
 */
async function createAndLinkNewGroup(chatId, chatTitle) {
  try {
    // Проверяем, не существует ли уже группа с таким названием
    const existingGroup = await Group.findOne({ groupName: chatTitle });

    if (existingGroup) {
      // Если группа существует, просто привязываем её
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

    // Создаем новую группу
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
  const group = await Group.findOne({ telegramId: chatid }).populate("students");
  return group.students;
};

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

/**
 * Команда /start
 */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chatType = msg.chat.type;

  // Команда работает только в группах и супергруппах
  if (!["group", "supergroup"].includes(chatType)) {
    return bot.sendMessage(
      chatId,
      "❌ Эта команда работает только в группах.\n\nДобавьте бота в группу и сделайте его администратором.",
    );
  }

  // Проверяем, что пользователь - админ
  const userIsAdmin = await isUserAdmin(chatId, userId);
  if (!userIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⛔️ Только администраторы группы могут выполнять эту команду.",
    );
  }

  // Проверяем, что бот - админ
  const botIsAdmin = await isBotAdmin(chatId);
  if (!botIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⚠️ Бот должен быть администратором группы для корректной работы.\n\nПожалуйста, назначьте бота администратором.",
    );
  }

  // Проверяем, не привязана ли уже группа
  const linkedGroup = await isGroupAlreadyLinked(chatId);
  if (linkedGroup) {
    return bot.sendMessage(
      chatId,
      `✅ Эта Telegram группа уже подключена к OrbiTest группе: "${linkedGroup.groupName}"\n\n` +
        `Вы будете получать уведомления о новых экзаменах.`,
    );
  }

  // Отправляем приветственное сообщение с кнопкой
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

/**
 * Команда /help
 */
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpText =
    "📚 *OrbiTest Bot - Помощь*\n\n" +
    "*Доступные команды:*\n" +
    "/start - Начать настройку и привязать группу\n" +
    "/help - Показать это сообщение\n" +
    "/status - Проверить статус подключения\n\n" +
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

  const students = await getStudentsThisGroup(chatId);
  const message = students
    .map(
      (student, index) =>
        `${index + 1}. ${student.firstName} ${student.lastName} (${student.email})`,
    )
    .join("\n");

  bot.sendMessage(chatId, message);
});

/**
 * Команда /status
 */
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

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

  // Проверяем админские права
  const userIsAdmin = await isUserAdmin(chatId, userId);
  if (!userIsAdmin) {
    return bot.answerCallbackQuery(callbackQuery.id, {
      text: "⛔️ Только администраторы могут выполнять это действие",
      show_alert: true,
    });
  }

  // Обработка кнопки "Прикрепить группу"
  if (data === "attach_group") {
    const groups = await getAllGroups();

    // Формируем клавиатуру с группами
    const keyboard = {
      inline_keyboard: groups.map((group) => [
        {
          text: `${group.groupName}`,
          callback_data: `select_${group._id}`,
        },
      ]),
    };

    // Добавляем кнопку "Создать новую группу"
    keyboard.inline_keyboard.push([
      { text: "➕ Создать новую группу", callback_data: "create_new" },
    ]);

    // Добавляем кнопку "Отмена"
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
  }

  // Обработка создания новой группы
  else if (data === "create_new") {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "Создаем новую группу...",
    });

    // Получаем информацию о чате
    const chat = await bot.getChat(chatId);
    const chatTitle = chat.title || "Новая группа";

    // Создаем и привязываем новую группу
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
  }

  // Обработка выбора группы
  else if (data.startsWith("select_")) {
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
  }

  // Обработка отмены
  else if (data === "cancel") {
    bot.answerCallbackQuery(callbackQuery.id);
    bot.editMessageText("❌ Операция отменена.", {
      chat_id: chatId,
      message_id: msg.message_id,
    });
  }
});

async function sendExamNotification(exam) {
  try {
    // Получаем группу, к которой привязан экзамен
    const group = await Group.findById(exam.group);

    if (!group) {
      log.error(`Группа не найдена для экзамена ${exam._id}`);
      return { success: false, message: "Группа не найдена" };
    }

    if (!group.telegramId) {
      log.info(`Группа ${group.groupName} не привязана к Telegram`);
      return { success: false, message: "Группа не привязана к Telegram" };
    }

    // Формируем сообщение
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

    // Отправляем сообщение
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
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
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

    // Устанавливаем webhook
    if (WEBHOOK_URL) {
      await bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
      const webhookInfo = await bot.getWebHookInfo();
      log.success(`Webhook установлен: ${webhookInfo.url}`);
      log.info(`Pending updates: ${webhookInfo.pending_update_count}`);
    } else {
      log.error("WEBHOOK_URL не установлен в переменных окружения!");
      process.exit(1);
    }

    // Запускаем Express сервер
    app.listen(PORT, () => {
      log.success(`Express сервер запущен на порту ${PORT}`);
      log.info(`Webhook endpoint: /bot${BOT_TOKEN}`);
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
  log.info("Получен сигнал SIGTERM. Останавливаем бота...");
  try {
    await bot.deleteWebHook();
    log.success("Webhook удален");
    process.exit(0);
  } catch (error) {
    log.error("Ошибка при удалении webhook:", error);
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