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

import { accountDataSchema, isValidNip, registerSchema } from './schemas';
import { authErrorMessage } from './errors';

describe('konta', () => {
  it('sprawdza sumę kontrolną NIP', () => {
    expect(isValidNip('5260250274')).toBe(true);
    expect(isValidNip('5260250275')).toBe(false);
  });
  it('rejestracja wymaga zgody i zgodnych haseł', () => {
    const base = { displayName: 'Jan', email: 'Jan@Example.pl', password: 'jablka123', passwordRepeat: 'jablka123', sellerType: 'farm' };
    expect(registerSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, passwordRepeat: 'inne1234', acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'krotkie', passwordRepeat: 'krotkie', acceptTerms: true }).success).toBe(false);
  });
  it('firma wymaga NIP i nazwy', () => {
    const r = accountDataSchema.safeParse({
      displayName: 'Firma', sellerType: 'company', farmName: '', companyName: '', nip: '', regon: '', addressLine: '', postalCode: '', city: '',
    });
    expect(r.success).toBe(false);
  });
  it('tłumaczy błędy logowania', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'x' })).toBe('Nieprawidłowy e-mail lub hasło.');
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe('Nieprawidłowy e-mail lub hasło.');
  });
});
