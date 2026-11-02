import { describe, expect, it } from 'vitest';

import { errorMessage } from './errors';
import { contactSettingsSchema, listingItemSchema } from './schemas';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('errorMessage', () => {
  it('tłumaczy błędy z prefiksem i parametrem', () => {
    expect(errorMessage({ message: 'max_items:10' })).toContain('10 pozycji');
    expect(errorMessage({ message: 'category_restricted:Trwa analiza' })).toContain('analiza');
  });
  it('ma bezpieczny komunikat domyślny', () => {
    expect(errorMessage(new Error('xyz'))).toBe('Coś poszło nie tak. Spróbuj ponownie.');
  });
});

describe('listingItemSchema', () => {
  const base = { productId: uuid, unitId: uuid, quantity: null, description: null };
  it('cena stała wymaga kwoty', () => {
    expect(listingItemSchema.safeParse({ ...base, priceType: 'fixed', price: null }).success).toBe(false);
    expect(listingItemSchema.safeParse({ ...base, priceType: 'fixed', price: 4.5 }).success).toBe(true);
  });
  it('„Do uzgodnienia” nie przyjmuje kwoty', () => {
    expect(listingItemSchema.safeParse({ ...base, priceType: 'negotiable', price: null }).success).toBe(true);
    expect(listingItemSchema.safeParse({ ...base, priceType: 'negotiable', price: 3 }).success).toBe(false);
  });
});

describe('contactSettingsSchema', () => {
  it('nie pozwala udostępnić pustego telefonu', () => {
    const r = contactSettingsSchema.safeParse({
      phone: null, email: null, sharePhone: true, shareEmail: false, allowChat: true,
    });
    expect(r.success).toBe(false);
  });
});
