/**
 * Swagger UI Setup для OrbiTest Backend
 * Этот файл содержит конфигурацию для интеграции Swagger UI с Express
 */

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const setupSwagger = (app) => {
  // Swagger UI доступен по адресу /api-docs
  app.use("/api-docs", swaggerUi.serve);
  app.get(
    "/api-docs",
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        url: "/swagger.json",
      },
    }),
  );

  // Также делаем JSON доступным напрямую
  app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
  });
};

module.exports = setupSwagger;
