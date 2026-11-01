# Prosto z Roli

Darmowy, lokalny marketplace rolniczy na Android (iOS później): mapa ofert z gospodarstw, czat, panel sprzedawcy i panel administratora.

Architektura, decyzje i ryzyka: dokument „Prosto z Roli — architektura systemu (Etap 1)” w Claude Docs.

## Stan prac

| Etap | Status |
| --- | --- |
| 1. Architektura i UI/UX | gotowe (dokument) |
| 2. Repozytorium i Supabase | w toku — projekt Supabase gotowy, szkielet aplikacji czeka na dostęp do npm |
| 3. Schemat bazy i RLS | gotowe — 4 migracje, słowniki, 38/38 testów bezpieczeństwa (`supabase/tests/security_smoke.sql`) |
| 4–12 | nie rozpoczęte |

## Struktura

```
apps/mobile          aplikacja Expo (Android, iOS później)        — do utworzenia
apps/admin           panel Next.js (VPS za Caddy)                 — do utworzenia
packages/shared      typy bazy, schematy Zod, stałe               — do utworzenia
packages/ui          design tokens i komponenty                   — do utworzenia
packages/config      wspólne tsconfig / eslint                    — do utworzenia
supabase/migrations  migracje SQL (źródło prawdy dla bazy)
supabase/seed        słowniki: kategorie, jednostki, katalog
supabase/tests       testy RLS, limitów i wygasania
docs                 dokumentacja techniczna
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
