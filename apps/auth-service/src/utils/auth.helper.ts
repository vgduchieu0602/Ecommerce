import crypto from "crypto";
import { ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";
import { NextFunction } from "express";
import { sendEmail } from "./sendMail";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: any,
  userType: "user" | "seller"
) => {
  const { name, email, password, phone_number, country } = data;
  if (
    !name ||
    !email ||
    !password ||
    (userType === "seller" && (!phone_number || !country))
  ) {
    throw new ValidationError(`Missing required fields!`);
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format!");
  }
};

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

export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  await sendEmail(email, "Verify your email", template, { name, otp });
  await redis.set(`otp: ${email}`, otp, "EX", 300); //second
  await redis.set(`otp_cooldown: ${email}`, "true", "EX", 60);
};
