import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { radius, spacing, typography } from '@pzr/ui';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { useThemeColors } from '@/lib/theme';

import { AppText } from './ui';

export function FormScreen({ children }: { children: ReactNode }) {
  const c = useThemeColors();
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  secure?: boolean;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'secureTextEntry'>;

export function TextField<T extends FieldValues>({ control, name, label, hint, secure, ...input }: FieldProps<T>) {
  const c = useThemeColors();
  const [hidden, setHidden] = useState(true);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={styles.field}>
          <AppText variant="label">{label}</AppText>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
            ]}>
            <TextInput
              {...input}
              value={value == null ? '' : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={secure && hidden}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={label}
              style={[styles.input, typography.body as TextStyle, { color: c.text }]}
            />
            {secure ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hidden ? 'Pokaż hasło' : 'Ukryj hasło'}
                onPress={() => setHidden((h) => !h)}
                hitSlop={12}>
                <MaterialIcons name={hidden ? 'visibility' : 'visibility-off'} size={22} color={c.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {error?.message ? (
            <AppText variant="caption" style={{ color: c.danger }}>
              {error.message}
            </AppText>
          ) : hint ? (
            <AppText variant="caption" muted>
              {hint}
            </AppText>
          ) : null}
        </View>
      )}
    />
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const c = useThemeColors();
  return (
    <View style={[styles.segmented, { borderColor: c.border, backgroundColor: c.surfaceMuted }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: c.surface, borderColor: c.primary }]}>
            <Text
              style={[typography.caption as TextStyle, { color: active ? c.text : c.textMuted, textAlign: 'center' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}>
      <MaterialIcons name={checked ? 'check-box' : 'check-box-outline-blank'} size={24} color={checked ? c.primary : c.textMuted} />
      <View style={styles.fill}>{children}</View>
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  const c = useThemeColors();
  if (!message) return null;
  return (
    <View style={[styles.formError, { borderColor: c.danger, backgroundColor: c.surface }]}>
      <AppText variant="caption" style={{ color: c.danger }}>
        {message}
      </AppText>
    </View>
  );
}

export function ListRow({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: c.border, backgroundColor: pressed ? c.surfaceMuted : c.surface }]}>
      <MaterialIcons name={icon} size={22} color={danger ? c.danger : c.textMuted} />
      <AppText style={[styles.fill, danger ? { color: c.danger } : null]}>{label}</AppText>
      <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  form: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  field: { gap: spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  checkRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  formError: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
