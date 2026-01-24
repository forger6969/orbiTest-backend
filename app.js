const express = require("express")
const cors = require("cors")
const registerRotues = require("./allRoutes.routes")
const { initSocket } = require("./socket/socket")
const { 
  webhookHandler, 
  healthHandler, 
  webhookInfoHandler, 
  webhookPath 
} = require("./telegrambot/bot")

const app = express()

app.use(cors())
app.use(express.json())

// Register main routes
registerRotues(app)

// Telegram bot webhook endpoint
app.post(webhookPath, webhookHandler)

// Bot health and info endpoints
app.get("/bot/health", healthHandler)
app.get("/bot/webhook-info", webhookInfoHandler)

// Main app health check endpoint for OnRender
app.get("/", (req, res) => {
  res.send("OrbiTest Backend is running")
})

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "OrbiTest Backend"
  })
})

module.exports = app