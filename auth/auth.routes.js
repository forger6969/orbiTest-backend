const express = require("express");
const { registerUser, loginUser } = require("./auth.controller");
const { validateUser, validateLogin } = require("./auth.validator");
const routes = express.Router();

routes.post("/register", validateUser, registerUser);
routes.post("/login", validateLogin, loginUser);

module.exports = routes;
