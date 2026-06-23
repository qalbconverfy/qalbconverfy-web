"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "@/lib/validation/auth-schemas";
import { useAuth } from "@/providers/auth-provider";
import { useRedirectIfAuthenticated } from "@/hooks/use-require-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/constants/app-routes";
import { extractFieldErrors } from "@/lib/api/client";

export default function LoginPage() {
  const { isHydrating } = useRedirectIfAuthenticated();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login(values);
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === "identifier" || field === "password") {
            setError(field, { message });
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isHydrating) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f5f3ff_38%,#fdf4ff_70%,#ffffff_100%)] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-purple-200/60 backdrop-blur-xl">
        <div className="bg-gradient-to-br from-blue-500 via-violet-600 to-fuchsia-500 px-8 py-9 text-center text-white">
          <Link href={APP_ROUTES.landing} className="mx-auto block w-fit">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 p-3 shadow-xl">
              <Image
                src="/brand/qalb-logo.png"
                alt="QalbConverfy logo"
                width={80}
                height={80}
                priority
                className="object-contain"
              />
            </div>
          </Link>

          <h1 className="mt-5 text-3xl font-black tracking-tight">
            QalbConverfy
          </h1>
          <p className="mt-2 text-sm font-medium text-white/80">
            Welcome back to your secure account
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Continue with your email, username, or phone.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4">
            <Input
              label="Email, username, or phone"
              placeholder="you@example.com"
              autoComplete="username"
              error={errors.identifier?.message}
              {...register("identifier")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              isLoading={isSubmitting}
              fullWidth
              size="lg"
              className="mt-2 border-0 bg-gradient-to-r from-blue-500 via-violet-600 to-fuchsia-500 text-white shadow-lg shadow-purple-200 hover:opacity-95"
            >
              Sign in
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href={APP_ROUTES.register}
              className="font-bold text-violet-600 hover:text-fuchsia-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
