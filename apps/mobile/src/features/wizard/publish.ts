import { STORAGE_BUCKET_LISTING_IMAGES } from '@pzr/shared';
import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

import { hasExif } from './images';
import { parseDecimal, useDraft, type Draft } from './store';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const fail = (error: unknown): never => {
  throw error;
};

/**
 * Zapisuje szkic w bazie i publikuje go. Każdy krok jest powtarzalny: przy ponownej próbie
 * aktualizuje istniejący szkic, nie wysyła drugi raz tych samych zdjęć.
 */
export async function publishDraft(d: Draft): Promise<{ id: string; status: string }> {
  const store = useDraft.getState();
  if (!d.location || !d.mainCategoryId) throw new Error('incomplete');
  const point = `SRID=4326;POINT(${d.location.lng} ${d.location.lat})`;
  const fields = {
    title: d.title.trim(),
    description: d.description.trim(),
    main_category_id: d.mainCategoryId,
    seller_name: d.sellerName.trim(),
    location_exact: point,
    address_text: d.addressText.trim() || null,
    place_name: d.placeName.trim() || null,
    pickup_available: d.pickup,
  };

  // 1. Szkic ogłoszenia
  let listingId = d.listingId;
  if (listingId) {
    const { error } = await supabase.from('listings').update(fields).eq('id', listingId);
    if (error) fail(error);
  } else {
    const { data, error } = await supabase
      .from('listings')
      .insert({ ...fields, listing_kind: d.kind })
      .select('id')
      .single();
    if (error || !data) fail(error);
    listingId = data!.id;
    store.set({ listingId });
  }
  const id = listingId as string;

  // 2. Pozycje: zastąpienie całej listy (prosto i powtarzalnie)
  {
    const { error: delError } = await supabase.from('listing_products').delete().eq('listing_id', id);
    if (delError) fail(delError);
    const rows = d.items.map((it, index) => ({
      listing_id: id,
      product_id: it.productId,
      unit_id: it.unitId,
      price_type: it.priceType,
      price: it.priceType === 'fixed' ? parseDecimal(it.price) : null,
      quantity: parseDecimal(it.quantity),
      description: it.description.trim() || null,
      sort: index,
    }));
    const { error } = await supabase.from('listing_products').insert(rows);
    if (error) fail(error);
  }

  // 3. Zdjęcia: wysłanie brakujących i rejestracja w listing_images
  let images = [...d.images];
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    let path = img.storagePath;
    if (!path) {
      const bytes = new Uint8Array(await new File(img.uri).arrayBuffer());
      if (hasExif(bytes)) throw new Error('image_has_exif');
      path = `listings/${id}/${uuid()}.jpg`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET_LISTING_IMAGES)
        .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
      if (error) fail(error);
      images = images.map((x) => (x.key === img.key ? { ...x, storagePath: path } : x));
      store.set({ images });
    }
    if (!img.registered) {
      const { error } = await supabase.from('listing_images').insert({
        listing_id: id,
        storage_path: path,
        is_main: i === 0,
        sort: i,
        width: img.width,
        height: img.height,
      });
      if (error && error.code !== '23505') fail(error);
      images = images.map((x) => (x.key === img.key ? { ...x, registered: true } : x));
      store.set({ images });
    }
  }

  // 4. Kontakt (wiersz zakłada trigger przy tworzeniu ogłoszenia)
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
      .eq('listing_id', id);
    if (error) fail(error);
  }

  // 5. Publikacja — serwer sprawdza kategorie, filtr słów, limity i ustawia termin 60 dni
  const { data: status, error } = await supabase.rpc('publish_listing', { p_id: id });
  if (error) fail(error);
  return { id, status: String(status) };
}
