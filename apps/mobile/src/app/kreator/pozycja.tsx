import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { errorMessage, LIMITS } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FormError, FormScreen, Segmented } from '@/components/form';
import { AppText, Button, Card } from '@/components/ui';
import { useCatalogSearch, useUnits, type CatalogEntry } from '@/features/wizard/dictionaries';
import { parseDecimal, useDraft, type DraftItem } from '@/features/wizard/store';
import { useThemeColors } from '@/lib/theme';

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ItemEditor() {
  const c = useThemeColors();
  const { key } = useLocalSearchParams<{ key?: string }>();
  const { kind, items, upsertItem } = useDraft();
  const existing = items.find((i) => i.key === key);

  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<{ id: string; name: string } | null>(
    existing ? { id: existing.productId, name: existing.productName } : null,
  );
  const [unitId, setUnitId] = useState(existing?.unitId ?? '');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable'>(existing?.priceType ?? 'fixed');
  const [price, setPrice] = useState(existing?.price ?? '');
  const [quantity, setQuantity] = useState(existing?.quantity ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const catalog = useCatalogSearch(kind, query);
  const units = useUnits(kind);
  const unit = useMemo(() => units.data?.find((u) => u.id === unitId), [units.data, unitId]);
  const input = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }];

  function choose(entry: CatalogEntry) {
    if (entry.categories.restriction_level !== 'none') {
      Alert.alert(entry.name, entry.categories.restriction_message ?? 'Ta pozycja jest chwilowo niedostępna.');
      return;
    }
    if (items.some((i) => i.productId === entry.id && i.key !== key)) {
      Alert.alert('Już dodane', 'Ta pozycja jest już w ogłoszeniu — edytuj ją zamiast dodawać drugi raz.');
      return;
    }
    setProduct({ id: entry.id, name: entry.name });
    if (entry.default_unit_id) setUnitId(entry.default_unit_id);
  }

  function save() {
    setError(null);
    if (!product) return setError('Wybierz pozycję z katalogu.');
    if (!unit) return setError('Wybierz jednostkę.');
    const p = parseDecimal(price);
    if (priceType === 'fixed' && (p === null || p <= 0 || p >= 1_000_000)) return setError('Podaj cenę większą od zera albo wybierz „Do uzgodnienia”.');
    const q = parseDecimal(quantity);
    if (quantity.trim() && (q === null || q <= 0)) return setError('Ilość musi być liczbą większą od zera.');
    const item: DraftItem = {
      key: existing?.key ?? newKey(),
      productId: product.id,
      productName: product.name,
      unitId: unit.id,
      unitShort: unit.short_name,
      priceType,
      price: priceType === 'fixed' ? price : '',
      quantity,
      description,
    };
    upsertItem(item);
    router.back();
  }

  if (!product) {
    return (
      <FormScreen>
        <AppText variant="title">{kind === 'service' ? 'Wybierz usługę' : 'Wybierz produkt'}</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj, np. jabłka, ziemniaki, orka…"
          placeholderTextColor={c.textMuted}
          autoFocus
          style={input}
        />
        {catalog.isLoading ? <ActivityIndicator color={c.primary} /> : null}
        {catalog.error ? <AppText style={{ color: c.danger }}>{errorMessage(catalog.error)}</AppText> : null}
        {(catalog.data ?? []).map((entry) => {
          const locked = entry.categories.restriction_level !== 'none';
          return (
            <Pressable key={entry.id} onPress={() => choose(entry)} style={({ pressed }) => [styles.result, { borderColor: c.border, backgroundColor: pressed ? c.surfaceMuted : c.surface, opacity: locked ? 0.55 : 1 }]}>
              <View style={[styles.dot, { backgroundColor: entry.categories.color }]} />
              <View style={styles.fill}>
                <AppText>{entry.name}</AppText>
                <AppText variant="caption" muted>
                  {entry.categories.name}
                  {locked ? ' · chwilowo niedostępne' : ''}
                </AppText>
              </View>
              {locked ? <MaterialIcons name="lock" size={18} color={c.textMuted} /> : null}
            </Pressable>
          );
        })}
        {catalog.data && catalog.data.length === 0 ? (
          <AppText muted>Nie znaleźliśmy takiej pozycji. Katalog rozbudowuje administrator — spróbuj innej nazwy.</AppText>
        ) : null}
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <Card style={styles.selected}>
        <AppText variant="heading" style={styles.fill}>
          {product.name}
        </AppText>
        <Button title="Zmień" variant="secondary" onPress={() => setProduct(null)} />
      </Card>

      <AppText variant="label">Cena</AppText>
      <Segmented
        options={[
          { value: 'fixed', label: 'Konkretna kwota' },
          { value: 'negotiable', label: 'Do uzgodnienia' },
        ]}
        value={priceType}
        onChange={setPriceType}
      />
      {priceType === 'fixed' ? (
        <View style={styles.priceRow}>
          <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={c.textMuted} style={[...input, styles.fill]} />
          <AppText variant="label">zł / {unit?.short_name ?? '…'}</AppText>
        </View>
      ) : null}

      <AppText variant="label">Jednostka</AppText>
      <View style={styles.units}>
        {(units.data ?? []).map((u) => (
          <Pressable
            key={u.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: u.id === unitId }}
            onPress={() => setUnitId(u.id)}
            style={[styles.unit, { borderColor: u.id === unitId ? c.primary : c.border, backgroundColor: u.id === unitId ? c.surfaceMuted : c.surface }]}>
            <AppText variant="caption">{u.name}</AppText>
          </Pressable>
        ))}
      </View>

      <AppText variant="label">Dostępna ilość (opcjonalnie)</AppText>
      <View style={styles.priceRow}>
        <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="np. 200" placeholderTextColor={c.textMuted} style={[...input, styles.fill]} />
        <AppText variant="label">{unit?.short_name ?? ''}</AppText>
      </View>

      <AppText variant="label">Opis pozycji (opcjonalnie)</AppText>
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={LIMITS.itemDescriptionMax}
        placeholder="np. odmiana Ligol, kaliber 7+"
        placeholderTextColor={c.textMuted}
        multiline
        style={[...input, styles.multiline]}
      />
      <FormError message={error} />
      <Button title={existing ? 'Zapisz zmiany' : 'Dodaj do ogłoszenia'} onPress={save} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: 16 },
  multiline: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: 'top' },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unit: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5 },
});
