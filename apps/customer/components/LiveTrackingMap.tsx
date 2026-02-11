import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, UIManager, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@mobile/ui";

type LatLng = { latitude: number; longitude: number };

function metersBetween(a: LatLng, b: LatLng) {
  // Haversine (good enough for short distances)
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function simplifyRoute(route: LatLng[], minMeters = 6): LatLng[] {
  if (!Array.isArray(route) || route.length < 3) return route;
  const out: LatLng[] = [route[0]];
  for (let i = 1; i < route.length - 1; i++) {
    const prev = out[out.length - 1];
    const cur = route[i];
    if (metersBetween(prev, cur) >= minMeters) out.push(cur);
  }
  out.push(route[route.length - 1]);
  return out;
}

function snapToPolyline(point: LatLng, polyline: LatLng[]): LatLng {
  if (!Array.isArray(polyline) || polyline.length < 2) return point;

  // Use a simple planar approximation on lat/lon degrees (fine for short distances).
  const toXY = (p: LatLng) => {
    const x = p.longitude * Math.cos((p.latitude * Math.PI) / 180);
    const y = p.latitude;
    return { x, y };
  };

  const p = toXY(point);
  let best = point;
  let bestDist2 = Number.POSITIVE_INFINITY;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a0 = polyline[i];
    const b0 = polyline[i + 1];
    const a = toXY(a0);
    const b = toXY(b0);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const abLen2 = abx * abx + aby * aby;
    const t = abLen2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2)) : 0;
    const projX = a.x + t * abx;
    const projY = a.y + t * aby;
    const dx = p.x - projX;
    const dy = p.y - projY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      // Convert back to lat/lon using inverse of the same approximation.
      best = {
        latitude: projY,
        longitude: projX / Math.cos((projY * Math.PI) / 180),
      };
    }
  }

  return best;
}

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
  const [follow, setFollow] = useState(true);

  const AnimatedRegion = (maps as any)?.AnimatedRegion;
  const animatedCoordRef = useRef<any>(null);

  const displayRoute = useMemo(() => {
    if (!Array.isArray(route) || route.length < 2) return route ?? null;
    return simplifyRoute(route, 6);
  }, [route]);

  const snappedRider = useMemo(() => {
    if (!rider) return null;
    if (!Array.isArray(displayRoute) || displayRoute.length < 2) return rider;
    // If rider is already close to route, snap for smoother visuals.
    const snapped = snapToPolyline(rider, displayRoute);
    const dist = metersBetween(rider, snapped);
    return dist <= 40 ? snapped : rider;
  }, [displayRoute, rider]);

  const riderAnimated = useMemo(() => {
    if (!snappedRider || !AnimatedRegion) return null;
    if (!animatedCoordRef.current) {
      animatedCoordRef.current = new AnimatedRegion({
        latitude: snappedRider.latitude,
        longitude: snappedRider.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
    }
    return animatedCoordRef.current;
  }, [AnimatedRegion, snappedRider]);

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
    if (!snappedRider || !riderAnimated) return;

    // Some builds expose `timing`, others expose `spring`.
    const anim = (riderAnimated as any).timing
      ? (riderAnimated as any).timing({
          latitude: snappedRider.latitude,
          longitude: snappedRider.longitude,
          duration: 650,
          useNativeDriver: false,
        })
      : (riderAnimated as any).spring
        ? (riderAnimated as any).spring({
            latitude: snappedRider.latitude,
            longitude: snappedRider.longitude,
            stiffness: 110,
            damping: 18,
            mass: 1,
            useNativeDriver: false,
          })
        : null;

    if (anim?.start) anim.start();
  }, [snappedRider, riderAnimated]);

  // Keep the map framed nicely for rider + destination or full route.
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    if (!follow) return;

    const coords =
      Array.isArray(displayRoute) && displayRoute.length >= 2
        ? displayRoute
        : snappedRider && destination
          ? [snappedRider, destination]
          : null;

    if (!coords || coords.length < 2) return;

    // fitToCoordinates is available on MapView refs.
    if (typeof ref.fitToCoordinates === "function") {
      ref.fitToCoordinates(coords, {
        edgePadding: { top: 42, right: 42, bottom: 42, left: 42 },
        animated: true,
      });
    }
  }, [destination, displayRoute, follow, snappedRider]);

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
        onPanDrag={() => setFollow(false)}
      >
        {destination ? <Marker coordinate={destination} title="Delivery" /> : null}
        {snappedRider ? (
          riderAnimated && AnimatedMarker ? (
            <AnimatedMarker coordinate={riderAnimated} title="Rider" />
          ) : (
            <Marker coordinate={snappedRider} title="Rider" />
          )
        ) : null}
        {Array.isArray(displayRoute) && displayRoute.length >= 2 ? (
          <Polyline coordinates={displayRoute} strokeWidth={4} strokeColor="#168E6A" />
        ) : snappedRider && destination ? (
          <Polyline coordinates={[snappedRider, destination]} strokeWidth={3} strokeColor="#168E6A" />
        ) : null}
      </MapView>

      {!follow ? (
        <Pressable
          onPress={() => setFollow(true)}
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            ...(Platform.OS === "ios"
              ? { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }
              : { elevation: 3 }),
          }}
        >
          <Ionicons name="locate-outline" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
