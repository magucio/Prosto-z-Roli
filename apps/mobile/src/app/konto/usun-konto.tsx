import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';

import { FormError, FormScreen, TextField } from '@/components/form';
import { AppText, Button, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const ERRORS: Record<string, string> = {
  invalid_password: 'Nieprawidłowe hasło.',
  password_required: 'Podaj hasło.',
  auth_required: 'Sesja wygasła. Zaloguj się ponownie.',
};

export default function DeleteAccountScreen() {
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<{ password: string }>({ defaultValues: { password: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    if (!password) {
      setError(ERRORS.password_required!);
      return;
    }
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert('Usunąć konto?', 'Tej operacji nie można cofnąć.', [
        { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Usuń konto', style: 'destructive', onPress: () => resolve(true) },
      ]),
    );
    if (!confirmed) return;
    const { data, error: e } = await supabase.functions.invoke('account-delete', { body: { password } });
    if (e || !data?.ok) {
      let code = '';
      try {
        const body = await (e as { context?: Response })?.context?.json();
        code = body?.error ?? '';
      } catch {
        code = '';
      }
      setError(ERRORS[code] ?? 'Nie udało się usunąć konta. Spróbuj ponownie.');
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    Alert.alert('Konto usunięte', 'Twoje konto i ogłoszenia zostały usunięte.');
    router.dismissTo('/profil');
  });

  return (
    <FormScreen>
      <AppText variant="title">Usuń konto</AppText>
      <Card>
        <AppText variant="label">Co zostanie usunięte</AppText>
        <AppText>• profil, dane sprzedawcy i ustawienia</AppText>
        <AppText>• wszystkie Twoje ogłoszenia i ich zdjęcia</AppText>
        <AppText>• ulubione i powiadomienia</AppText>
        <AppText variant="label">Co zostanie</AppText>
        <AppText>
          • wysłane wiadomości zostaną u rozmówców, oznaczone jako „konto usunięte”
        </AppText>
        <AppText>
          • dane firmy (jeśli konto było firmowe) przechowujemy jeszcze 6 miesięcy, bo wymagają tego przepisy o platformach
          internetowych
        </AppText>
      </Card>
      <TextField control={control} name="password" label="Potwierdź hasłem" secure autoComplete="current-password" />
      <FormError message={error} />
      <Button title="Usuń konto na stałe" onPress={onSubmit} loading={formState.isSubmitting} />
    </FormScreen>
  );
}
