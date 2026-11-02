import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type ListingItem = {
  id: string;
  product_id: string;
  name: string;
  unit: string;
  price_type: 'fixed' | 'negotiable';
  price: number | null;
  currency: string;
  quantity: number | null;
  description: string | null;
  image_path: string | null;
  is_available: boolean;
};

export type ListingDetail = {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description: string;
  status: string;
  is_owner: boolean;
  category: { id: string; name: string; color: string; icon: string };
  place_name: string | null;
  lng: number;
  lat: number;
  location_precision_m: number;
  seller_name: string;
  seller_type: 'private' | 'farm' | 'company';
  pickup_available: boolean;
  delivery_available: boolean;
  updated_at: string;
  expires_at: string | null;
  items: ListingItem[];
  images: { path: string; is_main: boolean }[];
  contact: { phone: boolean; email: boolean; chat: boolean } | null;
};

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('listing_detail', { p_id: id as string });
      if (error) throw error;
      return (data as ListingDetail | null) ?? null;
    },
  });
}
