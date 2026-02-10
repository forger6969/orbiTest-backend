const express = require("express");
const {
  registerUser,
  loginUser,
  googleAuthCallback,
  completeProfile,
} = require("./auth.controller");
const { validateUser, validateLogin } = require("./auth.validator");
const passport = require("passport");
const routes = express.Router();

routes.post("/register", validateUser, registerUser);
routes.post("/login", validateLogin, loginUser);
routes.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

routes.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.FRONTEND_URL + "/auth/error",
  }),
  googleAuthCallback
);

routes.post("/complete-profile", completeProfile);

module.exports = routes;
