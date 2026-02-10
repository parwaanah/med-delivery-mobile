import React, { useMemo } from "react";
import { Platform, UIManager, View } from "react-native";

type LatLng = { latitude: number; longitude: number };

function hasNativeMaps(): boolean {
  try {
    // react-native-maps registers these native view managers.
    const getCfg = (name: string) =>
      (UIManager as any).getViewManagerConfig?.(name) ?? (UIManager as any)[name];

    return Boolean(getCfg("AIRMap") || getCfg("AIRGoogleMap"));
  } catch {
    return false;
  }
}

function tryRequireMaps(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-maps");
  } catch {
    return null;
  }
}

export function isLiveMapAvailable(): boolean {
  const maps = tryRequireMaps();
  return Boolean(maps) && hasNativeMaps();
}

export function LiveTrackingMap({
  rider,
  destination,
  route,
}: {
  rider: LatLng | null;
  destination: LatLng | null;
  route?: LatLng[] | null;
}) {
  const maps = useMemo(() => tryRequireMaps(), []);
  const available = Boolean(maps) && hasNativeMaps();

  if (!available || (!rider && !destination)) {
    return null;
  }

  const MapView = maps.default ?? maps.MapView ?? maps;
  const Marker = maps.Marker;
  const Polyline = maps.Polyline;

  const points = [rider, destination].filter(Boolean) as LatLng[];
  const region = (() => {
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    const lon = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const latDelta = Math.max(0.01, (Math.max(...lats) - Math.min(...lats)) * 1.8);
    const lonDelta = Math.max(0.01, (Math.max(...lons) - Math.min(...lons)) * 1.8);
    return { latitude: lat, longitude: lon, latitudeDelta: latDelta, longitudeDelta: lonDelta };
  })();

  return (
    <View style={{ flex: 1, overflow: "hidden", borderRadius: 18 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={Platform.OS === "android"}
        loadingEnabled
      >
        {destination ? <Marker coordinate={destination} title="Delivery" /> : null}
        {rider ? <Marker coordinate={rider} title="Rider" /> : null}
        {Array.isArray(route) && route.length >= 2 ? (
          <Polyline coordinates={route} strokeWidth={4} strokeColor="#168E6A" />
        ) : rider && destination ? (
          <Polyline coordinates={[rider, destination]} strokeWidth={3} strokeColor="#168E6A" />
        ) : null}
      </MapView>
    </View>
  );
}
