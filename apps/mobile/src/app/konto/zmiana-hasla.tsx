import { zodResolver } from '@hookform/resolvers/zod';
import { authErrorMessage, newPasswordSchema } from '@pzr/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';

import { FormError, FormScreen, TextField } from '@/components/form';
import { AppText, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const schema = z
  .object({ current: z.string().min(1, 'Podaj obecne hasło.'), password: newPasswordSchema.shape.password, passwordRepeat: z.string() })
  .refine((v) => v.password === v.passwordRepeat, { message: 'Hasła się różnią.', path: ['passwordRepeat'] });

export default function ChangePasswordScreen() {
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { current: '', password: '', passwordRepeat: '' },
  });

  const onSubmit = handleSubmit(async ({ current, password }) => {
    const email = session?.user.email;
    if (!email) return;
    setError(null);
    // Potwierdzenie obecnym hasłem przed zmianą.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authError) {
      setError('Obecne hasło jest nieprawidłowe.');
      return;
    }
    const { error: e } = await supabase.auth.updateUser({ password });
    if (e) {
      setError(authErrorMessage(e));
      return;
    }
    Alert.alert('Hasło zmienione', 'Twoje nowe hasło jest aktywne.');
    router.back();
  });

  return (
    <FormScreen>
      <AppText variant="title">Zmień hasło</AppText>
      <TextField control={control} name="current" label="Obecne hasło" secure autoComplete="current-password" />
      <TextField control={control} name="password" label="Nowe hasło" hint="Co najmniej 8 znaków, litera i cyfra." secure autoComplete="new-password" />
      <TextField control={control} name="passwordRepeat" label="Powtórz nowe hasło" secure autoComplete="new-password" />
      <FormError message={error} />
      <Button title="Zmień hasło" onPress={onSubmit} loading={formState.isSubmitting} />
    </FormScreen>
  );
}
