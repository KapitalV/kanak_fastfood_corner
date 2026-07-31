import { getRestaurant, listApprovedRestaurants } from "@/repositories/restaurants.repo";

export { getRestaurant, listApprovedRestaurants };

export function matchesRestaurantSearch(name: string, cuisine: string | null, query: string) {
  const haystack = `${name} ${cuisine ?? ""}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}
