"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/database";
import { Eye, EyeOff, Lock, Mail, Phone, User, ChefHat } from "lucide-react";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["customer", "store", "delivery"] as const),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "customer" },
  });

  async function onSubmit(values: FormValues) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toastError("Registration failed", error.message);
      return;
    }

    if (!data.user) {
      success("Check your email", "We sent a confirmation link. Please verify before logging in.");
      router.push("/login");
      return;
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name: values.name,
      phone: values.phone || null,
      email: values.email,
      role: values.role as UserRole,
    });

    if (profileError) {
      toastError("Profile setup failed", profileError.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    success("Account created!", "Welcome to Kanak Foods.");

    const redirect =
      values.role === "store"
        ? "/store"
        : values.role === "delivery"
        ? "/delivery"
        : "/";
    router.push(redirect);
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[var(--shadow-lg)] ring-1 ring-stone-100">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[var(--shadow-brand)]">
          <ChefHat className="size-6" />
        </div>
        <h1 className="text-2xl font-black text-stone-900">Create account</h1>
        <p className="mt-1 text-sm text-stone-500">
          Join Kanak Foods today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name?.message} required id="name">
          <div className="relative">
            <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="name"
              placeholder="Rahul Sharma"
              autoComplete="name"
              className="pl-10"
              error={!!errors.name}
              {...register("name")}
            />
          </div>
        </Field>

        <Field label="Email address" error={errors.email?.message} required id="reg-email">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="pl-10"
              error={!!errors.email}
              {...register("email")}
            />
          </div>
        </Field>

        <Field label="Mobile number" error={errors.phone?.message} id="phone" hint="Optional — for order updates">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="9876543210"
              autoComplete="tel"
              className="pl-10"
              error={!!errors.phone}
              {...register("phone")}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" error={errors.password?.message} required id="reg-password">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                id="reg-password"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword?.message} required id="confirm-password">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                aria-label="Toggle confirm password"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>

        <Field label="I am signing up as" error={errors.role?.message} required id="role">
          <Select id="role" {...register("role")}>
            <option value="customer">Customer — order food</option>
            <option value="store">Restaurant Owner — manage my store</option>
            <option value="delivery">Delivery Partner — earn by delivering</option>
          </Select>
        </Field>

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
          size="lg"
        >
          Create account
        </Button>

        <p className="text-center text-xs text-stone-400">
          By signing up you agree to our{" "}
          <a href="#" className="underline hover:text-stone-600">Terms</a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-stone-600">Privacy Policy</a>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:text-orange-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
