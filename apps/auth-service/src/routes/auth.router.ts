import express, { Router } from "express";
import {
  getUser,
  loginUser,
  refreshToken,
  userForgotPassword,
  userRegistration,
  userResetPassword,
  verifyUser,
  verifyUserForgotPassword,
} from "../controller/auth.controller";
import isAuthenticated from "@packages/middleware/isAuthenticated";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/forgot-password-user", userForgotPassword);
router.post("/reset-password-user", userResetPassword);
router.post("/verify-forgot-password-user", verifyUserForgotPassword);

router.post("/refresh-token-user", refreshToken);
router.get("/logged-in-user", isAuthenticated, getUser);

export default router;
