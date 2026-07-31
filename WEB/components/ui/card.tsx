import { cn } from "@/utils/cn";

export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-[var(--shadow-sm)] ring-1 ring-stone-100",
        hover && "card-hover cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-stone-100 px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-t border-stone-100 bg-stone-50 px-5 py-3 rounded-b-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-100 bg-white p-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-orange-50 text-orange-400">
          {icon}
        </div>
      )}
      <p className="text-lg font-bold text-stone-800">{title}</p>
      {body && (
        <p className="mt-1.5 max-w-xs text-sm text-stone-500">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = "orange",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: "orange" | "emerald" | "blue" | "purple";
}) {
  const colorMap = {
    orange: "bg-orange-50 text-orange-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-stone-900">{value}</p>
          {trend && (
            <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              colorMap[color],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
