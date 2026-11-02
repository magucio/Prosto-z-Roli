// Limity muszą być zgodne z bazą (supabase/migrations) — baza jest źródłem prawdy, klient tylko je pokazuje.
export const LIMITS = {
  itemsPerListing: 10,
  imagesPerListing: 3,
  imagesPerItem: 1,
  imageMaxBytes: 2 * 1024 * 1024,
  imageMaxSidePx: 1600,
  imageJpegQuality: 0.75,
  listingValidityDays: 60,
  titleMin: 5,
  titleMax: 80,
  descriptionMax: 2000,
  itemDescriptionMax: 300,
  messageMax: 2000,
} as const;

// Publiczny punkt na mapie jest przybliżony do siatki 1 km.
export const LOCATION_PRECISION_M = 1000;

// Granice Polski używane do walidacji punktu (zgodne z triggerem listings_before_write).
export const POLAND_BOUNDS = { west: 14.0, south: 49.0, east: 24.2, north: 54.9 } as const;
export const POLAND_CENTER: [number, number] = [19.4, 52.05];
export const POLAND_ZOOM = 5.4;

// Maksymalny obszar jednego zapytania map_points (zgodny z RPC).
export const MAP_QUERY_MAX_SPAN = { lng: 20, lat: 12 } as const;
// Poniżej tego zoomu serwer zwraca gotowe klastry.
export const MAP_SERVER_CLUSTER_BELOW_ZOOM = 10;

export const STORAGE_BUCKET_LISTING_IMAGES = 'listing-images';
