"use client";
/* eslint-disable react/no-unescaped-entities */

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import { Mail, KeyRound, ArrowLeft } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { success, error: toastError } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toastError("Failed to send reset link", error.message);
      return;
    }

    setSubmitted(true);
    success("Reset link sent", "Check your email for instructions.");
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[var(--shadow-lg)] ring-1 ring-stone-100">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[var(--shadow-brand)]">
          <KeyRound className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-stone-900">Forgot Password</h1>
        <p className="mt-1 text-sm text-stone-500">
          We'll send you a link to reset your password
        </p>
      </div>

      {submitted ? (
        <div className="text-center">
          <div className="rounded-xl bg-emerald-50 p-4 mb-6 ring-1 ring-emerald-200">
            <p className="text-sm font-medium text-emerald-800">
              If an account exists for that email, we've sent password reset instructions.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to login
          </Link>
        </div>
      ) : (
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

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full"
            size="lg"
          >
            Send reset link
          </Button>
          
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
