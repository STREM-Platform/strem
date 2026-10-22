import { Text } from "react-native";
import { MissionGate, MissionShell, missionStyles as s } from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { useMission } from "@/lib/trail/mission-context";
import { CourseWorkspace } from "@/components/trail/course-workspace";
export default function RaceLabScreen() {
  const { mission } = useMission();
  return <MissionShell title="Race Lab" subtitle={mission?.event.name ?? "Understand your event"}><MissionGate>{mission && <>
    <TrailPanel style={s.panel}><Text style={s.label}>SAVED EVENT FACTS / ATHLETE ENTRY</Text><Text style={s.heading}>{mission.event.distance_km} km · {mission.event.elevation_gain_m === null ? "Ascent unknown" : `${mission.event.elevation_gain_m} m ascent`}</Text><Text style={s.body}>Cutoff: {mission.event.cutoff_minutes === null ? "not entered" : `${mission.event.cutoff_minutes} minutes`}. These facts have not been verified against organizer data.</Text></TrailPanel>
    <CourseWorkspace key={mission.id} missionId={mission.id} />
    <TrailPanel style={s.panel}><Text style={s.heading}>Rehearsals and race operations</Text><Text style={s.body}>Fueling, equipment, conditions and logistics have not been assessed. There is no live weather forecast or race-week checklist yet.</Text></TrailPanel>
  </>}</MissionGate></MissionShell>;
}
