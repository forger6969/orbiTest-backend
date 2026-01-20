const express = require("express");
const {
  createNewTest,
  getAllTests,
  getTestById,
  addResult,
  getResults,
  getAllTypesTest,
} = require("./test.controller");
const { adminMiddleware, tokenMiddleware } = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createNewTest);
routes.get("/all", getAllTests);
routes.get("/get/:id", getTestById);
routes.post("/result",tokenMiddleware , addResult);
routes.get("/myResults" , tokenMiddleware , getResults)
routes.get("/types" , getAllTypesTest)

module.exports = routes;
