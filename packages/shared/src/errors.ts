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
