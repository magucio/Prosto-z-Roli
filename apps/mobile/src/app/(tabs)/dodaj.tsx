import { WizardScreen } from '@/features/wizard/WizardScreen';
import { createDraftStore, WizardContext } from '@/features/wizard/store';

export default function AddTab() {
  return (
    <WizardContext.Provider value={createDraftStore}>
      <WizardScreen mode="create" />
    </WizardContext.Provider>
  );
}
