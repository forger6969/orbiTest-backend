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
  mentorMiddleware,
} = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", mentorMiddleware, createExam);
routes.get("/all", getAllExams);
routes.post("/result", tokenMiddleware, addResult);
routes.get("/myExams", tokenMiddleware, getMyGroupExams);

module.exports = routes;
