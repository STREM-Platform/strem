import { Stack, usePathname } from "expo-router";
import { View } from "react-native";

import { AppShell } from "@/components/shell/app-shell";
import { C } from "@/constants/theme";
import { RaceProvider } from "@/lib/race/race-context";
import { useAuth } from "@/lib/session/auth-context";

// Focused flows take the whole screen; everything else lives in the app frame.
const FULL_SCREEN = ["/mission-setup", "/debrief", "/race-day"];

function Frame() {
  const pathname = usePathname();
  const stack = <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
  if (FULL_SCREEN.some((path) => pathname.startsWith(path))) return stack;
  return <AppShell>{stack}</AppShell>;
}

export default function AppLayout() {
  const { phase, user } = useAuth();
  // Wait for the restored session: mounting first and re-keying on the user
  // later would remount every screen (dropping taps) and load all data twice.
  if (phase !== "signedIn" || !user) return <View style={{ flex: 1, backgroundColor: C.ink }} />;
  return (
    <RaceProvider key={user.user_id}>
      <Frame />
    </RaceProvider>
  );
}
