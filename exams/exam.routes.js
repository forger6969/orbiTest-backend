const express = require("express");
const {
  createExam,
  getAllExams,
  addResult,
  getMyGroupExams,
  getMyExamsMentor,
  evaluateExamResult,
  getResultsForEvaluation,
  getResultDetail,
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
routes.get("/mentorExams", mentorMiddleware, getMyExamsMentor);
// Новые роуты для оценки результатов
routes.post("/evaluate", mentorMiddleware, evaluateExamResult);
routes.get(
  "/results-evaluation/:examId",
  mentorMiddleware,
  getResultsForEvaluation
);
routes.get("/result-detail/:resultId", mentorMiddleware, getResultDetail);

module.exports = routes;
