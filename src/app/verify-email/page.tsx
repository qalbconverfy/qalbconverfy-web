"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.qalbconverfy.in";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Verification token missing.");
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/users/verify-email/?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              "Email verification failed. Token may be invalid or expired."
          );
        }

        setStatus("success");
        setMessage(
          data?.message || "Your email has been verified successfully."
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Email verification failed."
        );
      }
    };

    verifyEmail();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin" />}
          {status === "success" && <CheckCircle2 className="h-11 w-11" />}
          {status === "error" && <XCircle className="h-11 w-11" />}
        </div>

        <h1 className="text-3xl font-black text-slate-900">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Email Verified"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600">{message}</p>

        <div className="mt-8 flex flex-col gap-3">
          {status === "success" && (
            <Link
              href="/login"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 font-bold text-white shadow-lg"
            >
              Go to Login
            </Link>
          )}

          {status === "error" && (
            <Link
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 font-bold text-white shadow-lg"
            >
              Create Account Again
            </Link>
          )}

          <Link
            href="/"
            className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
