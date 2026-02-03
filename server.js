require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const { setIO } = require("./socket/io");
const { initSocket } = require("./socket/socket");
const { initBot } = require("./telegrambot/bot");
const { startAgenda, gracefulShutdown } = require("./agenda/agenda");

const server = http.createServer(app);

// ✅ ИСПРАВЛЕННЫЕ CORS НАСТРОЙКИ
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // лучше указать конкретный домен
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // добавьте оба транспорта
  allowEIO3: true, // совместимость со старыми клиентами
  pingTimeout: 60000, // увеличьте таймаут
  pingInterval: 25000,
});

// Логируем для дебага
console.log("🔧 Socket.IO configuration:", {
  cors: io.engine.opts.cors,
  transports: io.engine.opts.transports,
});

// ВАЖНО: сначала устанавливаем io instance
setIO(io);

// Затем инициализируем socket (создаем namespaces и обработчики)
initSocket(io);

// Проверяем что namespaces созданы
console.log("📡 Available namespaces:", Array.from(io._nsps.keys()));

// Агенду запускаем
startAgenda();

// MongoDB подключение
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Telegram бот
initBot();

// Запуск сервера
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`); // ✅ ИСПРАВЛЕНО
  console.log(`📡 Socket.IO ready on port ${PORT}`);
});

// ============================================
// GRACEFUL SHUTDOWN ДЛЯ ONRENDER
// ============================================
process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received - starting graceful shutdown...");
  try {
    // Закрываем все socket соединения
    io.close(() => {
      console.log("✅ Socket.IO closed");
    });

    // Останавливаем Agenda
    await gracefulShutdown();

    // Закрываем MongoDB
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");

    // Закрываем HTTP сервер
    server.close(() => {
      console.log("✅ HTTP server closed");
      process.exit(0);
    });

    // Если через 10 секунд не закрылось - принудительно
    setTimeout(() => {
      console.error(
        "❌ Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("⚠️ SIGINT received - starting graceful shutdown...");
  process.emit("SIGTERM");
});

// Обработка необработанных ошибок
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[UNHANDLED REJECTION]",
    new Date().toISOString(),
    "- Promise:",
    promise,
    "Reason:",
    reason
  );
});

process.on("uncaughtException", (error) => {
  console.error(
    "[UNCAUGHT EXCEPTION]",
    new Date().toISOString(),
    "- Error:",
    error
  );
});

module.exports = { io, server };
