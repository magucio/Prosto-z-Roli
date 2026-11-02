// Tłumaczenie błędów zgłaszanych przez bazę (RAISE EXCEPTION w RPC/triggerach) na komunikaty dla użytkownika.
const MESSAGES: Record<string, string> = {
  auth_required: 'Zaloguj się, aby kontynuować.',
  account_blocked: 'Twoje konto jest zablokowane. Skontaktuj się z pomocą.',
  not_found: 'Nie znaleziono ogłoszenia lub nie jest już dostępne.',
  not_found_or_not_active: 'To ogłoszenie nie jest aktywne.',
  max_items: 'Ogłoszenie może zawierać maksymalnie 10 pozycji.',
  max_images: 'Możesz dodać maksymalnie 3 zdjęcia do ogłoszenia.',
  category_restricted:
    'Dodawanie ogłoszeń w tej kategorii jest chwilowo niedostępne — trwa analiza przepisów.',
  category_kind_mismatch: 'Wybrana kategoria nie pasuje do rodzaju ogłoszenia.',
  product_kind_mismatch: 'Ta pozycja nie pasuje do rodzaju ogłoszenia.',
  unit_kind_mismatch: 'Ta jednostka nie pasuje do rodzaju ogłoszenia.',
  location_outside_poland: 'Wskaż punkt na terenie Polski.',
  blocked_words: 'Tekst zawiera niedozwolone słowa. Popraw treść i spróbuj ponownie.',
  no_items: 'Dodaj co najmniej jedną pozycję do ogłoszenia.',
  company_nip_required: 'Konto firmowe wymaga podania numeru NIP w danych sprzedawcy.',
  rate_limit: 'Wykonano zbyt wiele prób. Spróbuj ponownie później.',
  blocked: 'Nie możesz kontaktować się z tym użytkownikiem.',
  not_shared: 'Sprzedawca nie udostępnia tych danych.',
  chat_disabled: 'Sprzedawca wyłączył wiadomości dla tego ogłoszenia.',
  own_listing: 'To Twoje ogłoszenie.',
  bbox_too_large: 'Przybliż mapę, aby zobaczyć oferty.',
  admin_required: 'Brak uprawnień administratora (wymagane logowanie z 2FA).',
};

export function errorMessage(error: unknown): string {
  const raw =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');
  const key = raw.split(':')[0]?.trim() ?? '';
  return MESSAGES[key] ?? 'Coś poszło nie tak. Spróbuj ponownie.';
}

// Błędy Supabase Auth (pole `code` w AuthApiError).
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Nieprawidłowy e-mail lub hasło.',
  email_not_confirmed: 'Potwierdź adres e-mail kodem z wiadomości.',
  user_already_exists: 'Konto z tym adresem już istnieje. Zaloguj się.',
  email_exists: 'Konto z tym adresem już istnieje. Zaloguj się.',
  otp_expired: 'Kod wygasł lub jest nieprawidłowy. Wyślij nowy kod.',
  over_email_send_rate_limit: 'Wysłaliśmy już wiadomość. Odczekaj chwilę przed kolejną próbą.',
  over_request_rate_limit: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
  weak_password: 'Hasło jest zbyt słabe. Użyj co najmniej 8 znaków, litery i cyfry.',
  same_password: 'Nowe hasło musi się różnić od obecnego.',
  email_address_not_authorized: 'Nie możemy teraz wysłać wiadomości na ten adres. Spróbuj później.',
  email_address_invalid: 'Podaj poprawny adres e-mail.',
  signup_disabled: 'Rejestracja jest chwilowo wyłączona.',
  user_banned: 'To konto jest zablokowane.',
  reauthentication_needed: 'Zaloguj się ponownie, aby zmienić hasło.',
  invalid_password: 'Nieprawidłowe hasło.',
  unexpected_failure: 'Nie udało się wysłać e-maila z kodem. Spróbuj ponownie za kilka minut.',
};

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  const raw = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : '';
  if (/invalid login credentials/i.test(raw)) return AUTH_MESSAGES.invalid_credentials!;
  if (/email not confirmed/i.test(raw)) return AUTH_MESSAGES.email_not_confirmed!;
  if (AUTH_MESSAGES[raw]) return AUTH_MESSAGES[raw]!;
  return errorMessage(error);
}
