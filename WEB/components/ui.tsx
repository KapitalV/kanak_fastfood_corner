import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-orange-600 text-white shadow-sm hover:bg-orange-700",
    secondary: "bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-orange-50 hover:text-orange-700",
    ghost: "bg-transparent text-zinc-700 hover:bg-orange-50 hover:text-orange-700",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  className = "",
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonProps["variant"] }) {
  const styles = {
    primary: "bg-orange-600 text-white shadow-sm hover:bg-orange-700",
    secondary: "bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-orange-50 hover:text-orange-700",
    ghost: "bg-transparent text-zinc-700 hover:bg-orange-50 hover:text-orange-700",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
  };

  return (
    <Link
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-800">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-100";

export function StatusBadge({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  const tone =
    value === "open" || value === "delivered" || value === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : value === "closed" || value === "cancelled" || value === "failed"
        ? "bg-rose-100 text-rose-800"
        : "bg-orange-100 text-orange-800";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${tone}`}>
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
