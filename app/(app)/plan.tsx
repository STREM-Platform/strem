import { useRouter } from "expo-router";
import { Text } from "react-native";
import { MissionButton, MissionGate, MissionShell, missionStyles as s } from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { useMission } from "@/lib/trail/mission-context";
export default function PlanScreen() {
  const { mission } = useMission(); const router = useRouter();
  return <MissionShell title="Preparation plan" subtitle={mission?.event.name ?? "Your race-specific preparation"}><MissionGate><TrailPanel style={s.panel}><Text style={s.label}>NOT GENERATED</Text><Text style={s.heading}>Your plan needs real evidence.</Text><Text style={s.body}>Race details are saved. A preparation plan is not available yet: the trail constraints, evidence assessment and reviewed planning flow have not been connected. No example sessions are shown as your training.</Text><MissionButton secondary label="Review athlete context" onPress={() => router.push("/(app)/athlete-profile")} /></TrailPanel></MissionGate></MissionShell>;
}
