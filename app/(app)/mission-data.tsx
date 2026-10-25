import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Share, Text, View } from "react-native";

import { Input } from "@/components/ui/fields";
import { Body, Button, Card, ErrorBanner, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { C, ui } from "@/constants/theme";
import { raceMissions, type MissionExport } from "@/lib/api/race-missions";
import { useRace } from "@/lib/race/race-context";

const PHRASE = "DELETE MY RACE MISSIONS";

export default function MissionDataScreen() {
  const router = useRouter();
  const race = useRace();
  const [data, setData] = useState<MissionExport | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await raceMissions.exportData());
    } catch {
      setError("Your export could not be loaded. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "strem-race-missions.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      await Share.share({ title: "STREM Race Mission export", message: json });
    }
  };
  const erase = async () => {
    if (busy || confirmation !== PHRASE) return;
    setBusy(true);
    setError(null);
    try {
      await raceMissions.deleteData();
      setData(null);
      setConfirmation("");
      await race.reloadMissions();
      setMessage("Your missions, Race Lab layers, training plans, course files and revision history were deleted. Your account, training activities and race history were not touched.");
    } catch {
      setError("Deletion was not confirmed. Retry to finish the cleanup — edits may pause until it completes.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Row>
        <IconButton icon="chevronL" label="Back" onPress={() => router.back()} tone="surface" />
      </Row>
      <View style={{ gap: 6 }}>
        <Overline>Data controls</Overline>
        <Title size={40}>Your mission data</Title>
        <Body muted>Missions, Race Lab layers, training plans, course files and revision history. Export a copy anytime, or delete it all.</Body>
      </View>
      {message ? <Notice icon="checkCircle" tone="accent" title="Deleted" body={message} /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      <Card pad={18} style={{ gap: 12 }}>
        <Text style={[ui(16, 700), { color: C.text }]}>Export</Text>
        <Button label={data ? "Reload export" : "Prepare my export"} icon="download" kind="secondary" loading={busy && !data} onPress={() => void load()} />
        {data ? (
          <>
            <Text style={[ui(13, 500), { color: C.textMuted }]}>
              {data.missions.length} missions · {data.layers?.length ?? 0} layers · {data.plans?.length ?? 0} plans · {data.courses?.length ?? 0} courses · {data.revisions.length} revisions
            </Text>
            <Button label="Download JSON" icon="download" onPress={() => void download().catch(() => setError("The export couldn't be saved. Try again."))} />
          </>
        ) : null}
      </Card>
      <Card tone="flame" pad={18} style={{ gap: 12 }}>
        <Text style={[ui(16, 700), { color: C.text }]}>Delete all mission data</Text>
        <Body muted size={14}>
          Permanently deletes every active, completed and archived mission with its layers, plans, course files and history. This cannot be undone. Export first if you want a copy.
        </Body>
        <Input label={`Type ${PHRASE} to confirm`} value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" />
        <Button label="Permanently delete" kind="danger" icon="trash" loading={busy && Boolean(confirmation)} disabled={confirmation !== PHRASE} onPress={() => void erase()} />
      </Card>
    </Page>
  );
}
