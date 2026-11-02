import { zodResolver } from '@hookform/resolvers/zod';
import { authErrorMessage, registerSchema, type RegisterInput } from '@pzr/shared';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Checkbox, FormError, FormScreen, Segmented, TextField } from '@/components/form';
import { AppText, Button } from '@/components/ui';
import { SELLER_TYPE_LABEL } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/lib/theme';

const SELLER_OPTIONS = (['private', 'farm', 'company'] as const).map((value) => ({ value, label: SELLER_TYPE_LABEL[value] }));

export default function RegisterScreen() {
  const c = useThemeColors();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      passwordRepeat: '',
      sellerType: 'private',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const v = registerSchema.parse(values);
    const { error: e } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { data: { display_name: v.displayName, seller_type: v.sellerType } },
    });
    if (e) {
      setError(authErrorMessage(e));
      return;
    }
    router.replace({ pathname: '/konto/weryfikacja', params: { email: v.email } });
  });

  return (
    <FormScreen>
      <AppText variant="title">Załóż konto</AppText>
      <AppText muted>Konto jest potrzebne do dodawania ogłoszeń, wiadomości i ulubionych. Przeglądanie mapy go nie wymaga.</AppText>
      <TextField control={control} name="displayName" label="Imię lub nazwa" hint="Widoczna dla innych użytkowników." autoComplete="name" />
      <TextField control={control} name="email" label="E-mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <TextField control={control} name="password" label="Hasło" hint="Co najmniej 8 znaków, litera i cyfra." secure autoComplete="new-password" textContentType="newPassword" />
      <TextField control={control} name="passwordRepeat" label="Powtórz hasło" secure autoComplete="new-password" />
      <AppText variant="label">Kim jesteś?</AppText>
      <Controller
        control={control}
        name="sellerType"
        render={({ field }) => <Segmented options={SELLER_OPTIONS} value={field.value} onChange={field.onChange} />}
      />
      <AppText variant="caption" muted>
        Typ konta możesz zmienić później. Konto firmowe wymaga podania NIP przed publikacją ogłoszeń.
      </AppText>
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field, fieldState }) => (
          <>
            <Checkbox checked={field.value === true} onChange={(v) => field.onChange(v)}>
              <AppText variant="caption">
                Akceptuję{' '}
                <Link href="/konto/regulamin" style={{ color: c.primary }}>
                  regulamin
                </Link>{' '}
                i{' '}
                <Link href="/konto/prywatnosc" style={{ color: c.primary }}>
                  politykę prywatności
                </Link>
                .
              </AppText>
            </Checkbox>
            {fieldState.error?.message ? (
              <AppText variant="caption" style={{ color: c.danger }}>
                {fieldState.error.message}
              </AppText>
            ) : null}
          </>
        )}
      />
      <FormError message={error} />
      <Button title="Załóż konto" onPress={onSubmit} loading={formState.isSubmitting} />
      <Button title="Masz konto? Zaloguj się" variant="secondary" onPress={() => router.replace('/konto/logowanie')} />
    </FormScreen>
  );
}
