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
  sendResultsToParents,
  getExamById,
  getMyResults,
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
routes.post("/send-results/:id", mentorMiddleware, sendResultsToParents);
routes.get("/my-results", tokenMiddleware, getMyResults);
routes.get("/:id", getExamById);

module.exports = routes;
