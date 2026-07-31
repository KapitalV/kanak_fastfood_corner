"use client";
/* eslint-disable react/no-unescaped-entities */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestaurantCardSkeleton } from "@/components/ui/skeleton";
import type { DbRestaurant } from "@/types/database";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Star, Clock, ArrowRight, Search, ChefHat } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["restaurants", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_approved", true)
        .order("avg_rating", { ascending: false });
      if (error) throw error;
      return data as DbRestaurant[];
    },
  });

  const { data: banners } = useQuery({
    queryKey: ["banners", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order").limit(4);
      if (error) throw error;
      return data as { id: string; title: string; subtitle: string | null; image_url: string; link_url: string | null }[];
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  const categories = [
    { name: "Pizza", icon: "🍕", bg: "bg-orange-100" },
    { name: "Burger", icon: "🍔", bg: "bg-amber-100" },
    { name: "Healthy", icon: "🥗", bg: "bg-emerald-100" },
    { name: "Dessert", icon: "🍰", bg: "bg-pink-100" },
    { name: "Indian", icon: "🍛", bg: "bg-purple-100" },
    { name: "Sushi", icon: "🍣", bg: "bg-blue-100" },
  ];

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-16 sm:px-12 sm:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 mix-blend-multiply" />
          <div 
            className="h-full w-full bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"
          />
        </div>
        
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <Badge variant="warning" className="mb-6 bg-orange-500/20 text-orange-200 border border-orange-500/30 px-4 py-1.5 text-sm backdrop-blur-md">
            Fastest Delivery in Town
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
            Hungry? <span className="text-orange-500">We've got you.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-stone-300">
            Order from the best local restaurants with easy, on-demand delivery.
            Fresh, hot, and right to your door.
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-10 flex max-w-md items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl">
            <div className="flex-1 flex items-center pl-3">
              <Search className="size-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search restaurants, dishes..."
                className="w-full border-0 bg-transparent px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="gradient-brand rounded-xl px-6 py-3 font-bold text-white shadow-[var(--shadow-brand)] transition hover:opacity-90"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {banners?.length ? <section className="grid gap-4 sm:grid-cols-2">{banners.map((banner) => <Link key={banner.id} href={banner.link_url ?? "/search"} className="group relative min-h-40 overflow-hidden rounded-2xl bg-stone-900 p-6"><Image src={banner.image_url} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover opacity-45 transition group-hover:scale-105" /><div className="relative z-10"><p className="text-2xl font-black text-white">{banner.title}</p>{banner.subtitle ? <p className="mt-1 text-sm font-medium text-white/80">{banner.subtitle}</p> : null}</div></Link>)}</section> : null}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-stone-900">Eat what makes you happy</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scroll-x">
          {categories.map((c) => (
            <button
              key={c.name}
              onClick={() => router.push(`/search?q=${c.name}`)}
              className="flex shrink-0 flex-col items-center gap-3 group"
            >
              <div className={`flex size-20 items-center justify-center rounded-full ${c.bg} shadow-sm transition-transform group-hover:-translate-y-1 group-hover:shadow-md`}>
                <span className="text-3xl">{c.icon}</span>
              </div>
              <span className="text-sm font-semibold text-stone-700 group-hover:text-stone-900">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Top Restaurants */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-stone-900">Top Rated Near You</h2>
          <Link href="/search" className="flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700">
            See all <ArrowRight className="size-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <RestaurantCardSkeleton key={i} />)}
          </div>
        ) : !restaurants?.length ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center">
            <ChefHat className="mx-auto size-12 text-stone-300" />
            <h3 className="mt-4 text-lg font-bold text-stone-900">No restaurants yet</h3>
            <p className="mt-1 text-stone-500">Check back soon for amazing food!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.slice(0, 6).map((restaurant) => (
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
                      <div className="rounded-lg bg-white/90 px-2 py-1 text-sm font-bold shadow-sm backdrop-blur text-stone-800">
                        <Clock className="inline mr-1 size-3.5 -mt-0.5" />
                        25-35 min
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
      </section>
    </div>
  );
}
