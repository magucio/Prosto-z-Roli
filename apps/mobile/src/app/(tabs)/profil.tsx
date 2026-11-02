import { errorMessage } from '@pzr/shared';
import { spacing } from '@pzr/ui';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow } from '@/components/form';
import { AppText, Button, Card } from '@/components/ui';
import { SELLER_TYPE_LABEL, useAccount, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/lib/theme';

export default function ProfileTab() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();
  const account = useAccount();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      {session ? (
        <Card>
          {account.isLoading ? (
            <ActivityIndicator color={c.primary} />
          ) : account.data ? (
            <>
              <AppText variant="title">{account.data.display_name}</AppText>
              <AppText muted>{session.user.email}</AppText>
              <AppText variant="caption" muted>
                {SELLER_TYPE_LABEL[account.data.seller_type]}
              </AppText>
              {account.data.is_blocked ? (
                <AppText variant="caption" style={{ color: c.danger }}>
                  Konto jest zablokowane przez moderację.
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText style={{ color: c.danger }}>{errorMessage(account.error)}</AppText>
          )}
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Nie jesteś zalogowany</AppText>
          <AppText muted>Zaloguj się, aby dodawać ogłoszenia, pisać do sprzedawców i zapisywać ulubione.</AppText>
          <Button title="Zaloguj się" onPress={() => router.push('/konto/logowanie')} />
          <Button title="Załóż konto" variant="secondary" onPress={() => router.push('/konto/rejestracja')} />
        </Card>
      )}

      {session ? (
        <View style={[styles.list, { borderColor: c.border }]}>
          <ListRow icon="storefront" label="Moje ogłoszenia" onPress={() => router.push('/moje')} />
          <ListRow icon="badge" label="Dane konta" onPress={() => router.push('/konto/dane-konta')} />
          <ListRow icon="lock" label="Zmień hasło" onPress={() => router.push('/konto/zmiana-hasla')} />
        </View>
      ) : null}

      <View style={[styles.list, { borderColor: c.border }]}>
        <ListRow icon="policy" label="Polityka prywatności" onPress={() => router.push('/konto/prywatnosc')} />
        <ListRow icon="description" label="Regulamin" onPress={() => router.push('/konto/regulamin')} />
      </View>

      {session ? (
        <View style={[styles.list, { borderColor: c.border }]}>
          <ListRow
            icon="logout"
            label="Wyloguj"
            onPress={() =>
              Alert.alert('Wylogować?', undefined, [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Wyloguj', onPress: () => supabase.auth.signOut() },
              ])
            }
          />
          <ListRow icon="delete-forever" label="Usuń konto" danger onPress={() => router.push('/konto/usun-konto')} />
        </View>
      ) : null}

      <AppText variant="caption" muted style={styles.footer}>
        Ulubione, wiadomości i powiadomienia pojawią się w kolejnych etapach.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  footer: { textAlign: 'center' },
});
