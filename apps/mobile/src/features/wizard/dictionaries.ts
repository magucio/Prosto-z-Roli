import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  name: string;
  kind: 'product' | 'service';
  color: string;
  icon: string;
  restriction_level: 'none' | 'analysis_pending' | 'blocked';
  restriction_message: string | null;
};

export type Unit = { id: string; code: string; name: string; short_name: string; kind: 'product' | 'service' };

export type CatalogEntry = {
  id: string;
  name: string;
  default_unit_id: string | null;
  categories: Pick<Category, 'name' | 'color' | 'kind' | 'restriction_level' | 'restriction_message'>;
};

export function useCategories(kind: 'product' | 'service') {
  return useQuery({
    queryKey: ['categories', kind],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,kind,color,icon,restriction_level,restriction_message')
        .eq('kind', kind)
        .neq('restriction_level', 'blocked')
        .order('sort');
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useUnits(kind: 'product' | 'service') {
  return useQuery({
    queryKey: ['units', kind],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_units')
        .select('id,code,name,short_name,kind')
        .eq('kind', kind)
        .order('sort');
      if (error) throw error;
      return data as Unit[];
    },
  });
}

const PL: Record<string, string> = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => PL[ch] ?? ch)
    .replace(/[%_\\]/g, '')
    .trim();
}

export function useCatalogSearch(kind: 'product' | 'service', query: string) {
  const q = normalize(query);
  return useQuery({
    queryKey: ['catalog', kind, q],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let req = supabase
        .from('product_catalog')
        .select('id,name,default_unit_id,categories!inner(name,color,kind,restriction_level,restriction_message)')
        .eq('categories.kind', kind)
        .neq('categories.restriction_level', 'blocked')
        .order('name')
        .limit(30);
      if (q) req = req.ilike('search_text', `%${q}%`);
      const { data, error } = await req;
      if (error) throw error;
      return data as unknown as CatalogEntry[];
    },
  });
}
