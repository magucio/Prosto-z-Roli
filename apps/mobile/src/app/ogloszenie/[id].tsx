import { errorMessage, STORAGE_BUCKET_LISTING_IMAGES } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, EmptyState } from '@/components/ui';
import { STATUS_LABEL } from '@/features/my/useMyListings';
import { useListing } from '@/features/listing/useListing';
import { env } from '@/lib/env';
import { formatPrice, useThemeColors } from '@/lib/theme';

const SELLER_TYPE = { private: 'Osoba prywatna', farm: 'Rolnik / gospodarstwo', company: 'Firma' } as const;

function imageUrl(path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_LISTING_IMAGES}/${path}`;
}

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const { data, isLoading, error } = useListing(id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <EmptyState
        title="Ogłoszenie niedostępne"
        body={error ? errorMessage(error) : 'Ogłoszenie wygasło lub zostało usunięte.'}
      />
    );
  }

  const main = data.images[0];
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: data.title }} />
      {main ? <Image source={{ uri: imageUrl(main.path) }} style={styles.hero} contentFit="cover" /> : null}

      <View style={styles.block}>
        <Chip label={data.category.name} color={data.category.color} />
        <AppText variant="title">{data.title}</AppText>
        <AppText muted>
          {[data.place_name, 'lokalizacja przybliżona (ok. 1 km)'].filter(Boolean).join(' · ')}
        </AppText>
        <AppText muted variant="caption">
          {data.seller_name} · {SELLER_TYPE[data.seller_type]} · aktualizacja{' '}
          {new Date(data.updated_at).toLocaleDateString('pl-PL')}
        </AppText>
      </View>

      {data.is_owner ? (
        <Card>
          <AppText variant="label">
            To Twoje ogłoszenie · {STATUS_LABEL[data.status as keyof typeof STATUS_LABEL] ?? data.status}
          </AppText>
          {data.expires_at ? (
            <AppText variant="caption" muted>
              Ważne do {new Date(data.expires_at).toLocaleDateString('pl-PL')}
            </AppText>
          ) : null}
          <View style={styles.ownerActions}>
            <Button
              title="Edytuj"
              onPress={() => router.push({ pathname: '/moje/edytuj/[id]', params: { id: data.id } })}
              style={styles.flex}
            />
            <Button title="Moje ogłoszenia" variant="secondary" onPress={() => router.push('/moje')} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{data.kind === 'service' ? 'Usługi' : 'Produkty'}</AppText>
        {data.items.map((item) => (
          <View key={item.id} style={[styles.row, { borderColor: c.border }]}>
            <View style={styles.rowText}>
              <AppText variant="label">{item.name}</AppText>
              {item.description ? (
                <AppText muted variant="caption">
                  {item.description}
                </AppText>
              ) : null}
            </View>
            <AppText variant="label">{formatPrice(item.price, item.price_type, item.unit)}</AppText>
          </View>
        ))}
      </Card>

      {data.description ? (
        <Card>
          <AppText variant="heading">Opis</AppText>
          <AppText>{data.description}</AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">Odbiór</AppText>
        <AppText>{data.pickup_available ? 'Odbiór osobisty' : 'Do ustalenia ze sprzedawcą'}</AppText>
        <AppText muted variant="caption">
          Dostawa — pracujemy nad tym, pojawi się wkrótce.
        </AppText>
      </Card>

      <AppText muted variant="caption" style={styles.note}>
        Kontakt ze sprzedawcą, ulubione i zgłaszanie ogłoszeń pojawią się w kolejnych wersjach.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg },
  block: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  note: { textAlign: 'center' },
  ownerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
});
