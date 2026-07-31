"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toastError("Failed to reset password", error.message);
      return;
    }

    setDone(true);
    success("Password reset successful", "You can now login with your new password.");
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[var(--shadow-lg)] ring-1 ring-stone-100">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900">Password Updated</h1>
        <p className="mt-2 text-sm text-stone-500">
          Your password has been successfully reset.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="mt-6 w-full"
          size="lg"
        >
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[var(--shadow-lg)] ring-1 ring-stone-100">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[var(--shadow-brand)]">
          <Lock className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-stone-900">Create new password</h1>
        <p className="mt-1 text-sm text-stone-500">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="New password" error={errors.password?.message} required id="password">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pl-10 pr-9"
              error={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm new password" error={errors.confirmPassword?.message} required id="confirm-password">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pl-10 pr-9"
              error={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          size="lg"
        >
          Reset password
        </Button>
      </form>
    </div>
  );
}
