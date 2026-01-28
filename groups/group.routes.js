const express = require("express");
const {
  createGroup,
  addStudentToGroup,
  getAllGroups,
  getMyGroup,
} = require("./group.controller");
const {
  adminMiddleware,
  tokenMiddleware,
} = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createGroup);
routes.post("/add", adminMiddleware, addStudentToGroup);
routes.get("/all", getAllGroups);
routes.get("/my", tokenMiddleware, getMyGroup);

module.exports = routes;
