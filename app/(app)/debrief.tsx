import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Choices, Input, Scale } from "@/components/ui/fields";
import { Body, Button, EmptyState, ErrorBanner, IconButton, Notice, Overline, Page, Row, Title } from "@/components/ui/kit";
import { ApiError } from "@/lib/api/client";
import { raceMissions } from "@/lib/api/race-missions";
import { parseFinishTime, requestKey } from "@/lib/race/format";
import { useRace } from "@/lib/race/race-context";

export default function DebriefScreen() {
  const router = useRouter();
  const race = useRace();
  const mission = race.mission;
  const [status, setStatus] = useState<"finished" | "dnf" | "dns">("finished");
  const [time, setTime] = useState("");
  const [placement, setPlacement] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lessons, setLessons] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(requestKey());
  if (!mission) {
    return (
      <Page>
        <EmptyState title="No race to debrief" />
      </Page>
    );
  }
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await raceMissions.complete(
        mission,
        {
          status,
          finish_minutes: status === "finished" ? parseFinishTime(time) : null,
          placement: placement.trim() || null,
          rating,
          notes: notes.trim() || null,
          lessons: lessons.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10),
        },
        key.current,
      );
      await race.reloadMissions();
      router.replace("/(app)/history");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving wasn't confirmed. Retry — it's safe.");
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
        <Overline>Debrief · {mission.event.name}</Overline>
        <Title size={40}>How did it go?</Title>
        <Body muted>Whatever happened, this is the most valuable data you’ll ever give your race team. It becomes part of your race history.</Body>
      </View>
      {error ? <ErrorBanner message={error} /> : null}
      <Choices
        options={[
          { value: "finished", label: "Finished" },
          { value: "dnf", label: "Did not finish" },
          { value: "dns", label: "Did not start" },
        ]}
        value={status}
        onChange={(v) => setStatus(v as typeof status)}
      />
      {status === "finished" ? (
        <Row gap={10} wrap align="flex-start">
          <Input label="Finish time" value={time} onChangeText={setTime} placeholder="h:mm" keyboardType="numbers-and-punctuation" />
          <Input label="Placing (optional)" value={placement} onChangeText={setPlacement} placeholder="e.g. 42 / 310" />
        </Row>
      ) : null}
      <Scale label="How do you rate your race?" value={rating} onChange={setRating} low="Rough" high="Best ever" />
      <Input label="What happened" value={notes} onChangeText={setNotes} multiline placeholder="Pacing, fueling, gear, the low point, the high point…" />
      <Input label="Lessons for next time (one per line)" value={lessons} onChangeText={setLessons} multiline placeholder={"Start the first climb slower\nCarry more salt in heat"} />
      <Notice icon="info" title="This completes the mission" body="Your plan and Race Lab become read-only and the result joins your race history. Start your next mission whenever you're ready." />
      <Button label="Complete mission" icon="trophy" size="lg" loading={busy} onPress={() => void save()} />
    </Page>
  );
}
