import { useState } from "react";
import { Platform, Share, Text, TextInput, View } from "react-native";
import { MissionButton, MissionShell, missionStyles as s } from "@/components/trail/mission-shell";
import { TrailPanel } from "@/components/trail/trail-ui";
import { Trail } from "@/constants/theme";
import { raceMissions, type MissionExport } from "@/lib/api/race-missions";
import { useMission } from "@/lib/trail/mission-context";

export default function MissionDataScreen() {
  const { reload } = useMission();
  const [data, setData] = useState<MissionExport | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = async () => {
    setBusy(true); setMessage(null);
    try { setData(await raceMissions.exportData()); }
    catch { setMessage("Mission export could not be loaded. No data has been changed."); }
    finally { setBusy(false); }
  };
  const exportData = async () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "strem-race-missions.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else { await Share.share({ title: "STREM Race Mission export", message: json }); }
  };
  const erase = async () => {
    if (busy || confirmation !== "DELETE MY RACE MISSIONS") return;
    setBusy(true); setMessage(null);
    try { await raceMissions.deleteData(); setData(null); setConfirmation(""); await reload(); setMessage("Your Race Missions, revision history and request receipts were deleted. Other account data was not changed."); }
    catch { setMessage("Deletion was not confirmed. Reload the export to check the saved state before retrying."); }
    finally { setBusy(false); }
  };
  return <MissionShell title="Your mission data." subtitle="Private race records and revision history. These controls affect Race Missions only.">
    <TrailPanel style={s.panel}><Text style={s.heading}>Saved and archived missions</Text><MissionButton label={busy ? "Working…" : "Load my mission records"} disabled={busy} onPress={() => void load()} />
      {data && <><Text style={s.body}>{data.missions.length} missions · {data.revisions.length} revisions · exported {new Date(data.exported_at).toLocaleString()}</Text>{data.missions.map((mission) => <View key={mission.id}><Text style={s.heading}>{mission.event.name}</Text><Text style={s.body}>{mission.event.race_date} · {mission.state} · version {mission.version}</Text></View>)}<MissionButton secondary label="Export JSON" onPress={() => void exportData().catch(() => setMessage("Export could not be saved or shared. Try again."))} /></>}
    </TrailPanel>
    <TrailPanel style={s.panel}><Text style={s.heading}>Delete my Race Mission data</Text><Text style={s.body}>Permanently deletes all your active and archived missions, revisions and replay receipts. This cannot be undone. It does not delete your account, training records, connected sources or AI history. Download your export first if you need a copy.</Text><Text style={s.body}>Type DELETE MY RACE MISSIONS to confirm.</Text><TextInput accessibilityLabel="Deletion confirmation" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" style={{ minHeight: 48, color: Trail.text, borderColor: Trail.lineStrong, borderWidth: 1, padding: 12, borderRadius: 8 }} /><MissionButton secondary label="Permanently delete mission data" disabled={busy || confirmation !== "DELETE MY RACE MISSIONS"} onPress={() => void erase()} /></TrailPanel>
    {message && <Text accessibilityRole="alert" style={s.body}>{message}</Text>}
  </MissionShell>;
}
