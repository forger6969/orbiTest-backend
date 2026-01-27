require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const { initSocket } = require("./socket/socket");
const { setIO } = require("./socket/io");
const { initBot } = require("./telegrambot/bot");
const { startAgenda, gracefulShutdown } = require("./agenda/agenda");

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// socket.io ni init qilish
initSocket(io);
// agendani ishga churish
startAgenda();
// bilmiman
setIO(io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

initBot();

server.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});

io.on("connection", () => {
  console.log("Socket connected (root test)");
});

// ============================================
// GRACEFUL SHUTDOWN ДЛЯ ONRENDER
// ============================================

// Graceful shutdown - только логирование, без process.exit()
process.on("SIGTERM", () => {
  console.log("SIGTERM received for OnRender deployment - continuing...");
});

process.on("SIGINT", () => {
  console.log("SIGINT received - continuing...");
});

// Обработка необработанных ошибок
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

module.exports = { io };
