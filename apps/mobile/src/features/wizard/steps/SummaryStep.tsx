import { spacing } from '@pzr/ui';
import { StyleSheet, View } from 'react-native';

import { Checkbox } from '@/components/form';
import { AppText, Card, Chip } from '@/components/ui';
import { formatPrice } from '@/lib/theme';

import { useCategories } from '../dictionaries';
import { parseDecimal, useDraft } from '../store';

export function SummaryStep() {
  const d = useDraft();
  const categories = useCategories(d.kind);
  const cat = categories.data?.find((x) => x.id === d.mainCategoryId);
  const contact = [d.allowChat && 'wiadomości', d.sharePhone && 'telefon', d.shareEmail && 'e-mail'].filter(Boolean).join(', ');
  return (
    <View style={styles.wrap}>
      <Card>
        {cat ? <Chip label={cat.name} color={cat.color} /> : null}
        <AppText variant="title">{d.title}</AppText>
        <AppText muted>{d.placeName || 'Miejscowość nieustalona'} · lokalizacja przybliżona (ok. 1 km)</AppText>
        <AppText variant="caption" muted>
          {d.sellerName} · {d.pickup ? 'odbiór osobisty' : 'odbiór do ustalenia'}
        </AppText>
        {d.description ? <AppText>{d.description}</AppText> : null}
      </Card>
      <Card>
        <AppText variant="heading">{d.kind === 'service' ? 'Usługi' : 'Produkty'}</AppText>
        {d.items.map((it) => (
          <View key={it.key} style={styles.row}>
            <AppText style={styles.fill}>{it.productName}</AppText>
            <AppText variant="label">
              {formatPrice(it.priceType === 'fixed' ? parseDecimal(it.price) : null, it.priceType, it.unitShort)}
            </AppText>
          </View>
        ))}
      </Card>
      <Card>
        <AppText variant="label">Zdjęcia: {d.images.length}</AppText>
        <AppText variant="label">Kontakt: {contact || 'brak'}</AppText>
        <AppText variant="caption" muted>
          Ogłoszenie będzie aktywne przez 60 dni. Przed końcem przypomnimy o przedłużeniu.
        </AppText>
      </Card>
      <Checkbox checked={d.locationAck} onChange={(v) => d.set({ locationAck: v })}>
        <AppText variant="caption">
          Rozumiem, że przybliżone miejsce sprzedaży (ok. 1 km) i nazwa miejscowości będą widoczne publicznie na mapie.
        </AppText>
      </Checkbox>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: 4 },
});
