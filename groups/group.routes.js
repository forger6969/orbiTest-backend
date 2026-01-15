const express = require("express");
const { createGroup, addStudentToGroup } = require("./group.controller");
const { adminMiddleware } = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createGroup);
routes.post("/add" , adminMiddleware , addStudentToGroup)

module.exports = routes