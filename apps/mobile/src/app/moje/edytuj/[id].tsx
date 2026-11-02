import { errorMessage } from '@pzr/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { loadForEdit } from '@/features/wizard/publish';
import { editDraftStore, WizardContext } from '@/features/wizard/store';
import { WizardScreen } from '@/features/wizard/WizardScreen';
import { useThemeColors } from '@/lib/theme';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const load = useQuery({
    queryKey: ['edit-load', id],
    gcTime: 0,
    staleTime: Infinity,
    queryFn: () => loadForEdit(editDraftStore, id),
  });

  if (load.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (load.error) return <EmptyState title="Nie można edytować" body={errorMessage(load.error)} />;
  return (
    <WizardContext.Provider value={editDraftStore}>
      <WizardScreen mode="edit" />
    </WizardContext.Provider>
  );
}
