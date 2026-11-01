# Baza danych — Prosto z Roli

Stan: 1 listopada 2026. Projekt Supabase `ojctjylqfcrdkcwzmfuo`.

## Zasady bezpieczeństwa

- RLS włączone na każdej tabeli w `public`. Helpery i liczniki limitów żyją w schemacie `private`, którego API nie wystawia.
- Klient zapisuje wyłącznie kolumny, na które ma `GRANT`. `status`, `expires_at`, `confirmed_at`, `delivery_available`
  zmieniają tylko funkcje RPC (`publish_listing`, `confirm_listing`, `pause_listing`, `remove_listing`, `admin_*`).
- Dokładna lokalizacja (`location_exact`) i adres (`address_text`) nie mają `GRANT SELECT` dla żadnej roli klienta.
  Właściciel czyta je przez `my_listing(id)`.
- Publiczny punkt na mapie (`location_public`) = środek komórki siatki 1 km w PUWG 1992 (EPSG:2180), liczony triggerem.
- Telefon i e-mail: tabela `listing_contact_settings` bez dostępu dla anonimów; zalogowani przez `reveal_contact`
  (zgoda sprzedawcy, blokady, limit 30/dobę, log w `contact_reveals`).
- Funkcje admina wymagają roli w `admin_roles` **i** sesji po 2FA (`aal2` w JWT).
- Mięso, nabiał, jaja, miód: `restriction_level = analysis_pending` — publikacja blokowana w triggerach i w `publish_listing`.

## Limity (egzekwowane w bazie)

| Co | Limit |
| --- | --- |
| Pozycje w ogłoszeniu | 10 (blokada wiersza rodzica — odporne na równoległe żądania) |
| Zdjęcia ogłoszenia | 3 (+ 1 na pozycję w `listing_products.image_path`), plik maks. 2 MB, JPEG/WebP |
| Publikacje / reaktywacje | 10 na dobę |
| Nowe rozmowy | 10 na dobę |
| Wiadomości | 30 na 10 minut |
| Odsłonięcia kontaktu | 30 na dobę |
| Zgłoszenia | 20 na dobę |
| Obszar zapytania mapy | maks. 20° × 12° |

## Wygasanie

`expires_at` = 60 dni od publikacji lub potwierdzenia. Polityka RLS i `map_points` sprawdzają `expires_at > now()`,
więc ogłoszenie znika publicznie dokładnie w terminie. `pg_cron` (`expire-listings`, co godzinę o :07) przestawia status na `expired`.

## Do zrobienia w kolejnych etapach

- Import miejscowości (TERYT SIMC + PRG) do `places` — etap 5.
- Edge Functions: `push-dispatch`, `expiry-notifier` (7 dni / 1 dzień), `image-verify`, `account-delete` — etapy 6, 8, 9.
- Usunięcie nieużywanej tabeli `private.rate_counters` (zastąpiona przez `private.rate_limits`).
- Drobne optymalizacje z doradcy wydajności (indeksy na 4 kluczach obcych, rozdzielenie polityk SELECT/ALL).
