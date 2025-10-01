//AppError kế thừa lớp Error có sẵn trong JS -> vẫn là 1 loại Error chuẩn nhưng được mở rộng thêm thông tin
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    //StackTrace chỉ tập trung hiển thị từ nơi AppError được gọi
    Error.captureStackTrace(this); //giúp theo dõi stack trace của lỗi dễ dàng hơn khi debug
  }
}

// Tài nguyên không tồn tại
export class NotFoundError extends AppError {
  constructor(message = "Resources not found") {
    super(message, 404);
  }
}

// Dữ liệu từ client không hợp lệ (sử dụng cho Joi/ZOD/react-hook-form validation errors)
export class ValidationError extends AppError {
  constructor(message = "Invalid request data", details?: any) {
    super(message, 400, true, details);
  }
}

// Người dùng chưa đăng nhập hoặc token không hợp lệ
export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

// Người dùng đã đăng nhập nhưng không đủ quyền để truy cập tài nguyên
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden access") {
    super(message, 403);
  }
}

// Lỗi liên quan database
export class DatabaseError extends AppError {
  constructor(message = "Database error", details?: any) {
    super(message, 500, true, details);
  }
}

// Lỗi giới hạn tốc độ API
export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(message, 429);
  }
}
