import { zodResolver } from '@hookform/resolvers/zod';
import { authErrorMessage, emailSchema, newPasswordSchema, otpSchema } from '@pzr/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormError, FormScreen, TextField } from '@/components/form';
import { AppText, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const emailForm = z.object({ email: emailSchema });
const resetForm = z
  .object({ code: otpSchema, password: newPasswordSchema.shape.password, passwordRepeat: z.string() })
  .refine((v) => v.password === v.passwordRepeat, { message: 'Hasła się różnią.', path: ['passwordRepeat'] });

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const first = useForm<z.input<typeof emailForm>>({
    resolver: zodResolver(emailForm),
    defaultValues: { email: params.email ?? '' },
  });
  const second = useForm<z.input<typeof resetForm>>({
    resolver: zodResolver(resetForm),
    defaultValues: { code: '', password: '', passwordRepeat: '' },
  });

  const sendCode = first.handleSubmit(async (values) => {
    setError(null);
    const { email: e } = emailForm.parse(values);
    const { error: err } = await supabase.auth.resetPasswordForEmail(e);
    if (err) {
      setError(authErrorMessage(err));
      return;
    }
    setEmail(e);
  });

  const setPassword = second.handleSubmit(async ({ code, password }) => {
    if (!email) return;
    setError(null);
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' });
    if (otpError) {
      setError(authErrorMessage(otpError));
      return;
    }
    const { error: updError } = await supabase.auth.updateUser({ password });
    if (updError) {
      setError(authErrorMessage(updError));
      return;
    }
    router.dismissTo('/profil');
  });

  return (
    <FormScreen>
      <AppText variant="title">Reset hasła</AppText>
      {email === null ? (
        <>
          <AppText muted>Podaj e-mail konta. Jeśli konto istnieje, wyślemy na niego kod do ustawienia nowego hasła.</AppText>
          <TextField control={first.control} name="email" label="E-mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <FormError message={error} />
          <Button title="Wyślij kod" onPress={sendCode} loading={first.formState.isSubmitting} />
        </>
      ) : (
        <>
          <AppText muted>Wpisz kod wysłany na {email} i ustaw nowe hasło.</AppText>
          <TextField control={second.control} name="code" label="Kod z e-maila" keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />
          <TextField control={second.control} name="password" label="Nowe hasło" hint="Co najmniej 8 znaków, litera i cyfra." secure autoComplete="new-password" />
          <TextField control={second.control} name="passwordRepeat" label="Powtórz nowe hasło" secure autoComplete="new-password" />
          <FormError message={error} />
          <Button title="Ustaw nowe hasło" onPress={setPassword} loading={second.formState.isSubmitting} />
          <Button title="Zmień adres e-mail" variant="secondary" onPress={() => setEmail(null)} />
        </>
      )}
    </FormScreen>
  );
}
