"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, inputClass } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/types";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().min(8, "Enter a phone number").optional().or(z.literal("")),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Use at least 6 characters"),
  role: z.enum(["customer", "store", "delivery"]),
});

type FormValues = z.infer<typeof schema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "customer",
    },
  });

  async function onSubmit(values: FormValues) {
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        if (!data.user) {
          setMessage("Check your email to finish signup, then login.");
          return;
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          name: values.name,
          phone: values.phone || null,
          role: values.role as Role,
        });
        if (profileError) throw profileError;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").upsert(
            {
              id: data.user.id,
              name: values.name,
              phone: values.phone || null,
              role: values.role as Role,
            },
            { onConflict: "id" },
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      const target =
        values.role === "store"
          ? "/store"
          : values.role === "delivery"
            ? "/delivery"
            : "/";
      router.push(target);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
      <h1 className="text-2xl font-bold text-zinc-950">
        {mode === "login" ? "Login" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Choose a role to test customer, store, and delivery workflows.
      </p>
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Name" error={errors.name?.message}>
          <input className={inputClass} {...register("name")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className={inputClass} {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input className={inputClass} type="email" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            className={inputClass}
            type="password"
            {...register("password")}
          />
        </Field>
        <Field label="Role" error={errors.role?.message}>
          <select className={inputClass} {...register("role")}>
            <option value="customer">Customer</option>
            <option value="store">Store</option>
            <option value="delivery">Delivery boy</option>
          </select>
        </Field>
        {message ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
        </Button>
      </form>
      <button
        className="mt-4 text-sm font-semibold text-emerald-800"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Need an account?" : "Already have an account?"}
      </button>
    </div>
  );
}
