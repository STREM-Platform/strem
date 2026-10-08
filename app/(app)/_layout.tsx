import { Stack } from "expo-router";
import { useAuth } from "@/lib/session/auth-context";
import { MissionProvider } from "@/lib/trail/mission-context";

export default function AppLayout() {
  const { user } = useAuth();
  return <MissionProvider key={user?.user_id ?? "signed-out"}><Stack screenOptions={{ headerShown: false }} /></MissionProvider>;
}
