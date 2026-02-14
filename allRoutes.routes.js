const authRoutes = require("./auth/auth.routes");
const userRoutes = require("./user/user.routes");
const testRoutes = require("./tests/test.routes");
const groupRoutes = require("./groups/group.routes");
const examRoutes = require("./exams/exam.routes");
const mentorRoutes = require("./mentors/mentor.routes");
const notifyRoutes = require("./notification/notifications.routes");

const registerRotues = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/test", testRoutes);
  app.use("/api/group", groupRoutes);
  app.use("/api/exam", examRoutes);
  app.use("/api/mentor", mentorRoutes);
  app.use("/api/notifications", notifyRoutes);
};

module.exports = registerRotues;
