import { NativeTabs } from 'expo-router/native-tabs';

import { useThemeColors } from '@/lib/theme';

export default function TabsLayout() {
  const c = useThemeColors();
  return (
    <NativeTabs
      backgroundColor={c.surface}
      indicatorColor={c.surfaceMuted}
      iconColor={{ default: c.textMuted, selected: c.primary }}
      labelStyle={{ default: { color: c.textMuted }, selected: { color: c.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="map" sf="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="szukaj">
        <NativeTabs.Trigger.Label>Szukaj</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dodaj">
        <NativeTabs.Trigger.Label>Dodaj</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="add_circle" sf="plus.circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wiadomosci">
        <NativeTabs.Trigger.Label>Wiadomości</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="chat" sf="bubble.left.and.bubble.right" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="person" sf="person.crop.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
