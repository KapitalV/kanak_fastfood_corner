"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { Badge, VegBadge } from "@/components/ui/badge";
import { RestaurantCardSkeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import type { DbRestaurant } from "@/types/database";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MapPin, Star, Clock, Search, ChefHat } from "lucide-react";
import { Suspense, useState, useEffect } from "react";

// Quick debounce hook implementation included here for simplicity
function useLocalDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function SearchResultsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useLocalDebounce(query, 400);

  const [isVeg, setIsVeg] = useState(searchParams.get("veg") === "true");
  const [isOpen, setIsOpen] = useState(searchParams.get("open") === "true");

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (isVeg) params.set("veg", "true");
    if (isOpen) params.set("open", "true");
    
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, isVeg, isOpen, pathname, router]);

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["restaurants", "search", debouncedQuery, isVeg, isOpen],
    queryFn: async () => {
      let rQuery = supabase
        .from("restaurants")
        .select("*, products!inner(is_veg, name)")
        .eq("is_approved", true);

      if (isOpen) {
        rQuery = rQuery.eq("is_open", true);
      }
      
      if (isVeg) {
        // Only get restaurants that have at least one veg product
        rQuery = rQuery.eq("products.is_veg", true);
      }

      if (debouncedQuery) {
        // Search by restaurant name, cuisine, or product name
        const q = `%${debouncedQuery}%`;
        rQuery = rQuery.or(`name.ilike.${q},cuisine_type.ilike.${q},products.name.ilike.${q}`);
      }

      const { data, error } = await rQuery;
      if (error) throw error;

      // Deduplicate because joining products causes duplicate restaurant rows
      const uniqueRestaurants = Array.from(new Set(data.map((r) => r.id)))
        .map((id) => data.find((r) => r.id === id)!)
        .sort((a, b) => b.avg_rating - a.avg_rating);

      return uniqueRestaurants as DbRestaurant[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="sticky top-[73px] z-30 -mx-4 bg-[var(--bg)]/95 px-4 py-4 backdrop-blur-md sm:mx-0 sm:px-0 sm:pt-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for restaurants, cuisines, or dishes..."
              className="pl-11 h-12 text-base rounded-2xl bg-white shadow-[var(--shadow-sm)] border-stone-200"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto scroll-x pb-1 md:pb-0">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                isOpen 
                  ? "border-orange-500 bg-orange-50 text-orange-700" 
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <Clock className="size-4" />
              Open Now
            </button>
            <button
              onClick={() => setIsVeg(!isVeg)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                isVeg 
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <VegBadge isVeg={true} />
              Pure Veg / Veg Options
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-stone-900">
          {debouncedQuery ? `Search results for "${debouncedQuery}"` : "Explore Restaurants"}
          {restaurants ? ` (${restaurants.length})` : ""}
        </h2>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <RestaurantCardSkeleton key={i} />)}
          </div>
        ) : !restaurants?.length ? (
          <EmptyState
            icon={<Search />}
            title="No matches found"
            body="Try adjusting your search or filters to find what you're looking for."
            action={
              <button 
                onClick={() => { setQuery(""); setIsVeg(false); setIsOpen(false); }}
                className="text-orange-600 font-bold hover:underline"
              >
                Clear all filters
              </button>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Link key={restaurant.id} href={`/restaurants/${restaurant.id}`}>
                <Card hover className="h-full overflow-hidden flex flex-col group ring-0 border border-stone-100 shadow-[var(--shadow-xs)] hover:border-orange-200">
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                    {restaurant.image_url ? (
                      <Image
                        src={restaurant.image_url}
                        alt={restaurant.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-400">
                        <ChefHat className="size-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {!restaurant.is_open && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <Badge variant="danger" className="px-3 py-1.5 text-sm uppercase tracking-wider">
                          Closed
                        </Badge>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-sm font-bold shadow-sm backdrop-blur">
                        <Star className="size-4 fill-amber-500 text-amber-500" />
                        <span>{restaurant.avg_rating.toFixed(1)}</span>
                        <span className="text-stone-500 font-medium">({restaurant.total_reviews})</span>
                      </div>
                    </div>
                  </div>

                  <CardBody className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-stone-900 line-clamp-1">{restaurant.name}</h3>
                        <p className="mt-0.5 text-sm text-stone-500 line-clamp-1">
                          {restaurant.cuisine_type || "Various cuisines"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-4 text-stone-400" />
                        <span className="line-clamp-1">{restaurant.address}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="py-16 text-center text-sm text-stone-500">Loading search…</div>}><SearchResultsPage /></Suspense>;
}
