const express = require("express")
const cors = require("cors")
const registerRotues = require("./allRoutes.routes")

const app = express()

app.use(cors())
app.use(express.json())
registerRotues(app)

module.exports = app