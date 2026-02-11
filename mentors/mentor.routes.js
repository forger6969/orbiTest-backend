const express = require("express");
const routes = express.Router();
const jwt = require("jsonwebtoken");
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
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  requestPasswordChange,
  confirmPasswordChange,
} = require("./mentor.controller");
const passport = require("passport");

// Создание и авторизация
routes.post("/create", adminMiddleware, createMentor);
routes.post("/login", loginMentor);

// Получение данных
routes.get("/me", mentorMiddleware, getMe);
routes.get("/groups", mentorMiddleware, getMyGroup);
routes.get("/students", mentorMiddleware, getMyStudents);
routes.get("/dashboard", mentorMiddleware, getDashboard);
routes.get("/notifications", mentorMiddleware, mentorNotifications);

// Удаление уведомлений
routes.delete("/notifications/:id", mentorMiddleware, deleteNotify);

// Создание группы
routes.post("/createGroup", mentorMiddleware, createGroupWithMentor);

// ==================== НОВЫЕ РОУТЫ ДЛЯ ИЗМЕНЕНИЯ ПРОФИЛЯ ====================

// Обновление базовой информации профиля (имя, фамилия, био, навыки и т.д.)
routes.put("/profile/update", mentorMiddleware, updateProfile);

// Смена email (двухэтапный процесс)
routes.post("/email/request-change", mentorMiddleware, requestEmailChange);
routes.post("/email/confirm-change", mentorMiddleware, confirmEmailChange);

// Смена пароля (с подтверждением по коду)
routes.post(
  "/password/request-change",
  mentorMiddleware,
  requestPasswordChange
);
routes.post(
  "/password/confirm-change",
  mentorMiddleware,
  confirmPasswordChange
);

// ==================== GOOGLE AUTH ====================

routes.get(
  "/google/mentor",
  passport.authenticate("google-mentor", {
    scope: ["profile", "email"],
  })
);

routes.get(
  "/google/mentor/callback",
  passport.authenticate("google-mentor", {
    failureRedirect: `${process.env.FRONTEND_URL}/mentor/login?error=auth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      const mentor = req.user.mentor;
      if (!mentor) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/mentor/login?error=auth_failed`
        );
      }

      // Генерируем JWT токен для ментора
      const token = jwt.sign(
        { id: mentor._id },
        process.env.JWT_SECRET_MENTOR,
        {
          expiresIn: "24h",
        }
      );

      console.log("✅ Google Mentor Login Success:", mentor.email);

      // Редирект на фронтенд с токеном
      res.redirect(
        `${process.env.FRONTEND_URL}/mentor/auth/callback?token=${token}`
      );
    } catch (err) {
      console.error("❌ Google Mentor Callback Error:", err);
      res.redirect(
        `${process.env.FRONTEND_URL}/mentor/login?error=server_error`
      );
    }
  }
);

module.exports = routes;
