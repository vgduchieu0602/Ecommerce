import express, { Router } from "express";
import {
  createShop,
  getUser,
  loginUser,
  refreshToken,
  sellerRegister,
  userForgotPassword,
  userRegistration,
  userResetPassword,
  verifySeller,
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

router.post("/seller-registration", sellerRegister);
router.post("/verify-seller", verifySeller);
router.post("/create-shop", createShop);

export default router;
