import { AppError } from "./index";
import { Request, Response, NextFunction } from "express";

//=== Định nghĩa Middleware ===
//Đây là 1 middleware đặc biệt của Express, nhận 4 tham số err, req, res, next
//Khi bất kỳ route hoặc middleware nào gọi next(err) thì lỗi sẽ được đẩy xuống đây
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //Xử lý lỗi thuộc loại AppError
  if (err instanceof AppError) {
    console.log(`Error ${req.method} ${req.url} - ${err.message}`); //Log ra lỗi cùng HTTP method và URL

    //trả về response JSON
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err.details && { details: err.details }), //chỉ thêm field details nếu tồn tại
    });
  }

  console.log("Unhandled Error: ", err);

  return res.status(500).json({
    error: "Something went wrong, please try again!",
  });
};

// === Luồng xử lý ===
//1. Có lỗi ở bất kỳ đâu trong request -> gọi next(err)
//2. Nếu err là AppError -> trả về JSON chi tiết với statusCode, message, details
//3. Nếu err không xác định -> log ra và trả về HTTP 500 với thông báo

// === Mục đích ===
// Gi úp tập trung quản lý lỗi thay vì phải viết try/catch và res.status().json() ở từng route
