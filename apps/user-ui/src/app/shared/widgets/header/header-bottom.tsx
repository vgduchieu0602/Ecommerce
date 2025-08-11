"use client";
import { navItems } from "apps/user-ui/src/configs/constants";
import {
  AlignLeft,
  ChevronDown,
  CircleUser,
  Heart,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const HeaderBottom = () => {
  const [show, setShow] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  //Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isSticky ? "fixed top-0 left-0 z-[100] bg-white shadow-lg" : "relative"
      }`}
    >
      <div
        className={`w-[80%] relative m-auto flex items-center justify-between ${
          isSticky ? "pt-3" : "py-0"
        }`}
      >
        {/* All Dropdown Menu */}
        <div
          className={`w-[260px] ${
            isSticky && "-mb-2"
          } cursor-pointer flex items-center justify-between px-5 h-[50px] bg-[#FF541B]`}
          onClick={() => setShow(!show)}
        >
          <div className="flex items-center gap-2">
            <AlignLeft color="white" />
            <span className="text-white font-medium">All Departments</span>
          </div>
          <ChevronDown color="white" />
        </div>

        {/** Dropdown Menu */}
        {show && (
          <div
            className={`absolute left-0 ${
              isSticky ? "top-[70px]" : "top-[50px]"
            } w-[260px] h-[400px] bg-[#f5f5f5]`}
          ></div>
        )}

        {/** Navigation Links */}
        <div className="flex items-center">
          {navItems.map((item, index) => (
            <Link
              className="px-5 font-medium text-lg"
              href={item.href}
              key={index}
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div>
          {isSticky && (
            <div className="flex items-center gap-8 pb-2">
              <div className="flex itens-center gap-2">
                <Link
                  href={"/login"}
                  className="flex items-center justify-center mr-5"
                >
                  <CircleUser className="w-[40px] h-[40px]" color="#3489FF" />
                </Link>
                <Link href={"/login"}>
                  <span className="block font-medium">Hello, </span>
                  <span className="font-semibold">Sign In</span>
                </Link>
              </div>
              <div className="flex items-center gap-5">
                <Link href={"/wishlist"} className="relative">
                  <Heart />
                  <div className="w-6 h-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px]">
                    <span className="text-white font-medium text-sm">0</span>
                  </div>
                </Link>
                <Link href={"/cart"} className="relative">
                  <ShoppingCart />
                  <div className="w-6 h-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px]">
                    <span className="text-white font-medium text-sm">9+</span>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderBottom;
