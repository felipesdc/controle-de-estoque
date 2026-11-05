import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import swaggerDocument from "../swagger.json";

export const setupSwagger = (app: Express) => {
  app.get("/api-docs/openapi.json", (_req, res) => { res.json(swaggerDocument); });
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss:
        ".swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }",
      swaggerOptions: { persistAuthorization: false },
    })
  );
};
