import { errorMiddleware } from "@packages/error-handler/error-middleware.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/auth.router.js";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = require("./swagger-output.json");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

//Test service có chạy không
app.get("/", (req, res) => {
  res.send({ message: "Auth Service" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); //mở SwaggerUI
//trả về raw JSON spec
app.get("/docs-json", (req, res) => {
  res.json(swaggerDocument);
});

//Routes
app.use("/api", router);

//Middleware xử lý lỗi
app.use(errorMiddleware);

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is running at http://localhost:${port}/api`);
  console.log(`Swagger Docs available at http://localhost:${port}/api-docs`);
});

//Tránh crash
server.on("error", (err) => {
  console.log("Server Error", err);
});
