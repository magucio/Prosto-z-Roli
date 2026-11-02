import { ScrollView, StyleSheet } from 'react-native';
import { spacing } from '@pzr/ui';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/lib/theme';

// WERSJA ROBOCZA — wymaga weryfikacji prawnej przed publikacją w sklepie.
export default function TermsScreen() {
  const c = useThemeColors();
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <AppText variant="title">Regulamin</AppText>
      <AppText variant="caption" muted>
        Wersja robocza na czas testów — ostateczna treść zostanie opublikowana przed udostępnieniem aplikacji w Google Play.
      </AppText>
      <AppText variant="heading">Czym jest aplikacja</AppText>
      <AppText>
        Bezpłatną tablicą lokalnych ogłoszeń produktów i usług rolniczych. Aplikacja nie pośredniczy w płatnościach ani
        dostawie — umowa zawierana jest bezpośrednio między kupującym a sprzedawcą.
      </AppText>
      <AppText variant="heading">Zasady ogłoszeń</AppText>
      <AppText>
        Ogłoszenie musi dotyczyć własnych produktów lub usług, zawierać prawdziwe informacje i być zgodne z prawem. Ogłoszenia
        wygasają po 60 dniach, chyba że potwierdzisz ich aktualność. Sprzedaż mięsa, nabiału, jaj i miodu jest chwilowo
        niedostępna.
      </AppText>
      <AppText variant="heading">Moderacja</AppText>
      <AppText>
        Treści naruszające prawo lub regulamin możemy ukryć lub usunąć, a konta naruszające zasady — zablokować. Każdy może
        zgłosić ogłoszenie lub wiadomość.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl } });
