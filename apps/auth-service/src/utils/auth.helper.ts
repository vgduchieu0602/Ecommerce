import crypto from "crypto";
import { ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";
import { NextFunction, Request, Response } from "express";
import { sendEmail } from "./sendMail";
import prisma from "@packages/libs/prisma";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
  Hàm này sẽ thực hiện kiểm tra dữ liệu đăng ký có hợp lệ không
  Tham số:
  - data: object chứa thông tin đăng ký (name, email, password, phone_number, country)
  - userType: kiểu user ("user" hoặc "seller") vì seller cần thêm thông tin bổ sung
  * Lưu ý:
  Trong backend, validate thường là điều kiện bắt buộc, nếu dữ liệu không hợp lệ, ta cần chặn luồng xử lý,
  không cho code phía sau chạy tiếp do đó throw sẽ kết thúc ngay lập tức và để middleware xử lý lỗi thống nhất
*/
export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller"
) => {
  //Destructure các field cần kiểm tra từ object data
  const { name, email, password, phone_number, country } = data;

  //1. Kiểm tra các field bắt buộc
  //   - với user: phải có name, email, password
  //   - với seller: ngoài các field trên phải có phone_number và country
  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError(`Missing required fields!`); //nếu thiếu bất kì field nào -> throw ra lỗi ValidationError
  }

  //2. Kiểm tra định dạng email có hợp lệ không (dựa vào regex EmailRegex)
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format!");
  }
};

/**
 * Hàm này sẽ thực hiện kiểm tra các giới hạn khi người dùng yêu cầu OTP
 * Cơ chế kiểm tra:
 * - Nếu có khóa 'otp_lock:email' trong Redis -> tài khoản bị khóa do nhập sai OTP nhiều lần => chặn request và trả lỗi
 * - Nếu có khóa 'otp_spam_lock:email' trong Redis -> người dùng đã request OTP quá nhiều lần => chặn request và trả lỗi
 * - Nếu có khóa 'otp_cooldown:email' trong Redis -> người dùng vừa mới request OTP và đang trong thời gian chờ => chặn request và trả lỗi
 */
export const checkOtpRestriction = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_lock: ${email}`)) {
    return next(
      new ValidationError(
        "Account locked due to multiple failed attempts! Try again after 30 minutes"
      )
    );
  }
  if (await redis.get(`otp_spam_lock: ${email}`)) {
    return next(
      new ValidationError(
        "Too many OTP request! Please wait 1 hour before trying again."
      )
    );
  }
  if (await redis.get(`otp_cooldown: ${email}`)) {
    return next(
      new ValidationError("Please wait 1 minute before trying again.")
    );
  }
};

export const trackOtpRequests = async (email: string, next: NextFunction) => {
  //Kiểm tra số lần email đã request OTP
  const otpRequestKey = `otp_request_count: ${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");
  if (otpRequests >= 2) {
    await redis.set(`otp_spam_lock: ${email}`, "locked", "EX", 3600); //Lock for 1 hour
    return next(
      new ValidationError(
        "Too many OTP request! Please wait 1 hour before trying again."
      )
    );
  }

  await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600); //Track request for 1 hour
};

/**
 * Hàm này tạo và gửi mã OTP đến email người dùng
 */
export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  //1. Tạo mã OTP ngẫu nhiên 4 chữ số:
  //- Sử dụng randomtInt để đảm bảo OTP sinh ra an toàn, khó đoán
  //- Chuyển sang chuỗi để dễ dàng chèn vào mail
  const otp = crypto.randomInt(1000, 9999).toString();

  //2. Gửi email cho xác thực cho người dùng
  await sendEmail(email, "Verify your email", template, { name, otp });

  //Cú pháp của hàm redis.set:
  //+ key: tên khóa trong Redis
  //+ value: giá trị cần lưu
  //+ "EX": option để chỉ định hết hạn theo giây
  //+ number: số giây hết hạn

  //3. Lưu OTP vào Redis
  await redis.set(`otp: ${email}`, otp, "EX", 300); //5 minutes

  //4. Đặt khóa cooldown trong Redis => ngăn người dùng spam gửi OTP liên tục
  await redis.set(`otp_cooldown: ${email}`, "true", "EX", 60);
};

export const verifyOtp = async (
  email: string,
  otp: string,
  next: NextFunction
) => {
  const storedOtp = await redis.get(`otp: ${email}`);
  if (!storedOtp) {
    throw new ValidationError("Invalid or expire OTP!");
  }

  const failedAttemptsKey = `otp_attemps: ${email}`;
  const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || "0");

  if (storedOtp !== otp) {
    if (failedAttempts >= 2) {
      await redis.set(`otp_lock: ${email}`, "locked", "EX", 1800); //Lock for 30 minutes
      await redis.del(`otp: ${email}`, failedAttemptsKey);

      return next(
        new ValidationError(
          "Too many failed attempts. Your account is locked for 30 minutes."
        )
      );
    }
    await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 300);
    return next(
      new ValidationError(`Incorrect OTP. ${2 - failedAttempts} attempts left.`)
    );
  }

  await redis.del(`otp: ${email}`, failedAttemptsKey);
};

export const handleForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
  userType: "user" | "seller"
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required!");
    }

    //Find user/seller in DB
    const user =
      userType === "user"
        ? await prisma.users.findUnique({ where: { email } })
        : await prisma.sellers.findUnique({ where: { email } });

    if (!user) {
      throw new ValidationError(`${userType} not found!`);
    }

    //Check OTP restriction
    await checkOtpRestriction(email, next);
    await trackOtpRequests(email, next);

    //Generate OTP and send Email
    await sendOtp(
      user.name,
      email,
      userType === "user"
        ? "forgot-password-user-email"
        : "forgot-password-seller-email"
    );

    res
      .status(200)
      .json({ message: "OTP sent to email. Please verify your account!" });
  } catch (error) {
    next(error);
  }
};

export const verifyForgotPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError("Missing required fields!");
    }

    await verifyOtp(email, otp, next);

    res
      .status(200)
      .json({ message: "OTP verified. You can reset password rightnow!" });
  } catch (error) {
    next(error);
  }
};
