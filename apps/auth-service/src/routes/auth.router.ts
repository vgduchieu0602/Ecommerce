import express, { Router } from "express";
import {
  loginUser,
  userForgotPassword,
  userRegistration,
  userResetPassword,
  verifyUser,
  verifyUserForgotPassword,
} from "../controller/auth.controller";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/forgot-password-user", userForgotPassword);
router.post("/reset-password-user", userResetPassword);
router.post("/verify-forgot-password-user", verifyUserForgotPassword);

export default router;
