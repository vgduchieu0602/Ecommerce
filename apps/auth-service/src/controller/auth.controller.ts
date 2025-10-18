import { NextFunction, Request, Response } from "express";
import {
  checkOtpRestriction,
  handleForgotPassword,
  sendOtp,
  trackOtpRequests,
  validateRegistrationData,
  verifyForgotPasswordOtp,
  verifyOtp,
} from "../utils/auth.helper";
import prisma from "@packages/libs/prisma";
import { AuthError, ValidationError } from "@packages/error-handler";
import bcrypt from "bcryptjs";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookie";

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY!);

//Middleware xử lý đăng ký user với OTP qua email
export const userRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //1. Kiểm tra dữ liệu người dùng gửi lên có hợp lệ không
    validateRegistrationData(req.body, "user");

    //2. Lấy thông tin name và email từ request body
    const { name, email } = req.body;

    //3. Kiểm tra trong database xem email này đã đăng ký chưa
    const existingUser = await prisma.users.findUnique({ where: { email } });

    if (existingUser) {
      //Nếu đã tồn tại user với email này thì báo lỗi
      return next(new ValidationError("User already exists with this email"));
    }

    //4. Kiểm tra xem email này có bị giới hạn gửi OTP không (ngăn ngừa spam)
    await checkOtpRestriction(email, next);

    //5. Ghi nhận lại lần gửi OTP này để theo dõi số lượng request
    await trackOtpRequests(email, next);

    //6. Gửi OTP tới email người dùng, sử dụng template "user-activation-mail"
    await sendOtp(name, email, "user-activation-mail");

    //7. Trả về phản hồi thành công cho client
    res
      .status(200)
      .json({ message: "OTP sent to your email. Please verify your account!" });
  } catch (error) {
    //8. Nếu có lỗi ở bất kỳ bước nào thì chuyển cho error middleware xử lý
    return next(error);
  }
};

//Midleware xác thực và tạo tài khoản người dùng mới
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //Lấy thông tin từ request body
    const { email, otp, password, name } = req.body;

    //Kiểm tra nếu thiếu bất kỳ trường nào thì trả lỗi
    if (!email || !otp || !password || !name) {
      return next(new ValidationError("Missing required fields!"));
    }

    //Kiểm tra email đã tồn tại trong hệ thống chưa
    const existingUser = await prisma.users.findUnique({ where: { email } });

    //Đã tồn tại thì trả lỗi
    if (existingUser) {
      return next(new ValidationError("User already exists with this email"));
    }

    //Xác thực OTP đã gửi tới email
    await verifyOtp(email, otp, next);

    const hashedPassword = await bcrypt.hash(password, 10); //mã hõa mật khẩu

    //Tạo người dùng mới
    const user = await prisma.users.create({
      data: { name, email, password: hashedPassword },
    });

    //Return về response thành công
    res.status(201).json({
      success: true,
      message: "User register successfully!",
    });
  } catch (error) {
    return next(error); //Bắt lỗi
  }
};

/**
 * Xử lý đăng nhập người dùng.
 *
 * @param req - Request chứa email và mật khẩu trong body.
 * @param res - Response để gửi dữ liệu phản hồi.
 * @param next - Middleware function để xử lý lỗi.
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError("Email and password are required!"));
    }

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) return next(new AuthError("User doesn't exist!"));

    // So sánh mật khẩu người dùng nhập với mật khẩu đã mã hóa trong DB
    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      return next(new AuthError("Invalid email or password!"));
    }

    // Nếu xác thực thành công, tạo access token
    const accessToken = jwt.sign(
      { id: user.id, role: "user" },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: "15m",
      }
    );

    // Tạo refresh token (hạn 7 ngày) để dùng khi access token hết hạn
    const refreshToken = jwt.sign(
      { id: user.id, role: "user" },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    // Lưu cả access token và refresh token vào cookie bảo mật (httpOnly)
    setCookie(res, "refresh_token", refreshToken);
    setCookie(res, "access_token", accessToken);

    // Trả về phản hồi thành công, kèm theo thông tin cơ bản của người dùng
    res.status(200).json({
      message: "Login successfull",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return next(error);
  }
};

//Refresh token user
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.cookies["refresh_token"] ||
      req.cookies["seller-refresh-token"] ||
      req.headers.authorization?.split(" ")[1];

    if (!refreshToken) {
      return new ValidationError("Unauthorized! No refresh token.");
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string; role: string };

    if (!decoded || !decoded.id || !decoded.role) {
      return new JsonWebTokenError("Forbidden! Invalid refresh token.");
    }

    //Kiểm tra người dùng và người bán hàng phải tồn tại trong database
    let account;
    if (decoded.role === "user") {
      account = await prisma.users.findUnique({ where: { id: decoded.id } });
    } else if (decoded.role === "seller") {
      account = await prisma.sellers.findUnique({
        where: { id: decoded.id },
        include: { shop: true },
      });
    }

    if (!account) {
      return new AuthError("Forbidden! User/Seller not found.");
    }

    //Tạo refresh access token cho người dùng
    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );

    setCookie(res, "access_token", newAccessToken);
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

//Lấy thông tin người dùng đã đăng nhập
export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

//Quên mật khẩu
export const userForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await handleForgotPassword(req, res, next, "user");
};

//Xác thực OTP cho việc quên mật khẩu
export const verifyUserForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await verifyForgotPasswordOtp(req, res, next);
};

//Đặt lại mật khẩu người dùng
export const userResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return next(new ValidationError("Email and new password are required!"));
    }

    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      return next(new ValidationError("User not found!"));
    }

    //So sánh mật khẩu mới với mật khẩu hiện tại
    const isSamePassword = await bcrypt.compare(newPassword, user.password!);

    if (isSamePassword) {
      return next(
        new ValidationError(
          "New password must be different from the existing one!"
        )
      );
    }

    //Mã hóa mật khẩu mới
    const hashPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { email },
      data: { password: hashPassword },
    });

    res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    next(error);
  }
};

//Đăng ký tài khoản cho người bán hàng
export const sellerRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRegistrationData(req.body, "seller");
    const { name, email } = req.body;

    const exisitingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (exisitingSeller) {
      throw new ValidationError("Seller already exists with this email!");
    }

    await checkOtpRestriction(email, next);
    await trackOtpRequests(email, next);
    await sendOtp(name, email, "seller-activation-mail");

    res
      .status(200)
      .json({ message: "OTP sent to email. Please verify your account." });
  } catch (error) {
    next(error);
  }
};

//Xác thực OTP cho người bán hàng
export const verifySeller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp, password, name, phone_number, country } = req.body;

    if (!email || !otp || !password || !name || !phone_number || !country) {
      return next(new ValidationError("All fields are required!"));
    }

    const existingSeller = await prisma.sellers.findUnique({
      where: { email },
    });

    if (existingSeller) {
      return next(
        new ValidationError("Seller already exists with this email!")
      );
    }

    await verifyOtp(email, otp, next);
    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await prisma.sellers.create({
      data: {
        name,
        email,
        password: hashedPassword,
        country,
        phone_number,
      },
    });

    res
      .status(201)
      .json({ seller, message: "Seller registered successfully!" });
  } catch (error) {
    next(error);
  }
};

//Tạo cửa hàng mới
export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, bio, address, opening_hours, website, category, sellerId } =
      req.body;

    if (
      !name ||
      !bio ||
      !address ||
      !opening_hours ||
      !website ||
      !category ||
      !sellerId
    ) {
      return next(new ValidationError("All fields are required!"));
    }

    const shopData: any = {
      name,
      bio,
      address,
      opening_hours,
      category,
      sellerId,
    };

    if (website && website.trim() !== "") {
      shopData.website = website;
    }

    const shop = await prisma.shops.create({
      data: shopData,
    });

    res.status(201).json({ success: true, shop });
  } catch (error) {
    next(error);
  }
};

//Khởi tạo kết nối cho Stripe tới tài khoản người bán hàng
export const createStripeConnectLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return next(new ValidationError("Seller ID is required!"));
    }

    const seller = await prisma.sellers.findUnique({
      where: {
        id: sellerId,
      },
    });

    if (!seller) {
      return next(new ValidationError("Seller is not available with this id!"));
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: seller?.email,
      country: seller?.country || "VN",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.sellers.update({
      where: { id: sellerId },
      data: { stripeId: account.id },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/pending`,
      return_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/success`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    return next(error);
  }
};

//Đăng nhập tài khoản cho người bán hàng
export const loginSeller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError("Email and password are required!"));
    }

    const seller = await prisma.sellers.findUnique({ where: { email } });

    if (!seller) {
      return next(new ValidationError("Invalid email or password!"));
    }

    //Verify password
    const isMatch = await bcrypt.compare(password, seller.password!);
    if (!isMatch) {
      return next(new ValidationError("Invalid email or password"));
    }

    //Generate access token and refresh token
    const accessToken = jwt.sign(
      {
        id: seller.id,
        role: "seller",
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: seller.id, role: "seller" },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: "7d" }
    );

    //store refresh token and access token
    setCookie(res, "seller-access-token", accessToken);
    setCookie(res, "seller-refresh-token", refreshToken);

    res.status(200).json({
      message: "Login successful!",
      seller: { id: seller.id, email: seller.email, name: seller.name },
    });
  } catch (error) {
    next(error);
  }
};

//Lấy dữ liệu người bán hàng đã đăng nhập
export const getSeller = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const seller = req.seller;
    res.status(201).json({ success: true, seller });
  } catch (error) {
    next(error);
  }
};
