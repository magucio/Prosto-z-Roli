# Prosto z Roli

Darmowy, lokalny marketplace rolniczy na Android (iOS później): mapa ofert z gospodarstw, czat, panel sprzedawcy i panel administratora.

Architektura, decyzje i ryzyka: dokument „Prosto z Roli — architektura systemu (Etap 1)” w Claude Docs.

## Stan prac

| Etap | Status |
| --- | --- |
| 1. Architektura i UI/UX | gotowe (dokument) |
| 2. Repozytorium i Supabase | gotowe — monorepo pnpm, Expo SDK 58, panel Next.js, CI i build APK w GitHub Actions |
| 3. Schemat bazy i RLS | gotowe — 4 migracje, słowniki, 38/38 testów bezpieczeństwa (`supabase/tests/security_smoke.sql`) |
| 5. Mapa i pinezki | częściowo — mapa MapLibre z danymi z `map_points`, klastry, lokalizacja, karta ogłoszenia |
| 4. Konta użytkowników | gotowe — rejestracja z kodem e-mail, logowanie, reset i zmiana hasła, dane konta/firmy, wylogowanie, usuwanie konta (Edge Function `account-delete`); test `tests/e2e-api/accounts.mjs` 15/15 |
| 6–12 | nie rozpoczęte |

## Struktura

```
apps/mobile          aplikacja Expo SDK 58 (Android, iOS później)
apps/admin           panel Next.js (VPS za Caddy) — szkielet
packages/shared      typy bazy, schematy Zod, limity, komunikaty błędów
packages/ui          design tokens (kolory jasne/ciemne, odstępy, typografia)
packages/config      wspólny tsconfig
supabase/migrations  migracje SQL (źródło prawdy dla bazy)
supabase/seed        słowniki: kategorie, jednostki, katalog
supabase/tests       testy RLS, limitów i wygasania
docs                 dokumentacja techniczna
```

## Jak zbudować APK

GitHub → zakładka **Actions** → **Android APK** → **Run workflow** (buduje się też sam po każdej zmianie w `apps/mobile` lub `packages`).
Po ok. 20–30 minutach plik APK jest w sekcji **Artifacts** uruchomienia. APK testowy jest podpisany kluczem debug.

## Lokalnie

```
pnpm install
pnpm typecheck && pnpm test
pnpm mobile          # serwer Expo (wymaga development builda — MapLibre nie działa w Expo Go)
```

## Supabase

- Projekt: `ojctjylqfcrdkcwzmfuo` (eu-west-1), plan Free na czas budowy — produkcja na Pro.
- Migracje stosowane w kolejności nazw plików. Słowniki: `supabase/seed/01_dictionaries.sql` (idempotentny).
- Test bezpieczeństwa: uruchom `supabase/tests/security_smoke.sql` w SQL Editorze — kończy się błędem
  `TEST_REPORT …` z wynikami i wycofuje wszystkie zmiany. Każda linia powinna zaczynać się od `ok`.
- Typy TypeScript: `npx supabase gen types typescript --project-id ojctjylqfcrdkcwzmfuo > packages/shared/src/database.types.ts`

## Sekrety

Nic poufnego nie trafia do repozytorium. Wartości publiczne są w `.env.example`.
Sekrety (np. `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`) trzymamy wyłącznie w GitHub → Settings → Secrets and variables → Actions.
