// bot.js - Telegram бот для OrbiTest (Webhook режим) - ИСПРАВЛЕНО
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
      `Группа ${group.groupName} успешно привязана к Telegram чату ${chatId}`
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
      `Создана новая группа: ${chatTitle} и привязана к Telegram чату ${chatId}`
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

  // Для личного чата - приветствие без настройки
  if (chatType === "private") {
    return bot.sendMessage(
      chatId,
      "👋 Привет! Я OrbiTest бот.\n\n" +
        "🎓 Я помогаю группам получать уведомления о новых экзаменах.\n\n" +
        "📌 Чтобы начать работу:\n" +
        "1. Добавьте меня в групповой чат\n" +
        "2. Назначьте меня администратором\n" +
        "3. Напишите /start в группе\n\n" +
        "❓ Нужна помощь? Напишите /help"
    );
  }

  // Для групп - полная настройка
  if (!["group", "supergroup"].includes(chatType)) {
    return bot.sendMessage(chatId, "❌ Неподдерживаемый тип чата.");
  }

  const userIsAdmin = await isUserAdmin(chatId, userId);
  if (!userIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⛔️ Только администраторы группы могут выполнять эту команду."
    );
  }

  const botIsAdmin = await isBotAdmin(chatId);
  if (!botIsAdmin) {
    return bot.sendMessage(
      chatId,
      "⚠️ Бот должен быть администратором группы для корректной работы.\n\nПожалуйста, назначьте бота администратором."
    );
  }

  const linkedGroup = await isGroupAlreadyLinked(chatId);
  if (linkedGroup) {
    return bot.sendMessage(
      chatId,
      `✅ Эта Telegram группа уже подключена к OrbiTest группе: "${linkedGroup.groupName}"\n\nВы будете получать уведомления о новых экзаменах.`
    );
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔗 Прикрепить эту группу", callback_data: "attach_group" }],
    ],
  };

  bot.sendMessage(
    chatId,
    "👋 Добро пожаловать в OrbiTest!\n\nНажмите кнопку ниже, чтобы привязать эту Telegram группу к группе студентов в системе OrbiTest.",
    { reply_markup: keyboard }
  );
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /help в чате ${chatId} (тип: ${chatType})`);

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
  const chatType = msg.chat.type;
  log.info(`Команда /students в чате ${chatId} (тип: ${chatType})`);

  // Только для групп
  if (chatType === "private") {
    return bot.sendMessage(
      chatId,
      "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
    );
  }

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
            `${index + 1}. ${student.firstName} ${student.lastName} (${student.email})`
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
  const chatType = msg.chat.type;
  log.info(`Команда /status в чате ${chatId} (тип: ${chatType})`);

  // Только для групп
  if (chatType === "private") {
    return bot.sendMessage(
      chatId,
      "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
    );
  }

  const linkedGroup = await isGroupAlreadyLinked(chatId);

  if (linkedGroup) {
    bot.sendMessage(
      chatId,
      `✅ *Статус: Подключено*\n\n` +
        `📌 Группа: ${linkedGroup.groupName}\n` +
        `📝 Описание: ${linkedGroup.groupDescribe || "Не указано"}\n` +
        `👥 Студентов: ${linkedGroup.students?.length || 0}\n\n` +
        `Вы будете получать уведомления о новых экзаменах.`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(
      chatId,
      "❌ *Статус: Не подключено*\n\n" +
        "Эта группа ещё не привязана к OrbiTest.\n" +
        "Используйте /start для настройки.",
      { parse_mode: "Markdown" }
    );
  }
});

bot.onText(/\/exams/, async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  log.info(`Команда /exams в чате ${chatId} (тип: ${chatType})`);

  // Только для групп
  if (chatType === "private") {
    return bot.sendMessage(
      chatId,
      "❌ Эта команда работает только в групповых чатах.\n\nДобавьте меня в группу и используйте команду там."
    );
  }

  try {
    const group = await Group.findOne({ telegramId: chatId.toString() });

    if (!group) {
      return bot.sendMessage(
        chatId,
        "❌ Эта группа еще не подключена к OrbiTest.\n\nИспользуйте /start для настройки."
      );
    }

    const exams = await Exam.find({ group: group._id, status: "underway" });

    if (!exams || exams.length === 0) {
      return bot.sendMessage(
        chatId,
        "📋 У вашей группы нет активных экзаменов или они все завершены."
      );
    }

    const message =
      "📚 *Активные экзамены:*\n\n" +
      exams
        .map((exam, i) => {
          const endDate = new Date(exam.examEnd);
          const startDate = new Date(exam.examStart);

          const endMonth = endDate.getMonth() + 1; // Месяцы начинаются с 0
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
            `${i + 1}. *${exam.examTitle}*\n` +
            `📝 Описание: ${exam.examDescribe || "Не указано"}\n` +
            `🟢 Начало: ${startDay}.${startMonth.toString().padStart(2, "0")} в ${startHour}:${startMinute}\n` +
            `🔴 Дедлайн: ${endDay}.${endMonth.toString().padStart(2, "0")} в ${endHour}:${endMinute}\n`
          );
        })
        .join("\n");

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    log.error("Ошибка при получении экзаменов:", error);
    bot.sendMessage(
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

// ============================================
// ФУНКЦИЯ ОТПРАВКИ УВЕДОМЛЕНИЙ
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

    log.success(`Уведомление отправлено в группу ${group.groupName}`);
    return { success: true, message: "Уведомление отправлено" };
  } catch (error) {
    log.error("Ошибка отправки уведомления:", error);
    return { success: false, message: error.message };
  }
}

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

// ИСПРАВЛЕННЫЙ обработчик webhook
function webhookHandler(req, res) {
  try {
    log.info("Webhook получен от Telegram");
    log.info(`Update: ${JSON.stringify(req.body)}`);

    // Передаем обновление боту
    bot.processUpdate(req.body);

    res.sendStatus(200);
  } catch (error) {
    log.error("Ошибка обработки webhook:", error);
    res.sendStatus(500);
  }
}

// Health check для Render
function healthHandler(req, res) {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    bot: "active",
  });
}

// Информация о webhook
async function webhookInfoHandler(req, res) {
  try {
    const info = await bot.getWebHookInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ БОТА И СЕРВЕРА
// ============================================

async function initBot() {
  try {
    const botInfo = await bot.getMe();
    log.success(`Бот @${botInfo.username} инициализирован`);
    log.info(`ID: ${botInfo.id}`);

    if (!WEBHOOK_URL) {
      log.error("WEBHOOK_URL не установлен в .env!");
      process.exit(1);
    }

    // Удаляем старый webhook
    await bot.deleteWebHook({ drop_pending_updates: true });
    log.info("Старый webhook удален");

    // Небольшая задержка
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Устанавливаем новый webhook
    const webhookUrl = `${WEBHOOK_URL}${webhookPath}`;
    await bot.setWebHook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: ["message", "callback_query"],
    });

    // Проверяем webhook
    const webhookInfo = await bot.getWebHookInfo();
    log.success(`Webhook установлен: ${webhookInfo.url}`);
    log.info(`Pending updates: ${webhookInfo.pending_update_count}`);

    if (webhookInfo.last_error_date) {
      log.error(`Ошибка webhook: ${webhookInfo.last_error_message}`);
      log.error(
        `Дата: ${new Date(webhookInfo.last_error_date * 1000).toISOString()}`
      );
    }

    log.info(`Webhook: ${webhookUrl}`);
    log.info(`Health: ${WEBHOOK_URL}/health`);
  } catch (error) {
    log.error("Ошибка инициализации:", error);
    throw error;
  }
}

// ============================================
// GRACEFUL SHUTDOWN - ОТКЛЮЧЕНО ДЛЯ ONRENDER
// ============================================

// ВАЖНО: На OnRender эти обработчики вызывают проблемы с развертыванием
// Оставляем только логирование без остановки процесса
process.on("SIGINT", () => {
  log.info("SIGINT получен, но процесс продолжается для OnRender");
});

process.on("SIGTERM", () => {
  log.info("SIGTERM получен, но процесс продолжается для OnRender");
});

// Экспорт
module.exports = {
  bot,
  sendExamNotification,
  initBot,
  createAndLinkNewGroup,
  webhookHandler,
  healthHandler,
  webhookInfoHandler,
  webhookPath,
};

// НЕ ЗАПУСКАЕМ АВТОМАТИЧЕСКИ - это делает server.js
