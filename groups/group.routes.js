const express = require("express");
const {
  createGroup,
  addStudentToGroup,
  getAllGroups,
  getMyGroup,
  updateGroup,
  getGroupById,
} = require("./group.controller");
const {
  adminMiddleware,
  tokenMiddleware,
  mentorMiddleware,
} = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createGroup);
routes.post("/add", mentorMiddleware, addStudentToGroup);
routes.get("/all", getAllGroups);
routes.get("/my", tokenMiddleware, getMyGroup);
routes.patch("/update/:id", mentorMiddleware, updateGroup);
routes.get("/:id", getGroupById);

module.exports = routes;
