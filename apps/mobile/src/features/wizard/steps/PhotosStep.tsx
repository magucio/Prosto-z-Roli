import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LIMITS } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useThemeColors } from '@/lib/theme';

import { processImage } from '../images';
import { useDraft, useDraftApi } from '../store';

const key = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function PhotosStep() {
  const c = useThemeColors();
  const { images, set } = useDraft();
  const api = useDraftApi();
  const [busy, setBusy] = useState(false);
  const left = LIMITS.imagesPerListing - images.length;

  async function addFrom(source: 'camera' | 'library') {
    if (left <= 0) return;
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Brak zgody', source === 'camera' ? 'Zezwól na dostęp do aparatu w ustawieniach.' : 'Zezwól na dostęp do zdjęć w ustawieniach.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            exif: false,
            allowsMultipleSelection: true,
            selectionLimit: left,
          });
    if (result.canceled) return;
    setBusy(true);
    try {
      const added = [];
      for (const asset of result.assets.slice(0, left)) {
        const p = await processImage(asset.uri);
        added.push({ key: key(), uri: p.uri, width: p.width, height: p.height, bytes: p.bytes });
      }
      set({ images: [...api.getState().images, ...added].slice(0, LIMITS.imagesPerListing) });
    } catch {
      Alert.alert('Nie udało się dodać zdjęcia', 'Spróbuj wybrać inne zdjęcie.');
    } finally {
      setBusy(false);
    }
  }

  function remove(k: string) {
    set({ images: images.filter((i) => i.key !== k) });
  }

  function makeMain(k: string) {
    const img = images.find((i) => i.key === k);
    if (!img) return;
    // kolejność decyduje o zdjęciu głównym; zarejestrowane już zdjęcia trzeba zarejestrować na nowo
    set({ images: [img, ...images.filter((i) => i.key !== k)] });
  }

  return (
    <View style={styles.wrap}>
      <AppText muted>
        Do {LIMITS.imagesPerListing} zdjęć. Pierwsze jest zdjęciem głównym. Zmniejszamy je i usuwamy z nich dane o miejscu
        zrobienia zdjęcia.
      </AppText>
      <View style={styles.grid}>
        {images.map((img, i) => (
          <View key={img.key} style={[styles.thumb, { borderColor: i === 0 ? c.primary : c.border }]}>
            <Image source={{ uri: img.uri }} style={styles.fill} contentFit="cover" />
            {i === 0 ? (
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <AppText variant="caption" style={{ color: c.onPrimary }}>
                  Główne
                </AppText>
              </View>
            ) : (
              <Pressable accessibilityLabel="Ustaw jako główne" onPress={() => makeMain(img.key)} style={[styles.badge, { backgroundColor: c.surface }]}>
                <AppText variant="caption">Ustaw główne</AppText>
              </Pressable>
            )}
            <Pressable accessibilityLabel="Usuń zdjęcie" onPress={() => remove(img.key)} style={[styles.remove, { backgroundColor: c.surface }]}>
              <MaterialIcons name="close" size={18} color={c.danger} />
            </Pressable>
          </View>
        ))}
      </View>
      {busy ? <ActivityIndicator color={c.primary} /> : null}
      <Button title="Zrób zdjęcie" variant="secondary" disabled={left <= 0 || busy} onPress={() => addFrom('camera')} />
      <Button title="Wybierz z galerii" variant="secondary" disabled={left <= 0 || busy} onPress={() => addFrom('library')} />
      <AppText variant="caption" muted>
        Zdjęcia są opcjonalne, ale ogłoszenia ze zdjęciami przyciągają więcej kupujących.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: '31%', aspectRatio: 1, borderRadius: radius.md, borderWidth: 2, overflow: 'hidden' },
  badge: { position: 'absolute', left: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  remove: { position: 'absolute', right: 4, top: 4, borderRadius: 12, padding: 2 },
});
