const express = require("express");
const routes = express.Router();
const { adminMiddleware } = require("../middlewares/auth.middleware");
const { createMentor } = require("./mentor.controller");

routes.post("/create", adminMiddleware, createMentor);

module.exports = routes;
