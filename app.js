const express = require("express");
const cors = require("cors");
const registerRotues = require("./allRoutes.routes");
const { initSocket } = require("./socket/socket");
const {
  webhookHandler,
  healthHandler,
  webhookInfoHandler,
  webhookPath,
} = require("./telegrambot/bot");
const setupSwagger = require("./swagger.setup");
const session = require("express-session");
const passport = require("passport");
require("./config/passport");
const app = express();

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true в production с HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Setup Swagger API documentation
setupSwagger(app);

// Register main routes
registerRotues(app);

// Telegram bot webhook endpoint
app.post(webhookPath, webhookHandler);

// Bot health and info endpoints
app.get("/bot/health", healthHandler);
app.get("/bot/webhook-info", webhookInfoHandler);

// Main app health check endpoint for OnRender
app.get("/", (req, res) => {
  res.send("OrbiTest Backend is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "OrbiTest Backend",
  });
});

module.exports = app;
