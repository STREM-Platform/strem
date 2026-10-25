import { Stack, usePathname } from "expo-router";

import { AppShell } from "@/components/shell/app-shell";
import { RaceProvider } from "@/lib/race/race-context";
import { useAuth } from "@/lib/session/auth-context";

// Focused flows take the whole screen; everything else lives in the app frame.
const FULL_SCREEN = ["/mission-setup", "/debrief"];

function Frame() {
  const pathname = usePathname();
  const stack = <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
  if (FULL_SCREEN.some((path) => pathname.startsWith(path))) return stack;
  return <AppShell>{stack}</AppShell>;
}

export default function AppLayout() {
  const { user } = useAuth();
  return (
    <RaceProvider key={user?.user_id ?? "signed-out"}>
      <Frame />
    </RaceProvider>
  );
}
