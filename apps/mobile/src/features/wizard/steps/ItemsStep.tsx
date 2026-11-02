import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LIMITS } from '@pzr/shared';
import { spacing } from '@pzr/ui';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { formatPrice, useThemeColors } from '@/lib/theme';

import { parseDecimal, useDraft } from '../store';

export function ItemsStep() {
  const c = useThemeColors();
  const { items, kind, removeItem } = useDraft();
  const full = items.length >= LIMITS.itemsPerListing;
  return (
    <View style={styles.wrap}>
      <AppText muted>
        Dodaj od 1 do {LIMITS.itemsPerListing} {kind === 'service' ? 'usług' : 'produktów'} z katalogu. Każdy może mieć własną cenę i
        jednostkę.
      </AppText>
      {items.map((it) => (
        <Card key={it.key} style={styles.row}>
          <View style={styles.fill}>
            <AppText variant="label">{it.productName}</AppText>
            <AppText variant="caption" muted>
              {formatPrice(it.priceType === 'fixed' ? parseDecimal(it.price) : null, it.priceType, it.unitShort)}
              {it.quantity ? ` · ilość: ${it.quantity} ${it.unitShort}` : ''}
            </AppText>
          </View>
          <Pressable
            accessibilityLabel={`Edytuj ${it.productName}`}
            hitSlop={10}
            onPress={() => router.push({ pathname: '/kreator/pozycja', params: { key: it.key } })}>
            <MaterialIcons name="edit" size={22} color={c.textMuted} />
          </Pressable>
          <Pressable accessibilityLabel={`Usuń ${it.productName}`} hitSlop={10} onPress={() => removeItem(it.key)}>
            <MaterialIcons name="delete-outline" size={22} color={c.danger} />
          </Pressable>
        </Card>
      ))}
      <Button
        title={full ? `Osiągnięto limit ${LIMITS.itemsPerListing} pozycji` : 'Dodaj pozycję'}
        variant="secondary"
        disabled={full}
        onPress={() => router.push('/kreator/pozycja')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
