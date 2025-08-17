"use client";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import axios, { AxiosError } from "axios";
import { countries } from "apps/seller-ui/src/utils/countries";

const RegisterPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [showOtp, setShowOtp] = useState(false);
  const [sellerData, setSellerData] = useState<FormData | null>(null);
  const [sellerId, setSellerId] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const registerMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/seller-registration`,
        data
      );
      return response.data;
    },
    onSuccess: (_, formData) => {
      setSellerData(formData);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!sellerData) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-seller`,
        {
          ...sellerData,
          otp: otp.join(""),
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setSellerId(data?.seller?.id);
      setActiveStep(2);
    },
  });

  const onSubmit = (data: any) => {
    registerMutation.mutate(data);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOtp = () => {
    if (sellerData) {
      registerMutation.mutate(sellerData);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-10 min-h-screen">
      {/** Stepper */}
      <div className="relative flex items-center justify-between md:w-[50%] mb-8">
        <div className="absolute top-[25%] left-10 w-[80%] md:w-[90%] h-1 bg-gray-300 -z-10"></div>
        {[1, 2, 3].map((step) => (
          <div key={step}>
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-bold ${
                step <= activeStep ? "bg-[#FF541B]" : "bg-gray-300"
              }`}
            >
              {step}
            </div>
            <span className="ml-[-15px]">
              {step === 1
                ? "Create Account"
                : step === 2
                ? "Setup Shop"
                : "Connect Bank"}
            </span>
          </div>
        ))}
      </div>

      {/** Step content */}
      <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
        {activeStep === 1 && (
          <>
            {!showOtp ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="text-2xl font-semibold text-center mb-4">
                  Create Seller Account
                </h3>
                {/** Name */}
                <label className="block mb-1 text-gray-700">Name</label>
                <input
                  type="text"
                  placeholder="Your name..."
                  className="w-full p-2 border border-gray-300 outline-none !rounded mb-1"
                  {...register("name", {
                    required: "Name is required",
                  })}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">
                    {String(errors.name.message)}
                  </p>
                )}

                {/** Email */}
                <label className="block mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  placeholder="Your email..."
                  className="w-full p-2 border border-gray-300 outline-none !rounded mb-1"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value:
                        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">
                    {String(errors.email.message)}
                  </p>
                )}

                {/** Phone Number */}
                <label className="block mb-1 text-gray-700">
                  Phone Number:
                </label>
                <input
                  type="tel"
                  placeholder="Your phone number..."
                  className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
                  {...register("phone_number", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^\+?[1-9]\d{1,14}$/, //E.164 format
                      message: "Invalid phone number format",
                    },
                    minLength: {
                      value: 10,
                      message: "Phone number must be at least 10 digits",
                    },
                    maxLength: {
                      value: 15,
                      message: "Phone number cannot exceed 15 digits",
                    },
                  })}
                />

                {errors.phone_number && (
                  <p className="text-red-500 text-sm">
                    {String(errors.phone_number.message)}
                  </p>
                )}

                {/** Country */}
                <label className="block mb-1 text-gray-700">Country</label>
                <select
                  className="w-full p-2 border border0-gray-300 outline-none rounded-[4px] mb-1"
                  {...register("country", { required: "Country is required" })}
                >
                  <option value="">Select your country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>

                {errors.country && (
                  <p className="text-red-500 text-sm">
                    {String(errors.country.message)}
                  </p>
                )}

                {/** Password */}
                <label className="block mb-1 text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Your password..."
                    className="w-full p-2 border border-gray-300 outline-none !rounded mb-1"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                  >
                    {passwordVisible ? <Eye /> : <EyeOff />}
                  </button>
                  {errors.password && (
                    <p className="text-red-500 text-sm">
                      {String(errors.password.message)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full text-lg cursor-pointer bg-black text-white py-2 rounded-lg mt-4"
                >
                  {registerMutation.isPending ? "Registering..." : "Register"}
                </button>

                {registerMutation.isError &&
                  registerMutation.error instanceof AxiosError && (
                    <p className="text-red-500 text-sm mt-2">
                      {registerMutation.error.response?.data?.message ||
                        registerMutation.error.message}
                    </p>
                  )}

                <p className="pt-3 text-center">
                  Already have an account?{" "}
                  <Link href={"/login"} className="text-[#FF541B]">
                    Login
                  </Link>
                </p>
              </form>
            ) : (
              <div className="">
                <h3 className="text-xl font-semibold text-center mb-4">
                  Enter OTP
                </h3>
                <div className="flex justify-center gap-6">
                  {otp?.map((digit, index) => (
                    <input
                      type="text"
                      key={index}
                      ref={(el) => {
                        if (el) {
                          inputRefs.current[index] = el;
                        }
                      }}
                      maxLength={1}
                      className="w-12 h-12 text-center border border-gray-300 outline-none !rounded"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>
                <button
                  className="w-full mt-4 text-lg cursor-pointer bg-[#FF541B] text-white py-2 rounded-lg"
                  disabled={verifyOtpMutation.isPending}
                  onClick={() => verifyOtpMutation.mutate()}
                >
                  {verifyOtpMutation.isPending ? "Verifing..." : "Verify OTP"}
                </button>
                <p className="text-center text-sm mt-4">
                  {canResend ? (
                    <button
                      onClick={resendOtp}
                      className="text-[#FF541B] cursor-pointer "
                    >
                      Resend OTP
                    </button>
                  ) : (
                    `Resend OTP in ${timer} seconds`
                  )}
                </p>
                {verifyOtpMutation?.isError &&
                  verifyOtpMutation.error instanceof AxiosError && (
                    <p className="text-red-500 text-sm mt-2">
                      {verifyOtpMutation.error.response?.data?.message ||
                        verifyOtpMutation.error.message}
                    </p>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
