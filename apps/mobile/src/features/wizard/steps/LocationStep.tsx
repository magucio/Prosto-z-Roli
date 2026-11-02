import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Camera, Map, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { POLAND_BOUNDS } from '@pzr/shared';
import { radius, spacing } from '@pzr/ui';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View, type NativeSyntheticEvent } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { env } from '@/lib/env';
import { useThemeColors } from '@/lib/theme';

import { useDraft } from '../store';

function inPoland(lng: number, lat: number) {
  return lng >= POLAND_BOUNDS.west && lng <= POLAND_BOUNDS.east && lat >= POLAND_BOUNDS.south && lat <= POLAND_BOUNDS.north;
}

export function LocationStep({ onMapTouch }: { onMapTouch?: (active: boolean) => void }) {
  const c = useThemeColors();
  const { location, placeName, addressText, set } = useDraft();
  const cameraRef = useRef<CameraRef>(null);
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locating, setLocating] = useState(false);
  const [zoom, setZoom] = useState(location ? 13 : 5);

  async function guessPlace(lng: number, lat: number) {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const name = r?.city || r?.district || r?.subregion;
      if (name) set({ placeName: name });
    } catch {
      // geokoder telefonu bywa niedostępny — użytkownik wpisze miejscowość ręcznie
    }
  }

  function onRegionDidChange(event: NativeSyntheticEvent<ViewStateChangeEvent>) {
    const [lng, lat] = event.nativeEvent.center;
    setZoom(event.nativeEvent.zoom);
    if (event.nativeEvent.zoom < 11) return; // za daleko, by wskazać miejsce
    if (!inPoland(lng, lat)) return;
    set({ location: { lng, lat } });
    if (geoTimer.current) clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(() => guessPlace(lng, lat), 700);
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak zgody', 'Możesz wskazać miejsce ręcznie, przesuwając mapę.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      cameraRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15, duration: 800 });
    } catch {
      Alert.alert('Nie udało się ustalić lokalizacji', 'Wskaż miejsce ręcznie, przesuwając mapę.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <AppText muted>
        Przesuń mapę tak, by pinezka wskazywała miejsce sprzedaży, albo użyj swojej lokalizacji.
      </AppText>
      <View
        style={[styles.mapBox, { borderColor: c.border }]}
        onTouchStart={() => onMapTouch?.(true)}
        onTouchEnd={() => onMapTouch?.(false)}
        onTouchCancel={() => onMapTouch?.(false)}>
        <Map style={styles.fill} mapStyle={env.mapStyleUrl} logo={false} onRegionDidChange={onRegionDidChange}>
          <Camera
            ref={cameraRef}
            initialViewState={
              location
                ? { center: [location.lng, location.lat], zoom: 14 }
                : { bounds: [POLAND_BOUNDS.west, POLAND_BOUNDS.south, POLAND_BOUNDS.east, POLAND_BOUNDS.north] }
            }
            maxBounds={[12.5, 48.0, 25.7, 55.6]}
          />
        </Map>
        <View pointerEvents="none" style={styles.pinWrap}>
          <MaterialIcons name="location-on" size={44} color={c.primary} style={styles.pin} />
        </View>
        {zoom < 11 ? (
          <View pointerEvents="none" style={[styles.hint, { backgroundColor: c.surface, borderColor: c.border }]}>
            <AppText variant="caption">Przybliż mapę, aby wskazać dokładne miejsce</AppText>
          </View>
        ) : null}
      </View>
      <Button
        title={locating ? 'Ustalam…' : 'Użyj mojej lokalizacji'}
        variant="secondary"
        onPress={useMyLocation}
        disabled={locating}
      />
      {locating ? <ActivityIndicator color={c.primary} /> : null}
      {location ? (
        <AppText variant="caption" muted>
          Współrzędne: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <AppText variant="label">Miejscowość</AppText>
        <TextInput
          value={placeName}
          onChangeText={(v) => set({ placeName: v })}
          placeholder="np. Grójec"
          placeholderTextColor={c.textMuted}
          maxLength={120}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
      </View>
      <View style={styles.field}>
        <AppText variant="label">Adres (opcjonalnie, prywatny)</AppText>
        <TextInput
          value={addressText}
          onChangeText={(v) => set({ addressText: v })}
          placeholder="ulica i numer — nie jest publikowany"
          placeholderTextColor={c.textMuted}
          maxLength={200}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
      </View>
      <Card>
        <AppText variant="label">Co zobaczą inni</AppText>
        <AppText variant="caption">
          Na mapie pokażemy punkt przybliżony do ok. 1 km i nazwę miejscowości. Dokładne miejsce i adres widzisz tylko Ty —
          kupującemu możesz podać je w wiadomości.
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fill: { flex: 1 },
  mapBox: { height: 320, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pin: { marginBottom: 40 },
  hint: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  field: { gap: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: 16 },
});
