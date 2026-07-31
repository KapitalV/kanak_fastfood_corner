"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toastError("Login failed", error.message);
      return;
    }

    if (data.user) {
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      success("Welcome back!", "You're now signed in.");
      const redirect = searchParams.get("redirect") ?? "/";
      router.push(redirect);
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[var(--shadow-lg)] ring-1 ring-stone-100">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[var(--shadow-brand)]">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-stone-900">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sign in to your Kanak Foods account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email address" error={errors.email?.message} required id="email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="pl-10"
              error={!!errors.email}
              {...register("email")}
            />
          </div>
        </Field>

        <Field label="Password" error={errors.password?.message} required id="password">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pl-10 pr-10"
              error={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Link href="/otp" className="block text-center text-sm font-semibold text-orange-600 hover:text-orange-700">
          Sign in with phone OTP
        </Link>

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          size="lg"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="mx-auto max-w-md py-16 text-center text-sm text-stone-500">Loading sign in…</div>}><LoginForm /></Suspense>;
}
