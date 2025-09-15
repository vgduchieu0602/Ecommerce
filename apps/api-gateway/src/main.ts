import express from "express";
import cors from "cors";
import proxy from "express-http-proxy";
import morgan from "morgan";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import axios from "axios";
import cookieParser from "cookie-parser";

import * as path from "path";

const app = express(); //tạo ứng dụng express

//Cấu hình CORS
app.use(
  cors({
    origin: ["http://localhost:3000"], //chỉ cho phép frontend này
    allowedHeaders: ["Authorization", "Content-Type"], //cho phép header Authorization và Content-Type
    credentials: true, //cho phép gửi cookie/token theo request
  })
);

app.use(morgan("dev")); //Log HTTP request ra console
app.use(express.json({ limit: "100mb" })); //Cho phép parse JSON body (tối đa 100MB)
app.use(express.urlencoded({ limit: "100mb", extended: true })); //Cho phép parse form-data (tối đa 100MB)
app.use(cookieParser()); //Giúp đọc cookie từ client
app.set("trust proxy", 1); //Cho phép Express tin tưởng IP khi chạy proxy

//Apply rate litiming
/**
 * - Mỗi 15p:
 *  + Người dùng thường -> tối đa 100 request
 *  + Người dùng đã xác thực -> tối đa 1000 request
 * - keyGenerator:
 *  + Nếu client có apiKey trong query -> dùng API key làm định danh
 *  + Nếu không -> dùng IP làm định danh
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, //how long to remember request for, in milliseconds
  max: (req: any) => (req.user ? 1000 : 100),
  message: "Quá nhiều yêu cầu, hãy thử lại sau!", //response to return after limit is reached
  standardHeaders: true, //enable the ratelimit header
  legacyHeaders: true, //enable the X-Rate-limit header
  keyGenerator: (req: any) => {
    if (req.query.apiKey) return req.query.apiKey;

    return ipKeyGenerator(req.ip);
  }, //Identify users (defaults to IP address)
});

app.use(limiter); //áp dụng middleware rate limiting cho toàn bộ API

//Endpoint kiểm tra gateway
app.get("/gateway-health", (req, res) => {
  res.send({ message: "Welcome to api-gateway!" }); //trả về JSON để check gateway còn hoạt động không
});

//Proxy sabg service khác
app.use("/", proxy("http://localhost:6001")); //tất cả request đến API gateway sẽ được chuyển tiếp sang service chạy ở cổng 6001

//Khởi chạy server
const port = process.env.PORT || 8080; //nên sử dụng cổng 8080 cho API-Gateway
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", console.error);
