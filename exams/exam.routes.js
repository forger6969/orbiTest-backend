const express = require("express");
const {
  createExam,
  getAllExams,
  addResult,
  getMyGroupExams,
} = require("./exam.controller");
const {
  adminMiddleware,
  tokenMiddleware,
} = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createExam);
routes.get("/all", getAllExams);
routes.post("/result", tokenMiddleware, addResult);
routes.get("/myExams", tokenMiddleware, getMyGroupExams);

module.exports = routes;
