import { errorMiddleware } from './../../../packages/error-handler/error-middleware';
import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send({ message: "Auth Service" });
});

app.use(errorMiddleware)

const port = process.env.PORT || 6001;
const server = app.listen(port, () => {
  console.log(`Auth service is running on http://localhost:${port}/api`);
});

//Tránh crash
server.on("error", (err) => {
  console.log("Server Error", err);
});
