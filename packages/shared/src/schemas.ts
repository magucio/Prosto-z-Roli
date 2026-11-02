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

// ---------------------------------------------------------------- konta
export const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
  .max(72, 'Hasło może mieć najwyżej 72 znaki.')
  .regex(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/, 'Hasło musi zawierać literę.')
  .regex(/[0-9]/, 'Hasło musi zawierać cyfrę.');

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Podaj poprawny adres e-mail.'));

export const sellerTypeSchema = z.enum(['private', 'farm', 'company']);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Podaj hasło.'),
});

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Podaj co najmniej 2 znaki.').max(60),
    email: emailSchema,
    password: passwordSchema,
    passwordRepeat: z.string(),
    sellerType: sellerTypeSchema,
    acceptTerms: z.literal(true, { error: 'Zaakceptuj regulamin i politykę prywatności.' }),
  })
  .refine((v) => v.password === v.passwordRepeat, { message: 'Hasła się różnią.', path: ['passwordRepeat'] });

export const otpSchema = z.string().trim().regex(/^[0-9]{6,10}$/, 'Wpisz kod z e-maila (same cyfry).');

export const newPasswordSchema = z
  .object({ password: passwordSchema, passwordRepeat: z.string() })
  .refine((v) => v.password === v.passwordRepeat, { message: 'Hasła się różnią.', path: ['passwordRepeat'] });

// NIP: 10 cyfr z sumą kontrolną
export function isValidNip(nip: string): boolean {
  if (!/^[0-9]{10}$/.test(nip)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((acc, wi, i) => acc + wi * Number(nip[i]), 0);
  return sum % 11 === Number(nip[9]);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable();

export const accountDataSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Podaj co najmniej 2 znaki.').max(60),
    sellerType: sellerTypeSchema,
    farmName: optionalText(100),
    companyName: optionalText(150),
    nip: optionalText(10).refine((v) => v === null || isValidNip(v), 'Nieprawidłowy NIP.'),
    regon: optionalText(14).refine((v) => v === null || /^([0-9]{9}|[0-9]{14})$/.test(v), 'REGON ma 9 lub 14 cyfr.'),
    addressLine: optionalText(200),
    postalCode: optionalText(6).refine((v) => v === null || /^[0-9]{2}-[0-9]{3}$/.test(v), 'Kod w formacie 00-000.'),
    city: optionalText(100),
  })
  .refine((v) => v.sellerType !== 'company' || v.nip !== null, { message: 'Firma wymaga NIP.', path: ['nip'] })
  .refine((v) => v.sellerType !== 'company' || v.companyName !== null, {
    message: 'Podaj nazwę firmy.',
    path: ['companyName'],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type AccountDataInput = z.input<typeof accountDataSchema>;
export type AccountDataOutput = z.output<typeof accountDataSchema>;
