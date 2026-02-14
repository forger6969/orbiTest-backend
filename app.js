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

// Security: Check for SESSION_SECRET
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error("FATAL ERROR: SESSION_SECRET is not defined in production!");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-me", // Fallback only for dev
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true в production с HTTPS
      httpOnly: true, // Prevents XSS scripts from reading the cookie
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
