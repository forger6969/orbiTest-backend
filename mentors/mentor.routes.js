const express = require("express");
const routes = express.Router();
const {
  adminMiddleware,
  mentorMiddleware,
} = require("../middlewares/auth.middleware");
const {
  createMentor,
  loginMentor,
  getMe,
  getMyGroup,
  getMyStudents,
} = require("./mentor.controller");

routes.post("/create", adminMiddleware, createMentor);
routes.post("/login", loginMentor);
routes.get("/me", mentorMiddleware, getMe);
routes.get("/groups", mentorMiddleware, getMyGroup);
routes.get("/students", mentorMiddleware, getMyStudents);

module.exports = routes;
