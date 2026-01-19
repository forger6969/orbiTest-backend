const express = require("express");
const { createExam, getAllExams } = require("./exam.controller");
const { adminMiddleware } = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createExam);
routes.get("/all" , getAllExams)

module.exports = routes