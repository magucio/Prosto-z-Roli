import { STORAGE_BUCKET_LISTING_IMAGES } from '@pzr/shared';
import { File } from 'expo-file-system';
import type { StoreApi } from 'zustand';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { hasExif } from './images';
import { parseDecimal, type DraftImage, type DraftStore } from './store';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function check(error: unknown) {
  if (error) throw error;
}

export function publicImageUrl(path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_LISTING_IMAGES}/${path}`;
}

/**
 * Zapisuje szkic w bazie. `publish = true` dodatkowo publikuje (nowe ogłoszenie).
 * Każdy krok jest powtarzalny: ponowna próba aktualizuje ten sam szkic i nie wysyła zdjęć drugi raz.
 */
export async function saveDraft(api: StoreApi<DraftStore>, publish: boolean): Promise<{ id: string; status: string | null }> {
  const d = api.getState();
  if (!d.location || !d.mainCategoryId) throw new Error('incomplete');
  const fields = {
    title: d.title.trim(),
    description: d.description.trim(),
    main_category_id: d.mainCategoryId,
    seller_name: d.sellerName.trim(),
    location_exact: `SRID=4326;POINT(${d.location.lng} ${d.location.lat})`,
    address_text: d.addressText.trim() || null,
    place_name: d.placeName.trim() || null,
    pickup_available: d.pickup,
  };

  // 1. Ogłoszenie
  let id = d.listingId;
  if (id) {
    const { error } = await supabase.from('listings').update(fields).eq('id', id);
    check(error);
  } else {
    const { data, error } = await supabase.from('listings').insert({ ...fields, listing_kind: d.kind }).select('id').single();
    check(error);
    id = data!.id;
    api.getState().set({ listingId: id });
  }
  const listingId = id as string;

  // 2. Pozycje: zastąpienie całej listy
  {
    const { error: delError } = await supabase.from('listing_products').delete().eq('listing_id', listingId);
    check(delError);
    const { error } = await supabase.from('listing_products').insert(
      d.items.map((it, index) => ({
        listing_id: listingId,
        product_id: it.productId,
        unit_id: it.unitId,
        price_type: it.priceType,
        price: it.priceType === 'fixed' ? parseDecimal(it.price) : null,
        quantity: parseDecimal(it.quantity),
        description: it.description.trim() || null,
        sort: index,
      })),
    );
    check(error);
  }

  // 3. Zdjęcia: wysłanie nowych plików, potem zastąpienie listy wierszy (kolejność = zdjęcie główne)
  let images: DraftImage[] = [...api.getState().images];
  for (const img of images) {
    if (img.storagePath) continue;
    const bytes = new Uint8Array(await new File(img.uri).arrayBuffer());
    if (hasExif(bytes)) throw new Error('image_has_exif');
    const path = `listings/${listingId}/${uuid()}.jpg`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET_LISTING_IMAGES)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    check(error);
    images = images.map((x) => (x.key === img.key ? { ...x, storagePath: path } : x));
    api.getState().set({ images });
  }
  {
    const { error: delError } = await supabase.from('listing_images').delete().eq('listing_id', listingId);
    check(delError);
    if (images.length > 0) {
      const { error } = await supabase.from('listing_images').insert(
        images.map((img, i) => ({
          listing_id: listingId,
          storage_path: img.storagePath as string,
          is_main: i === 0,
          sort: i,
          width: img.width || null,
          height: img.height || null,
        })),
      );
      check(error);
    }
    // pliki usunięte przez użytkownika w edycji
    const kept = new Set(images.map((i) => i.storagePath));
    const removed = api.getState().originalImagePaths.filter((p) => !kept.has(p));
    if (removed.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET_LISTING_IMAGES).remove(removed);
    }
    api.getState().set({ originalImagePaths: images.map((i) => i.storagePath as string) });
  }

  // 4. Kontakt
  {
    const { error } = await supabase
      .from('listing_contact_settings')
      .update({
        phone: d.phone.trim() || null,
        email: d.email.trim() || null,
        share_phone: d.sharePhone,
        share_email: d.shareEmail,
        allow_chat: d.allowChat,
      })
      .eq('listing_id', listingId);
    check(error);
  }

  // 5. Publikacja (serwer sprawdza kategorie, filtr słów, limity i ustawia termin 60 dni)
  if (!publish) return { id: listingId, status: null };
  const { data: status, error } = await supabase.rpc('publish_listing', { p_id: listingId });
  check(error);
  return { id: listingId, status: String(status) };
}

type MyListing = {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description: string;
  status: string;
  category: { id: string };
  place_name: string | null;
  seller_name: string;
  pickup_available: boolean;
  exact_lng: number;
  exact_lat: number;
  address_text: string | null;
  items: {
    id: string;
    product_id: string;
    name: string;
    unit_id: string;
    unit: string;
    price_type: 'fixed' | 'negotiable';
    price: number | null;
    quantity: number | null;
    description: string | null;
  }[];
  images: { path: string; width: number | null; height: number | null }[];
  contact_settings: { phone: string | null; email: string | null; share_phone: boolean; share_email: boolean; allow_chat: boolean } | null;
};

const num = (v: number | null) => (v === null || v === undefined ? '' : String(v).replace('.', ','));

// Wczytuje ogłoszenie właściciela (z dokładną lokalizacją i adresem) do szkicu edycji.
export async function loadForEdit(api: StoreApi<DraftStore>, listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('my_listing', { p_id: listingId });
  check(error);
  const l = data as MyListing | null;
  if (!l) throw new Error('not_found');
  const cs = l.contact_settings;
  api.getState().reset();
  api.getState().set({
    step: 1,
    listingId: l.id,
    kind: l.kind,
    location: { lng: l.exact_lng, lat: l.exact_lat },
    placeName: l.place_name ?? '',
    addressText: l.address_text ?? '',
    title: l.title,
    description: l.description,
    mainCategoryId: l.category.id,
    sellerName: l.seller_name,
    pickup: l.pickup_available,
    items: l.items.map((it) => ({
      key: it.id,
      productId: it.product_id,
      productName: it.name,
      unitId: it.unit_id,
      unitShort: it.unit,
      priceType: it.price_type,
      price: num(it.price),
      quantity: num(it.quantity),
      description: it.description ?? '',
    })),
    images: l.images.map((img) => ({
      key: img.path,
      uri: publicImageUrl(img.path),
      width: img.width ?? 0,
      height: img.height ?? 0,
      bytes: 0,
      storagePath: img.path,
    })),
    originalImagePaths: l.images.map((img) => img.path),
    phone: cs?.phone ?? '',
    email: cs?.email ?? '',
    sharePhone: cs?.share_phone ?? false,
    shareEmail: cs?.share_email ?? false,
    allowChat: cs?.allow_chat ?? true,
    locationAck: true,
  });
  return l.status;
}
