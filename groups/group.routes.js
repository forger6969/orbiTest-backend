const express = require("express");
const { createGroup, addStudentToGroup, getAllGroups } = require("./group.controller");
const { adminMiddleware } = require("../middlewares/auth.middleware");
const routes = express.Router();

routes.post("/create", adminMiddleware, createGroup);
routes.post("/add", adminMiddleware, addStudentToGroup);
routes.get("/all", getAllGroups);

module.exports = routes;
