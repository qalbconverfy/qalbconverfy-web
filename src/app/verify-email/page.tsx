"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "loading" | "success" | "error";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.qalbconverfy.in";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    async function verifyEmail() {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        setStatus("error");
        setMessage("Verification token missing.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail || "Email verification failed.");
        }

        setStatus("success");
        setMessage(data?.message || "Email verified successfully.");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Email verification failed."
        );
      }
    }

    verifyEmail();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-black text-slate-900">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Email Verified"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="mt-4 text-slate-600">{message}</p>

        <div className="mt-8">
          {status === "success" ? (
            <Link
              href="/login"
              className="block rounded-2xl bg-purple-600 px-5 py-3 font-bold text-white"
            >
              Go to Login
            </Link>
          ) : (
            <Link
              href="/"
              className="block rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white"
            >
              Back to Home
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
