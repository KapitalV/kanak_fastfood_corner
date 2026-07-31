"use client";

import { cn } from "@/utils/cn";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "overlay fixed inset-0 m-0 h-full w-full max-w-full bg-transparent p-4",
        "flex items-end sm:items-center justify-center",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "w-full rounded-2xl bg-white shadow-[var(--shadow-xl)] animate-slide-in-up sm:animate-scale-in",
          sizeMap[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
            <div>
              {title && (
                <h2 className="text-base font-bold text-stone-900">{title}</h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-stone-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </dialog>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            danger ? "bg-red-600 hover:bg-red-700" : "gradient-brand",
          )}
        >
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
