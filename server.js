require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./app");
const { initSocket } = require("./socket/socket");
const { setIO } = require("./socket/io");
const { initBot } = require("./telegrambot/bot");
const { startAgenda } = require("./agenda/agenda");

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

server.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});

io.on("connection", () => {
  console.log("Socket connected (root test)");
});

module.exports = { io };
