import { MAP_QUERY_MAX_SPAN, POLAND_BOUNDS } from '@pzr/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Viewport = {
  bounds: [west: number, south: number, east: number, north: number];
  zoom: number;
};

const MARGIN = 0.5;

// Zapytanie zawsze ograniczone do Polski (z marginesem) i do limitu obszaru RPC.
function clampBounds([w, s, e, n]: Viewport['bounds']): Viewport['bounds'] {
  const west = Math.max(w, POLAND_BOUNDS.west - MARGIN);
  const south = Math.max(s, POLAND_BOUNDS.south - MARGIN);
  const east = Math.min(e, POLAND_BOUNDS.east + MARGIN, west + MAP_QUERY_MAX_SPAN.lng);
  const north = Math.min(n, POLAND_BOUNDS.north + MARGIN, south + MAP_QUERY_MAX_SPAN.lat);
  return [west, south, Math.max(east, west), Math.max(north, south)];
}

// Zaokrąglenie klucza: drobne przesunięcia mapy trafiają w cache zamiast w sieć.
const round = (v: number) => Math.round(v * 50) / 50;

export function useMapPoints(viewport: Viewport | null) {
  const bounds = viewport ? clampBounds(viewport.bounds) : null;
  const zoom = viewport ? Math.floor(viewport.zoom) : 0;
  return useQuery({
    queryKey: ['map_points', bounds?.map(round), zoom],
    enabled: bounds !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      if (!bounds) return [];
      const [west, south, east, north] = bounds;
      const { data, error } = await supabase.rpc('map_points', {
        p_west: west,
        p_south: south,
        p_east: east,
        p_north: north,
        p_zoom: zoom,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
