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
  getDashboard,
  mentorNotifications,
  deleteNotify,
  createGroupWithMentor,
} = require("./mentor.controller");

routes.post("/create", adminMiddleware, createMentor);
routes.post("/login", loginMentor);
routes.get("/me", mentorMiddleware, getMe);
routes.get("/groups", mentorMiddleware, getMyGroup);
routes.get("/students", mentorMiddleware, getMyStudents);
routes.get("/dashboard", mentorMiddleware, getDashboard);
routes.get("/notifications", mentorMiddleware, mentorNotifications);
routes.delete("notifications/:id", mentorMiddleware, deleteNotify);
routes.post("/createGroup", mentorMiddleware, createGroupWithMentor);

module.exports = routes;
