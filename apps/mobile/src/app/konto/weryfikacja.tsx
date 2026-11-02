import { zodResolver } from '@hookform/resolvers/zod';
import { authErrorMessage, otpSchema } from '@pzr/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormError, FormScreen, TextField } from '@/components/form';
import { AppText, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const schema = z.object({ code: otpSchema });
type Form = z.input<typeof schema>;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const { control, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { code: '' } });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = handleSubmit(async ({ code }) => {
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (e) {
      setError(authErrorMessage(e));
      return;
    }
    router.dismissTo('/profil');
  });

  async function resend() {
    setError(null);
    const { error: e } = await supabase.auth.resend({ type: 'signup', email });
    if (e) {
      setError(authErrorMessage(e));
      return;
    }
    setInfo('Wysłaliśmy nowy kod.');
    setCooldown(RESEND_SECONDS);
  }

  return (
    <FormScreen>
      <AppText variant="title">Potwierdź e-mail</AppText>
      <AppText muted>
        Wysłaliśmy kod na adres {email}. Wpisz go poniżej. Jeśli nie widzisz wiadomości, sprawdź folder spam.
      </AppText>
      <TextField control={control} name="code" label="Kod z e-maila" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} />
      <FormError message={error} />
      {info ? <AppText variant="caption" muted>{info}</AppText> : null}
      <Button title="Potwierdź" onPress={onSubmit} loading={formState.isSubmitting} />
      <Button
        title={cooldown > 0 ? `Wyślij kod ponownie (${cooldown} s)` : 'Wyślij kod ponownie'}
        variant="secondary"
        disabled={cooldown > 0}
        onPress={resend}
      />
    </FormScreen>
  );
}
