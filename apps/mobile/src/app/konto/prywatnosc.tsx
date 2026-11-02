import { ScrollView, StyleSheet } from 'react-native';
import { spacing } from '@pzr/ui';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/lib/theme';

// WERSJA ROBOCZA — wymaga uzupełnienia danych administratora i weryfikacji prawnej przed publikacją w sklepie.
export default function PrivacyScreen() {
  const c = useThemeColors();
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <AppText variant="title">Polityka prywatności</AppText>
      <AppText variant="caption" muted>
        Wersja robocza na czas testów — ostateczna treść zostanie opublikowana przed udostępnieniem aplikacji w Google Play.
      </AppText>
      <AppText variant="heading">Jakie dane zbieramy</AppText>
      <AppText>
        Adres e-mail i hasło (do logowania), nazwę wyświetlaną, typ konta, a dla firm także nazwę i NIP. W ogłoszeniach:
        treść, zdjęcia (bez danych o lokalizacji z aparatu), ceny i miejsce sprzedaży.
      </AppText>
      <AppText variant="heading">Co jest publiczne</AppText>
      <AppText>
        Nazwa sprzedawcy, treść ogłoszenia i jego przybliżone położenie (z dokładnością ok. 1 km). Dokładny adres, telefon i
        e-mail nie są publiczne. Telefon i e-mail zobaczy tylko zalogowany użytkownik i tylko wtedy, gdy na to pozwolisz.
      </AppText>
      <AppText variant="heading">Lokalizacja urządzenia</AppText>
      <AppText>
        Używamy jej tylko wtedy, gdy o to poprosisz (przycisk lokalizacji lub wskazanie miejsca ogłoszenia). Nie zapisujemy
        historii położenia.
      </AppText>
      <AppText variant="heading">Twoje prawa</AppText>
      <AppText>
        Możesz w każdej chwili poprawić dane w aplikacji i usunąć konto (Profil → Usuń konto). Dane firm przechowujemy jeszcze 6
        miesięcy po usunięciu konta, jeśli wymagają tego przepisy.
      </AppText>
      <AppText variant="heading">Gdzie przechowujemy dane</AppText>
      <AppText>Na serwerach Supabase w Unii Europejskiej (Irlandia).</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl } });
