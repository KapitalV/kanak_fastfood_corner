"use client";
/* eslint-disable react/no-unescaped-entities */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/features/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Badge, VegBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbRestaurant, DbProduct, DbReview } from "@/types/database";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, Star, Clock, Info, Minus, Plus, ChefHat, Bike } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/utils/format";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lines, addProduct, updateQuantity, removeLine } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const { data: restaurant, isLoading: isLoadingRest } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as DbRestaurant;
    },
  });

  const { data: products, isLoading: isLoadingProd } = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", id)
        .eq("is_available", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as DbProduct[];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["restaurant-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*, profiles(name,avatar_url)").eq("restaurant_id", id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as (DbReview & { profiles?: { name: string; avatar_url: string | null } | null })[];
    },
  });

  const categories = useMemo(() => {
    if (!products) return ["All"];
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === "All") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  if (isLoadingRest) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Restaurant not found</h1>
        <Button onClick={() => router.push("/")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 shadow-[var(--shadow-md)]">
        <div className="absolute inset-0 opacity-40">
          {restaurant.image_url ? (
            <Image
              src={restaurant.image_url}
              alt={restaurant.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-stone-800">
              <ChefHat className="size-24 text-stone-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 pt-32 sm:pt-40">
          {!restaurant.is_open && (
            <Badge variant="danger" className="mb-4">
              Currently Closed
            </Badge>
          )}
          <h1 className="text-3xl font-black text-white sm:text-5xl">{restaurant.name}</h1>
          <p className="mt-2 text-lg font-medium text-stone-300">
            {restaurant.cuisine_type || "Various cuisines"}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-white">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 backdrop-blur-md">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              <span>{restaurant.avg_rating.toFixed(1)}</span>
              <span className="font-normal text-white/70">({restaurant.total_reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 backdrop-blur-md">
              <Clock className="size-4 text-emerald-400" />
              <span>25-35 mins</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 backdrop-blur-md">
              <Bike className="size-4 text-blue-400" />
              <span>{formatCurrency(restaurant.delivery_fee)} Delivery</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Menu Section */}
        <div>
          {/* Category Tabs */}
          <div className="sticky top-[60px] z-20 -mx-4 mb-6 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-md sm:mx-0 sm:px-0">
            <div className="flex gap-2 overflow-x-auto pb-2 scroll-x">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                    activeCategory === cat
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-600 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product List */}
          {isLoadingProd ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            </div>
          ) : !products?.length ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 p-12 text-center">
              <Info className="mx-auto size-12 text-stone-300" />
              <h3 className="mt-4 text-lg font-bold text-stone-900">Menu coming soon</h3>
              <p className="mt-1 text-stone-500">This restaurant hasn't added any items yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProducts.map((product) => {
                const cartLine = lines.find((l) => l.productId === product.id);
                const quantity = cartLine?.quantity || 0;

                return (
                  <Card key={product.id} className="flex overflow-hidden">
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <VegBadge isVeg={product.is_veg} />
                          {product.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                              {product.category}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-stone-900 line-clamp-2">{product.name}</h3>
                        <p className="mt-1 font-black text-stone-900">
                          {formatCurrency(product.price)}
                        </p>
                        {product.description && (
                          <p className="mt-1.5 text-xs font-medium text-stone-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center">
                        {quantity > 0 ? (
                          <div className="flex h-9 items-center rounded-xl bg-orange-50 ring-1 ring-orange-200">
                            <button
                              onClick={() => quantity === 1 ? removeLine(product.id) : updateQuantity(product.id, quantity - 1)}
                              className="flex size-9 items-center justify-center text-orange-600 hover:bg-orange-100 rounded-l-xl transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="w-8 text-center font-bold text-orange-700">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="flex size-9 items-center justify-center text-orange-600 hover:bg-orange-100 rounded-r-xl transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-orange-50/50"
                            onClick={() => addProduct(product, restaurant)}
                            disabled={!restaurant.is_open}
                          >
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {product.image_url && (
                      <div className="relative h-32 w-32 shrink-0 sm:h-40 sm:w-40">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 128px, 160px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Cart / Info Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px] space-y-6">
            <Card>
              <CardBody>
                <h3 className="font-bold text-stone-900 mb-4">About Restaurant</h3>
                <div className="space-y-3 text-sm text-stone-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-stone-400 shrink-0 mt-0.5" />
                    <p>{restaurant.address}</p>
                  </div>
                  {restaurant.description && (
                    <div className="flex items-start gap-2">
                      <Info className="size-4 text-stone-400 shrink-0 mt-0.5" />
                      <p>{restaurant.description}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {lines.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50 ring-0">
                <CardBody>
                  <h3 className="font-bold text-stone-900 mb-2">Your Order</h3>
                  <p className="text-sm text-stone-600 mb-4">
                    {lines.reduce((a, b) => a + b.quantity, 0)} items from {lines[0]?.restaurantName}
                  </p>
                  <Button className="w-full" onClick={() => router.push("/cart")}>
                    View Cart
                  </Button>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-orange-600">Guest feedback</p><h2 className="mt-1 text-2xl font-black text-stone-900">What customers say</h2></div><span className="text-sm text-stone-500">{reviews?.length ?? 0} reviews</span></div>
        {reviews?.length ? <div className="grid gap-4 md:grid-cols-2">{reviews.map((review) => <Card key={review.id}><CardBody><div className="flex items-center justify-between gap-3"><p className="font-bold text-stone-900">{review.profiles?.name ?? "Customer"}</p><span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star className="size-4 fill-amber-400" /> {review.restaurant_rating}/5</span></div>{review.comment ? <p className="mt-3 text-sm leading-6 text-stone-600">{review.comment}</p> : null}{review.restaurant_reply ? <div className="mt-4 rounded-xl bg-orange-50 p-3 text-sm"><p className="font-bold text-orange-700">Restaurant reply</p><p className="mt-1 text-stone-600">{review.restaurant_reply}</p></div> : null}</CardBody></Card>)}</div> : <Card><CardBody><p className="text-sm text-stone-500">No reviews yet. Be the first to share your experience after delivery.</p></CardBody></Card>}
      </section>
    </div>
  );
}
