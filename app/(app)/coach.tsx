import { Text } from "react-native";
import { MissionGate, MissionShell, missionStyles as s } from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { useMission } from "@/lib/trail/mission-context";
export default function RaceTeamScreen() {
  const { mission } = useMission();
  return <MissionShell title="Race decisions" subtitle={mission?.event.name ?? "Evidence before advice"}><MissionGate><TrailPanel style={s.panel}><Text style={s.label}>RACE-SPECIFIC AI NOT AVAILABLE YET</Text><Text style={s.heading}>No decision has been generated.</Text><Text style={s.body}>The saved race is not yet connected to a reviewed evidence-and-decision pipeline. The existing generic coach cannot assess this mission, so this screen does not send it your race or pretend its replies are race-specific advice.</Text><Text style={s.body}>A real proposal must cite eligible evidence, name missing information, and show the change for your approval. Until that flow is implemented and evaluated, no confidence score or sample recommendation is displayed.</Text></TrailPanel></MissionGate></MissionShell>;
}
