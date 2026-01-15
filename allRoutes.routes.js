const authRoutes = require("./auth/auth.routes");
const userRoutes = require("./user/user.routes");
const testRoutes = require("./tests/test.routes")
const groupRoutes = require("./groups/group.routes")

const registerRotues = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/test" , testRoutes)
  app.use("/api/group" , groupRoutes)
};

module.exports = registerRotues;
