"use client";

import { cn } from "@/utils/cn";
import { forwardRef, type ComponentProps } from "react";

interface InputProps extends ComponentProps<"input"> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "input-base",
          error && "input-error",
          className,
        )}
        {...props}
      />
    );
  },
);

interface TextareaProps extends ComponentProps<"textarea"> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "input-base min-h-24 py-3 resize-none",
          error && "input-error",
          className,
        )}
        {...props}
      />
    );
  },
);

interface SelectProps extends ComponentProps<"select"> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, error, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "input-base cursor-pointer",
          error && "input-error",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  error,
  hint,
  children,
  required,
  id,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-stone-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-stone-500">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
