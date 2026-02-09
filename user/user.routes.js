const express = require("express");
const { getMe, deleteUser } = require("./user.controller");
const {
  tokenMiddleware,
  mentorMiddleware,
} = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.get("/me", tokenMiddleware, getMe);
routes.delete("/:id", mentorMiddleware, deleteUser);

module.exports = routes;
