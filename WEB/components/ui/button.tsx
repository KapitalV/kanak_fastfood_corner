"use client";

import { cn } from "@/utils/cn";
import { type ComponentProps, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "gradient-brand text-white shadow-[var(--shadow-brand)] hover:opacity-90 active:scale-[0.98]",
  secondary:
    "bg-white text-stone-900 ring-1 ring-stone-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200",
  ghost:
    "bg-transparent text-stone-700 hover:bg-orange-50 hover:text-orange-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]",
  outline:
    "border-2 border-orange-500 text-orange-600 bg-transparent hover:bg-orange-50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Please wait…</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
