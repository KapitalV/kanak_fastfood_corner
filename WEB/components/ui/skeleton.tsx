import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function RestaurantCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)] ring-1 ring-stone-100">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-3 shadow-[var(--shadow-sm)] ring-1 ring-stone-100">
      <Skeleton className="size-24 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-1 h-4 w-1/4" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)] ring-1 ring-stone-100 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}
