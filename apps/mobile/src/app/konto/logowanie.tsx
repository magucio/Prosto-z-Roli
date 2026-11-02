import { zodResolver } from '@hookform/resolvers/zod';
import { authErrorMessage, loginSchema } from '@pzr/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormError, FormScreen, TextField } from '@/components/form';
import { AppText, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Form = z.input<typeof loginSchema>;

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState, getValues } = useForm<Form>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.email ?? '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const parsed = loginSchema.parse(values);
    const { error: e } = await supabase.auth.signInWithPassword(parsed);
    if (e) {
      if (e.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email: parsed.email });
        router.push({ pathname: '/konto/weryfikacja', params: { email: parsed.email } });
        return;
      }
      setError(authErrorMessage(e));
      return;
    }
    router.dismissTo('/profil');
  });

  return (
    <FormScreen>
      <AppText variant="title">Zaloguj się</AppText>
      <TextField control={control} name="email" label="E-mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <TextField control={control} name="password" label="Hasło" secure autoComplete="current-password" textContentType="password" />
      <FormError message={error} />
      <Button title="Zaloguj" onPress={onSubmit} loading={formState.isSubmitting} />
      <Button
        title="Nie pamiętam hasła"
        variant="secondary"
        onPress={() => router.push({ pathname: '/konto/reset-hasla', params: { email: getValues('email') } })}
      />
      <Button title="Nie masz konta? Zarejestruj się" variant="secondary" onPress={() => router.replace('/konto/rejestracja')} />
    </FormScreen>
  );
}
