import { errorMessage } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form';
import { AppText, Button, EmptyState } from '@/components/ui';
import { publishDraft } from '@/features/wizard/publish';
import { ContactStep } from '@/features/wizard/steps/ContactStep';
import { DataStep } from '@/features/wizard/steps/DataStep';
import { ItemsStep } from '@/features/wizard/steps/ItemsStep';
import { LocationStep } from '@/features/wizard/steps/LocationStep';
import { PhotosStep } from '@/features/wizard/steps/PhotosStep';
import { SummaryStep } from '@/features/wizard/steps/SummaryStep';
import { STEPS, useDraft, validateStep } from '@/features/wizard/store';
import { useAccount, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/lib/theme';

export default function AddTab() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const account = useAccount();
  const queryClient = useQueryClient();
  const draft = useDraft();
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const publish = useMutation({
    mutationFn: () => publishDraft(useDraft.getState()),
    onSuccess: async ({ id, status }) => {
      useDraft.getState().reset();
      await queryClient.invalidateQueries({ queryKey: ['map_points'] });
      if (status === 'pending_review') {
        Alert.alert('Ogłoszenie czeka na moderację', 'Pokażemy je na mapie po sprawdzeniu przez moderatora.');
      } else {
        Alert.alert('Opublikowano', 'Twoje ogłoszenie jest już na mapie.');
      }
      router.push({ pathname: '/ogloszenie/[id]', params: { id } });
    },
    onError: (e) => {
      const msg = e instanceof Error && e.message === 'image_has_exif' ? 'Zdjęcie zawiera dane EXIF — usuń je i dodaj ponownie.' : errorMessage(e);
      setError(msg);
    },
  });

  if (!session) {
    return (
      <EmptyState
        title="Dodaj ogłoszenie"
        body="Zaloguj się, aby dodać ogłoszenie. Dodawanie jest bezpłatne."
        action={<Button title="Zaloguj się" onPress={() => router.push('/konto/logowanie')} />}
      />
    );
  }
  if (account.data?.is_blocked) {
    return <EmptyState title="Konto zablokowane" body="Zablokowane konto nie może dodawać ogłoszeń. Skontaktuj się z pomocą." />;
  }

  const step = draft.step;
  const last = step === STEPS.length - 1;

  function next() {
    const problem = validateStep(step, useDraft.getState());
    setError(problem);
    if (problem) return;
    if (last) {
      publish.mutate();
    } else {
      draft.set({ step: step + 1 });
    }
  }

  function back() {
    setError(null);
    draft.set({ step: Math.max(0, step - 1) });
  }

  function startOver() {
    Alert.alert('Zacząć od nowa?', 'Wprowadzone dane zostaną usunięte.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyczyść',
        style: 'destructive',
        onPress: async () => {
          const id = useDraft.getState().listingId;
          if (id) await supabase.rpc('remove_listing', { p_id: id });
          useDraft.getState().reset();
          setError(null);
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.headerRow}>
          <AppText variant="heading" style={{ flex: 1 }}>
            {STEPS[step]}
          </AppText>
          <AppText variant="caption" muted>
            Krok {step + 1} z {STEPS.length}
          </AppText>
        </View>
        <View style={[styles.progress, { backgroundColor: c.surfaceMuted }]}>
          <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
        {step === 0 ? <LocationStep onMapTouch={(active) => setScrollEnabled(!active)} /> : null}
        {step === 1 ? <DataStep /> : null}
        {step === 2 ? <ItemsStep /> : null}
        {step === 3 ? <PhotosStep /> : null}
        {step === 4 ? <ContactStep /> : null}
        {step === 5 ? <SummaryStep /> : null}
        <FormError message={error} />
        {step === 0 && draft.title === '' && draft.items.length === 0 ? null : (
          <Button title="Zacznij od nowa" variant="secondary" onPress={startOver} />
        )}
      </ScrollView>

      <View style={[styles.footer, { borderColor: c.border, backgroundColor: c.surface }]}>
        {step > 0 ? <Button title="Wstecz" variant="secondary" onPress={back} style={styles.flex} disabled={publish.isPending} /> : null}
        <Button title={last ? 'Opublikuj' : 'Dalej'} onPress={next} loading={publish.isPending} style={styles.flex} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  progress: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
});
