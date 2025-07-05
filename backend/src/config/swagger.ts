import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ClickFlow Bug Hunter API",
      version: "1.0.0",
      description:
        "API documentation for ClickFlow Bug Hunter backend services",
      contact: {
        name: "API Support",
        email: "support@clickflow.com",
      },
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Development server",
      },
      {
        url: "https://your-app-name.vercel.app",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        HealthCheck: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "OK",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            uptime: {
              type: "number",
              description: "Server uptime in seconds",
            },
          },
        },
        AnalysisRequest: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
              description: "Website URL to analyze",
              example: "https://example.com",
            },
          },
          required: ["url"],
        },
        AnalysisResult: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
            },
            status: {
              type: "string",
              enum: ["success", "error"],
            },
            data: {
              type: "object",
              description: "Analysis results",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/app.ts"], // Path to the API docs
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "ClickFlow Bug Hunter API",
    })
  );

  // Serve swagger.json
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
};

export default specs;
