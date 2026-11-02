import { radius, spacing } from '@pzr/ui';
import { useEffect } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';

import { useDraft } from '../store';

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useThemeColors();
  return (
    <View style={styles.toggle}>
      <View style={styles.fill}>
        <AppText>{label}</AppText>
        <AppText variant="caption" muted>
          {hint}
        </AppText>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary }} accessibilityLabel={label} />
    </View>
  );
}

export function ContactStep() {
  const c = useThemeColors();
  const { session } = useAuth();
  const d = useDraft();
  useEffect(() => {
    if (!d.email && session?.user.email) d.set({ email: session.user.email });
  }, [session?.user.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }];
  return (
    <View style={styles.wrap}>
      <AppText muted>
        Domyślnie telefon i e-mail są ukryte. Jeśli je udostępnisz, zobaczy je tylko zalogowany użytkownik po naciśnięciu
        „Pokaż”.
      </AppText>
      <Card>
        <Toggle label="Wiadomości w aplikacji" hint="Najbezpieczniejsza forma kontaktu." value={d.allowChat} onChange={(v) => d.set({ allowChat: v })} />
      </Card>
      <Card>
        <Toggle label="Udostępnij telefon" hint="Widoczny po zalogowaniu i naciśnięciu „Pokaż telefon”." value={d.sharePhone} onChange={(v) => d.set({ sharePhone: v })} />
        <TextInput
          value={d.phone}
          onChangeText={(v) => d.set({ phone: v })}
          placeholder="np. 600 100 200"
          placeholderTextColor={c.textMuted}
          keyboardType="phone-pad"
          maxLength={16}
          style={input}
        />
      </Card>
      <Card>
        <Toggle label="Udostępnij e-mail" hint="Widoczny po zalogowaniu i naciśnięciu „Pokaż e-mail”." value={d.shareEmail} onChange={(v) => d.set({ shareEmail: v })} />
        <TextInput
          value={d.email}
          onChangeText={(v) => d.set({ email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={120}
          style={input}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: 16 },
});
