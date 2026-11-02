import { z } from 'zod';

import { LIMITS, POLAND_BOUNDS } from './constants';

// Walidacja po stronie klienta odzwierciedla ograniczenia bazy; baza i tak sprawdza wszystko ponownie.

export const pointSchema = z.object({
  lng: z.number().min(POLAND_BOUNDS.west).max(POLAND_BOUNDS.east),
  lat: z.number().min(POLAND_BOUNDS.south).max(POLAND_BOUNDS.north),
});

export const listingItemSchema = z
  .object({
    productId: z.uuid(),
    unitId: z.uuid(),
    priceType: z.enum(['fixed', 'negotiable']),
    price: z.number().positive().lt(1_000_000).nullable(),
    quantity: z.number().positive().nullable(),
    description: z.string().max(LIMITS.itemDescriptionMax).nullable(),
  })
  .refine((v) => (v.priceType === 'fixed' ? v.price !== null : v.price === null), {
    message: 'Podaj cenę albo wybierz „Do uzgodnienia”.',
    path: ['price'],
  });

export const listingDraftSchema = z.object({
  kind: z.enum(['product', 'service']),
  title: z.string().trim().min(LIMITS.titleMin).max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax),
  mainCategoryId: z.uuid(),
  sellerName: z.string().trim().min(2).max(60),
  location: pointSchema,
  addressText: z.string().trim().max(200).optional(),
  items: z.array(listingItemSchema).min(1).max(LIMITS.itemsPerListing),
});

export const contactSettingsSchema = z
  .object({
    phone: z
      .string()
      .regex(/^\+?[0-9 ]{9,16}$/, 'Podaj poprawny numer telefonu.')
      .nullable(),
    email: z.email('Podaj poprawny adres e-mail.').nullable(),
    sharePhone: z.boolean(),
    shareEmail: z.boolean(),
    allowChat: z.boolean(),
  })
  .refine((v) => !v.sharePhone || v.phone, { message: 'Podaj numer, aby go udostępnić.', path: ['phone'] })
  .refine((v) => !v.shareEmail || v.email, { message: 'Podaj e-mail, aby go udostępnić.', path: ['email'] });

export type ListingDraft = z.infer<typeof listingDraftSchema>;
export type ListingItemInput = z.infer<typeof listingItemSchema>;
export type ContactSettingsInput = z.infer<typeof contactSettingsSchema>;
