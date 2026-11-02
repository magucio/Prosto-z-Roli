import { BRAND } from '@pzr/shared';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">{BRAND.name} — panel administratora</h1>
      <p className="text-[#6B645B]">
        Panel powstaje w etapie 10: logowanie z 2FA, moderacja ogłoszeń i zgłoszeń, słowniki, filtr słów, statystyki
        i dziennik działań. Wszystkie operacje będą sprawdzane po stronie serwera i w bazie (RLS).
      </p>
    </main>
  );
}
