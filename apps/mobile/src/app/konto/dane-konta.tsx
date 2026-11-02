import { zodResolver } from '@hookform/resolvers/zod';
import { accountDataSchema, errorMessage, type AccountDataInput } from '@pzr/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, View } from 'react-native';

import { FormError, FormScreen, Segmented, TextField } from '@/components/form';
import { AppText, Button, EmptyState } from '@/components/ui';
import { SELLER_TYPE_LABEL, useAccount, useAuth, type Account } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/lib/theme';

const SELLER_OPTIONS = (['private', 'farm', 'company'] as const).map((value) => ({ value, label: SELLER_TYPE_LABEL[value] }));

export default function AccountDataScreen() {
  const c = useThemeColors();
  const { data: account, isLoading, error } = useAccount();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (error || !account) {
    return <EmptyState title="Nie udało się wczytać konta" body={error ? errorMessage(error) : 'Zaloguj się ponownie.'} />;
  }
  return <AccountForm account={account} />;
}

function AccountForm({ account }: { account: Account }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const sp = account.seller_profile;
  const { control, handleSubmit, formState } = useForm<AccountDataInput>({
    resolver: zodResolver(accountDataSchema),
    defaultValues: {
      displayName: account.display_name,
      sellerType: account.seller_type,
      farmName: sp?.farm_name ?? '',
      companyName: sp?.company_name ?? '',
      nip: sp?.nip ?? '',
      regon: sp?.regon ?? '',
      addressLine: sp?.address_line ?? '',
      postalCode: sp?.postal_code ?? '',
      city: sp?.city ?? '',
    },
  });
  const sellerType = useWatch({ control, name: 'sellerType' });

  const onSubmit = handleSubmit(async (values) => {
    const userId = session?.user.id;
    if (!userId) return;
    setError(null);
    const v = accountDataSchema.parse(values);
    const { error: e1 } = await supabase
      .from('profiles')
      .update({ display_name: v.displayName, seller_type: v.sellerType })
      .eq('id', userId);
    if (e1) {
      setError(errorMessage(e1));
      return;
    }
    const { error: e2 } = await supabase.from('seller_profiles').upsert({
      user_id: userId,
      farm_name: v.farmName,
      company_name: v.companyName,
      nip: v.nip,
      regon: v.regon,
      address_line: v.addressLine,
      postal_code: v.postalCode,
      city: v.city,
    });
    if (e2) {
      setError(errorMessage(e2));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['account'] });
    router.back();
  });

  return (
    <FormScreen>
      <AppText variant="title">Dane konta</AppText>
      <AppText variant="caption" muted>
        E-mail: {session?.user.email}
      </AppText>
      <TextField control={control} name="displayName" label="Imię lub nazwa" hint="Widoczna dla innych użytkowników." />
      <AppText variant="label">Typ konta</AppText>
      <Controller
        control={control}
        name="sellerType"
        render={({ field }) => <Segmented options={SELLER_OPTIONS} value={field.value} onChange={field.onChange} />}
      />
      {sellerType === 'farm' ? (
        <TextField control={control} name="farmName" label="Nazwa gospodarstwa (opcjonalnie)" />
      ) : null}
      {sellerType === 'company' ? (
        <>
          <AppText variant="caption" muted>
            Dane firmy są wymagane od sprzedawców profesjonalnych. NIP nie jest pokazywany publicznie.
          </AppText>
          <TextField control={control} name="companyName" label="Nazwa firmy" />
          <TextField control={control} name="nip" label="NIP" keyboardType="number-pad" maxLength={10} />
          <TextField control={control} name="regon" label="REGON (opcjonalnie)" keyboardType="number-pad" maxLength={14} />
        </>
      ) : null}
      {sellerType !== 'private' ? (
        <>
          <TextField control={control} name="addressLine" label="Adres (opcjonalnie)" hint="Prywatny — nie jest pokazywany w ogłoszeniach." />
          <TextField control={control} name="postalCode" label="Kod pocztowy" keyboardType="numbers-and-punctuation" maxLength={6} />
          <TextField control={control} name="city" label="Miejscowość" />
        </>
      ) : null}
      <FormError message={error} />
      <Button title="Zapisz" onPress={onSubmit} loading={formState.isSubmitting} />
    </FormScreen>
  );
}
