import type { SupabaseClient } from "@supabase/supabase-js";

export type PricingRepository = {
  load(input: {
    userId: string;
    addressId: string;
    productIds: string[];
    variantIds: string[];
    addonIds: string[];
    couponCode?: string;
  }): Promise<PricingData>;
};

export type PricingData = {
  address: Record<string, unknown> | null;
  products: Record<string, unknown>[];
  restaurants: Record<string, unknown>[];
  variants: Record<string, unknown>[];
  addons: Record<string, unknown>[];
  addonLinks: Record<string, unknown>[];
  coupon: Record<string, unknown> | null;
};

function requireData<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Pricing data query failed: ${error.message}`);
  return data;
}

export function createSupabasePricingRepository(client: SupabaseClient): PricingRepository {
  return {
    async load(input) {
      const [addressResult, productsResult, variantsResult, addonsResult, couponResult] = await Promise.all([
        client.from("addresses").select("id,user_id,full_address,flat_no,landmark,lat,lng,delivery_instructions").eq("id", input.addressId).eq("user_id", input.userId).maybeSingle(),
        client.from("products").select("id,restaurant_id,name,price,image_url,is_available").in("id", input.productIds),
        input.variantIds.length
          ? client.from("product_variants").select("id,product_id,name,price_delta,is_available").in("id", input.variantIds)
          : Promise.resolve({ data: [], error: null }),
        input.addonIds.length
          ? client.from("product_addons").select("id,restaurant_id,name,price,is_available").in("id", input.addonIds)
          : Promise.resolve({ data: [], error: null }),
        input.couponCode
          ? client.from("coupons").select("id,code,discount_type,discount_value,min_order_amount,max_discount,max_uses,used_count,valid_from,valid_until,restaurant_id,is_active").eq("code", input.couponCode.toUpperCase()).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const products = requireData(productsResult) ?? [];
      const restaurantIds = [...new Set(products.map((product) => String(product.restaurant_id)))];
      const [restaurantsResult, addonLinksResult] = await Promise.all([
        restaurantIds.length
          ? client.from("restaurants").select("id,name,delivery_fee,packaging_charge,min_order_amount,is_open,is_approved").in("id", restaurantIds)
          : Promise.resolve({ data: [], error: null }),
        input.variantIds.length && input.addonIds.length
          ? client.from("product_addon_links").select("product_variant_id,product_addon_id").in("product_variant_id", input.variantIds).in("product_addon_id", input.addonIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      return {
        address: requireData(addressResult),
        products,
        restaurants: requireData(restaurantsResult) ?? [],
        variants: requireData(variantsResult) ?? [],
        addons: requireData(addonsResult) ?? [],
        addonLinks: requireData(addonLinksResult) ?? [],
        coupon: requireData(couponResult),
      };
    },
  };
}
