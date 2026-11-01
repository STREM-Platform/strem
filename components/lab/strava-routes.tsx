/** Pick one of the athlete's Strava routes (training#19). */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Body, Button, ErrorBanner, Row } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { C, ui } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { sourcesApi, type StravaRoute } from "@/lib/api/race";
import { km } from "@/lib/race/format";

export function StravaRoutesSheet({ visible, onClose, onPick, busy }: { visible: boolean; onClose: () => void; onPick: (route: StravaRoute) => void; busy?: boolean }) {
  const router = useRouter();
  const [routes, setRoutes] = useState<StravaRoute[] | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    sourcesApi
      .stravaRoutes()
      .then((items) => live && setRoutes(items))
      .catch((err) => {
        if (!live) return;
        setRoutes([]);
        setError(err instanceof ApiError ? { code: err.code, message: err.message } : { code: "error", message: "Your Strava routes could not load." });
      });
    return () => {
      live = false;
      setRoutes(null);
      setError(null);
    };
  }, [visible]);

  const connect = error?.code === "not_connected" || error?.code === "strava_scope_missing";
  return (
    <Sheet visible={visible} onClose={onClose} title="Your Strava routes">
      {routes === null ? <ActivityIndicator color={C.textMuted} /> : null}
      {error ? <ErrorBanner message={error.message} /> : null}
      {connect ? (
        <Button
          label={error?.code === "not_connected" ? "Connect Strava" : "Reconnect Strava"}
          icon="link"
          onPress={() => {
            onClose();
            router.push("/(app)/integrations");
          }}
        />
      ) : null}
      {routes && routes.length === 0 && !error ? <Body muted>No routes on your Strava account yet. Create the race route in Strava (or save the organiser&apos;s), then come back.</Body> : null}
      <View style={{ gap: 8 }}>
        {(routes ?? []).map((route) => (
          <Pressable
            key={route.id}
            accessibilityRole="button"
            accessibilityLabel={`Use ${route.name}, ${km(route.distance_km)} km`}
            disabled={busy}
            onPress={() => onPick(route)}
            style={({ pressed }) => [styles.route, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.icon}>
              <Icon name={route.kind === "ride" ? "bike" : "route"} size={18} color={C.text} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[ui(15, 700), { color: C.text }]} numberOfLines={1}>
                {route.name}
              </Text>
              <Text style={[ui(12, 500), { color: C.textMuted }]}>
                {km(route.distance_km)} km · +{route.elevation_gain_m} m{route.private ? " · private" : ""}
              </Text>
            </View>
            {busy ? <ActivityIndicator color={C.textMuted} /> : <Icon name="chevron" size={16} color={C.textDim} />}
          </Pressable>
        ))}
      </View>
      <Row gap={8} align="flex-start">
        <Icon name="lock" size={14} color={C.textDim} />
        <Text style={[ui(12, 500), { color: C.textDim, flex: 1, lineHeight: 17 }]}>The route is exported from Strava as GPX and kept private to your account.</Text>
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  route: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.surface2 },
});
