import { cn } from "@/utils/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

const variants: Record<BadgeVariant, string> = {
  default: "bg-stone-100 text-stone-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger:  "bg-red-100 text-red-800",
  info:    "bg-blue-100 text-blue-800",
  purple:  "bg-purple-100 text-purple-800",
};

function getOrderStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    placed:     "warning",
    accepted:   "info",
    preparing:  "warning",
    ready:      "info",
    assigned:   "purple",
    picked:     "purple",
    in_transit: "info",
    delivered:  "success",
    cancelled:  "danger",
    open:       "success",
    closed:     "danger",
    paid:       "success",
    failed:     "danger",
    pending:    "warning",
    cod:        "default",
    refunded:   "info",
  };
  return map[status] ?? "default";
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const label = value.replaceAll("_", " ");
  const variant = getOrderStatusVariant(value);
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-sm border-2",
        isVeg ? "border-emerald-600" : "border-red-600",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isVeg ? "bg-emerald-600" : "bg-red-600",
        )}
      />
    </span>
  );
}
