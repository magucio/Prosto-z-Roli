import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { errorMessage, LIMITS } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Checkbox, Segmented } from '@/components/form';
import { AppText } from '@/components/ui';
import { useAccount } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';

import { useCategories } from '../dictionaries';
import { useDraft } from '../store';

export function DataStep() {
  const c = useThemeColors();
  const d = useDraft();
  const account = useAccount();
  const categories = useCategories(d.kind);

  useEffect(() => {
    if (!d.sellerName && account.data?.display_name) d.set({ sellerName: account.data.display_name });
  }, [account.data?.display_name]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeKind(kind: 'product' | 'service') {
    if (kind === d.kind) return;
    const apply = () => d.set({ kind, mainCategoryId: null, items: [] });
    if (d.items.length > 0) {
      Alert.alert('Zmienić rodzaj ogłoszenia?', 'Dodane pozycje zostaną usunięte.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zmień', style: 'destructive', onPress: apply },
      ]);
    } else {
      apply();
    }
  }

  const input = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }];

  return (
    <View style={styles.wrap}>
      <AppText variant="label">Co oferujesz?</AppText>
      <Segmented
        options={[
          { value: 'product', label: 'Produkty' },
          { value: 'service', label: 'Usługi rolnicze' },
        ]}
        value={d.kind}
        onChange={changeKind}
      />

      <View style={styles.field}>
        <AppText variant="label">Tytuł</AppText>
        <TextInput
          value={d.title}
          onChangeText={(v) => d.set({ title: v })}
          placeholder={d.kind === 'product' ? 'np. Jabłka prosto z sadu' : 'np. Orka i uprawa gruntu'}
          placeholderTextColor={c.textMuted}
          maxLength={LIMITS.titleMax}
          style={input}
        />
        <AppText variant="caption" muted>
          {d.title.trim().length}/{LIMITS.titleMax}
        </AppText>
      </View>

      <AppText variant="label">Kategoria główna (kolor pinezki)</AppText>
      {categories.isLoading ? <ActivityIndicator color={c.primary} /> : null}
      {categories.error ? <AppText style={{ color: c.danger }}>{errorMessage(categories.error)}</AppText> : null}
      <View style={styles.grid}>
        {(categories.data ?? []).map((cat) => {
          const locked = cat.restriction_level !== 'none';
          const active = d.mainCategoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: locked }}
              onPress={() =>
                locked
                  ? Alert.alert(cat.name, cat.restriction_message ?? 'Kategoria chwilowo niedostępna.')
                  : d.set({ mainCategoryId: cat.id })
              }
              style={[
                styles.cat,
                {
                  borderColor: active ? cat.color : c.border,
                  backgroundColor: active ? c.surfaceMuted : c.surface,
                  opacity: locked ? 0.55 : 1,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <AppText variant="caption" style={styles.fill}>
                {cat.name}
              </AppText>
              {locked ? <MaterialIcons name="lock" size={16} color={c.textMuted} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <AppText variant="label">Opis (opcjonalnie)</AppText>
        <TextInput
          value={d.description}
          onChangeText={(v) => d.set({ description: v })}
          placeholder="Odmiany, sposób uprawy, godziny odbioru…"
          placeholderTextColor={c.textMuted}
          maxLength={LIMITS.descriptionMax}
          multiline
          style={[...input, styles.multiline]}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="label">Nazwa sprzedawcy</AppText>
        <TextInput value={d.sellerName} onChangeText={(v) => d.set({ sellerName: v })} maxLength={60} style={input} />
      </View>

      <Checkbox checked={d.pickup} onChange={(v) => d.set({ pickup: v })}>
        <AppText>Odbiór osobisty</AppText>
      </Checkbox>
      <View style={{ opacity: 0.5 }}>
        <Checkbox checked={false} onChange={() => Alert.alert('Wkrótce', 'Pracujemy nad dostawą — pojawi się w przyszłości.')}>
          <AppText>Możliwa dostawa — wkrótce</AppText>
        </Checkbox>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  field: { gap: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: 16 },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '48%',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
