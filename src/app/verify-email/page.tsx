"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.qalbconverfy.in";

const REGISTER_URL = "https://qalbconverfy.in/register";
const LOGIN_URL = "https://qalbconverfy.in/login";
const HOME_URL = "https://qalbconverfy.in";

export default function VerifyEmailPage() {
  const hasRequested = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Please wait while we verify your email.");

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;

    async function verifyEmail() {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing. Please create an account again.");
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/auth/verify-email/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "This verification link is invalid or expired."
          );
        }

        setStatus("success");
        setMessage(data?.message || "Your email has been verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Email verification failed. Please create an account again."
        );
      }
    }

    verifyEmail();
  }, []);

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#7c3aed_0%,#312e81_35%,#020617_100%)] px-4 py-10 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-lg items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 px-7 py-8 text-white">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-black shadow-lg backdrop-blur">
              Q
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/75">
              QalbConverfy
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {isLoading && "Verifying Email"}
              {isSuccess && "Email Verified"}
              {isError && "Verification Failed"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/85">
              Secure account verification for your QalbConverfy profile.
            </p>
          </div>

          <div className="px-7 py-8 text-center">
            <div
              className={[
                "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow-xl",
                isLoading && "bg-blue-50 text-blue-600",
                isSuccess && "bg-emerald-50 text-emerald-600",
                isError && "bg-rose-50 text-rose-600",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isLoading && (
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              )}
              {isSuccess && "✓"}
              {isError && "!"}
            </div>

            <p className="text-base leading-7 text-slate-600">{message}</p>

            <div className="mt-8 grid gap-3">
              {isSuccess && (
                <Link
                  href={LOGIN_URL}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3.5 text-center font-bold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  Continue to Login
                </Link>
              )}

              {isError && (
                <Link
                  href={REGISTER_URL}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3.5 text-center font-bold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  Create Account
                </Link>
              )}

              <Link
                href={HOME_URL}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-center font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                Back to Home
              </Link>
            </div>

            {isError && (
              <p className="mt-5 text-xs leading-5 text-slate-400">
                If your account already exists, request a new verification email from the login or register page.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
