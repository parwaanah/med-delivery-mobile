import React, { useEffect, useMemo, useRef } from "react";
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
  const mapRef = useRef<any>(null);

  const AnimatedRegion = (maps as any)?.AnimatedRegion;
  const animatedCoordRef = useRef<any>(null);
  const riderAnimated = useMemo(() => {
    if (!rider || !AnimatedRegion) return null;
    if (!animatedCoordRef.current) {
      animatedCoordRef.current = new AnimatedRegion({
        latitude: rider.latitude,
        longitude: rider.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
    }
    return animatedCoordRef.current;
  }, [AnimatedRegion, rider]);

  if (!available || (!rider && !destination)) {
    return null;
  }

  const MapView = maps.default ?? maps.MapView ?? maps;
  const Marker = maps.Marker;
  const Polyline = maps.Polyline;
  const AnimatedMarker = (Marker as any)?.Animated ?? (maps as any)?.MarkerAnimated ?? null;

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

  // Smoothly animate rider marker when coordinates change (when supported by native maps).
  useEffect(() => {
    if (!rider || !riderAnimated) return;

    // Some builds expose `timing`, others expose `spring`.
    const anim = (riderAnimated as any).timing
      ? (riderAnimated as any).timing({
          latitude: rider.latitude,
          longitude: rider.longitude,
          duration: 650,
          useNativeDriver: false,
        })
      : (riderAnimated as any).spring
        ? (riderAnimated as any).spring({
            latitude: rider.latitude,
            longitude: rider.longitude,
            stiffness: 110,
            damping: 18,
            mass: 1,
            useNativeDriver: false,
          })
        : null;

    if (anim?.start) anim.start();
  }, [rider, riderAnimated]);

  // Keep the map framed nicely for rider + destination or full route.
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;

    const coords =
      Array.isArray(route) && route.length >= 2
        ? route
        : rider && destination
          ? [rider, destination]
          : null;

    if (!coords || coords.length < 2) return;

    // fitToCoordinates is available on MapView refs.
    if (typeof ref.fitToCoordinates === "function") {
      ref.fitToCoordinates(coords, {
        edgePadding: { top: 42, right: 42, bottom: 42, left: 42 },
        animated: true,
      });
    }
  }, [destination, rider, route]);

  return (
    <View style={{ flex: 1, overflow: "hidden", borderRadius: 18 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={Platform.OS === "android"}
        loadingEnabled
      >
        {destination ? <Marker coordinate={destination} title="Delivery" /> : null}
        {rider ? (
          riderAnimated && AnimatedMarker ? (
            <AnimatedMarker coordinate={riderAnimated} title="Rider" />
          ) : (
            <Marker coordinate={rider} title="Rider" />
          )
        ) : null}
        {Array.isArray(route) && route.length >= 2 ? (
          <Polyline coordinates={route} strokeWidth={4} strokeColor="#168E6A" />
        ) : rider && destination ? (
          <Polyline coordinates={[rider, destination]} strokeWidth={3} strokeColor="#168E6A" />
        ) : null}
      </MapView>
    </View>
  );
}
