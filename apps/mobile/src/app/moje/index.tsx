import { errorMessage } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState } from '@/components/ui';
import { publicImageUrl } from '@/features/wizard/publish';
import { daysLeft, STATUS_LABEL, useListingAction, useMyListings, type MyListingRow } from '@/features/my/useMyListings';
import { useThemeColors } from '@/lib/theme';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
      <AppText variant="title" style={color ? { color } : undefined}>
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

function ListingCard({ item }: { item: MyListingRow }) {
  const c = useThemeColors();
  const action = useListingAction();
  const busy = action.isPending && action.variables?.id === item.id;
  const left = daysLeft(item.expires_at);
  const expiringSoon = item.status === 'active' && left !== null && left <= 7;
  const expired = item.status === 'expired' || item.is_expired;
  const statusColor =
    item.status === 'active' && !expired ? c.success : item.status === 'blocked' ? c.danger : expired || expiringSoon ? c.warning : c.textMuted;

  const run = (a: 'pause' | 'resume' | 'confirm' | 'remove') => action.mutate({ id: item.id, action: a });

  return (
    <Card>
      <Pressable style={styles.top} onPress={() => router.push({ pathname: '/ogloszenie/[id]', params: { id: item.id } })}>
        {item.main_image ? (
          <Image source={{ uri: publicImageUrl(item.main_image) }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: c.surfaceMuted }]} />
        )}
        <View style={styles.fill}>
          <AppText variant="label" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText variant="caption" style={{ color: statusColor }}>
            {expired ? 'Wygasłe' : STATUS_LABEL[item.status]}
          </AppText>
          <AppText variant="caption" muted>
            {[item.place_name, `${item.item_count} poz.`].filter(Boolean).join(' · ')}
          </AppText>
          {item.expires_at && (item.status === 'active' || item.status === 'paused') && !expired ? (
            <AppText variant="caption" style={{ color: expiringSoon ? c.warning : c.textMuted }}>
              Wygasa {new Date(item.expires_at).toLocaleDateString('pl-PL')} ({left === 1 ? 'jutro' : `za ${left} dni`})
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {busy ? <ActivityIndicator color={c.primary} /> : null}
      <View style={styles.actions}>
        {(expired || expiringSoon) && item.status !== 'blocked' ? (
          <Button title="Nadal aktualne" onPress={() => run('confirm')} disabled={busy} style={styles.action} />
        ) : null}
        {item.status === 'active' && !expired ? (
          <Button title="Wstrzymaj" variant="secondary" onPress={() => run('pause')} disabled={busy} style={styles.action} />
        ) : null}
        {item.status === 'paused' || item.status === 'draft' ? (
          <Button title={item.status === 'draft' ? 'Opublikuj' : 'Wznów'} onPress={() => run('resume')} disabled={busy} style={styles.action} />
        ) : null}
        {item.status !== 'blocked' ? (
          <Button
            title="Edytuj"
            variant="secondary"
            onPress={() => router.push({ pathname: '/moje/edytuj/[id]', params: { id: item.id } })}
            disabled={busy}
            style={styles.action}
          />
        ) : null}
        <Button
          title="Usuń"
          variant="secondary"
          disabled={busy}
          style={styles.action}
          onPress={() =>
            Alert.alert('Usunąć ogłoszenie?', 'Zniknie z mapy i z Twojej listy.', [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: () => run('remove') },
            ])
          }
        />
      </View>
    </Card>
  );
}

export default function MyListingsScreen() {
  const c = useThemeColors();
  const { data, isLoading, error, refetch, isRefetching } = useMyListings();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (error) return <EmptyState title="Nie udało się wczytać" body={errorMessage(error)} action={<Button title="Spróbuj ponownie" onPress={() => refetch()} />} />;

  const rows = data ?? [];
  const active = rows.filter((r) => r.status === 'active' && !r.is_expired).length;
  const expired = rows.filter((r) => r.status === 'expired' || r.is_expired).length;
  const other = rows.length - active - expired;

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={
        <View style={styles.stats}>
          <Stat label="Aktywne" value={active} color={c.success} />
          <Stat label="Wygasłe" value={expired} color={expired > 0 ? c.warning : undefined} />
          <Stat label="Pozostałe" value={other} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="Nie masz jeszcze ogłoszeń"
          body="Dodaj pierwsze ogłoszenie — jest bezpłatne i pojawi się na mapie."
          action={<Button title="Dodaj ogłoszenie" onPress={() => router.push('/dodaj')} />}
        />
      }
      renderItem={({ item }) => <ListingCard item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  top: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  fill: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  action: { minHeight: 40, paddingHorizontal: spacing.md },
});
