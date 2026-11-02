import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { errorMessage, POLAND_CENTER, POLAND_ZOOM } from '@pzr/shared';
import { palette, radius, spacing } from '@pzr/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { env } from '@/lib/env';
import { useThemeColors } from '@/lib/theme';

import { useMapPoints, type Viewport } from './useMapPoints';

// Liczba ofert w klastrze: klastry z serwera mają `count`, klastry z telefonu sumują `count` w `sum`.
const COUNT = ['coalesce', ['get', 'sum'], ['get', 'count']] as const;
const IS_CLUSTER = ['any', ['has', 'point_count'], ['==', ['get', 'cluster'], true]] as const;

export function MapScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [locating, setLocating] = useState(false);
  const { data, isFetching, error } = useMapPoints(viewport);

  const geojson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (data ?? []).map((p, i) => ({
        type: 'Feature',
        id: p.id ?? `cluster-${i}`,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          listingId: p.id,
          cluster: p.is_cluster,
          count: p.point_count,
          color: p.color ?? palette.rust500,
          title: p.title,
        },
      })),
    }),
    [data],
  );

  function onRegionDidChange(event: NativeSyntheticEvent<ViewStateChangeEvent>) {
    const { bounds, zoom } = event.nativeEvent;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setViewport({ bounds, zoom }), 300);
  }

  function onPressFeature(event: NativeSyntheticEvent<{ features: GeoJSON.Feature[] }>) {
    const feature = event.nativeEvent.features[0];
    if (!feature || feature.geometry.type !== 'Point') return;
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const props = feature.properties ?? {};
    if (props.point_count !== undefined || props.cluster === true) {
      cameraRef.current?.easeTo({ center: [lng, lat], zoom: (viewport?.zoom ?? POLAND_ZOOM) + 2, duration: 400 });
      return;
    }
    if (typeof props.listingId === 'string') {
      router.push({ pathname: '/ogloszenie/[id]', params: { id: props.listingId } });
    }
  }

  async function goToMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak zgody', 'Bez zgody na lokalizację możesz przesuwać mapę ręcznie lub wyszukać miejscowość.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      cameraRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 11, duration: 800 });
    } catch {
      Alert.alert('Nie udało się ustalić lokalizacji', 'Spróbuj ponownie lub przesuń mapę ręcznie.');
    } finally {
      setLocating(false);
    }
  }

  const empty = !isFetching && !error && data !== undefined && data.length === 0;

  return (
    <View style={styles.fill}>
      <Map
        style={styles.fill}
        mapStyle={env.mapStyleUrl}
        logo={false}
        compassHiddenFacingNorth
        onRegionDidChange={onRegionDidChange}>
        <Camera ref={cameraRef} initialViewState={{ center: POLAND_CENTER, zoom: POLAND_ZOOM }} />
        <GeoJSONSource
          id="listings"
          data={geojson}
          cluster
          clusterRadius={44}
          clusterMaxZoom={14}
          clusterProperties={{ sum: ['+', ['coalesce', ['get', 'count'], 1]] }}
          onPress={onPressFeature}>
          <Layer
            id="clusters"
            type="circle"
            filter={IS_CLUSTER as never}
            paint={{
              'circle-color': palette.rust500,
              'circle-opacity': 0.9,
              'circle-radius': ['step', COUNT, 16, 10, 20, 50, 26] as never,
              'circle-stroke-width': 2,
              'circle-stroke-color': palette.white,
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={IS_CLUSTER as never}
            layout={{
              'text-field': ['to-string', COUNT] as never,
              'text-font': ['Noto Sans Bold'],
              'text-size': 13,
              'text-allow-overlap': true,
            }}
            paint={{ 'text-color': palette.white }}
          />
          <Layer
            id="points"
            type="circle"
            filter={['!', IS_CLUSTER] as never}
            paint={{
              'circle-color': ['get', 'color'] as never,
              'circle-radius': 9,
              'circle-stroke-width': 2,
              'circle-stroke-color': palette.white,
            }}
          />
        </GeoJSONSource>
      </Map>

      <View pointerEvents="box-none" style={[styles.top, { top: insets.top + spacing.sm }]}>
        {isFetching ? (
          <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator size="small" color={c.primary} />
            <AppText variant="caption">Wczytuję oferty…</AppText>
          </View>
        ) : error ? (
          <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.danger }]}>
            <AppText variant="caption">{errorMessage(error)}</AppText>
          </View>
        ) : empty ? (
          <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border }]}>
            <AppText variant="caption">Brak ofert w tym obszarze</AppText>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pokaż moją lokalizację"
        onPress={goToMyLocation}
        style={[styles.fab, { backgroundColor: c.surface, borderColor: c.border }]}>
        {locating ? <ActivityIndicator color={c.primary} /> : <MaterialIcons name="my-location" size={24} color={c.primary} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});
