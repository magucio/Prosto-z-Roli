// Wartości publiczne (wkompilowane w aplikację). Domyślne = projekt produkcyjny; nadpisz przez EXPO_PUBLIC_*.
// Klucz publishable jest jawny z założenia — bezpieczeństwo zapewnia RLS w bazie.
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ojctjylqfcrdkcwzmfuo.supabase.co',
  supabaseKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_oKV-AWbBp9QiaOWNKGpQHw_K0zTHPpO',
  mapStyleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',
} as const;
