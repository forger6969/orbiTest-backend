const express = require("express");
const { getMe } = require("./user.controller");
const { tokenMiddleware } = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.get("/me", tokenMiddleware, getMe);

module.exports = routes;
