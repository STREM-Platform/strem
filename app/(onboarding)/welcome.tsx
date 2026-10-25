import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Icon, type IconName } from "@/components/ui/icon";
import { Row } from "@/components/ui/kit";
import { C, LAYER_COLOR, ui } from "@/constants/theme";
import { routeForScreen } from "@/lib/onboarding";

const PROMISES: { icon: IconName; color: string; title: string; body: string }[] = [
  { icon: "calendar", color: LAYER_COLOR.training, title: "A plan for your race", body: "Every week from today to the start line, built around your life." },
  { icon: "mountain", color: LAYER_COLOR.course, title: "Race Lab", body: "Course, pacing, fueling, gear and logistics — sequenced to race morning." },
  { icon: "sparkles", color: C.accent, title: "An AI race team", body: "Reads your training, races and check-ins, and tells you what matters today." },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <OnboardingScaffold
      screen="welcome"
      title="Your race. Every layer handled."
      subtitle="Trail ultra, marathon, Ironman, gran fondo or your own impossible challenge — tell STREM what you're preparing for."
      primaryLabel="Get started"
      onPrimary={() => router.push(routeForScreen("identity"))}
    >
      {PROMISES.map((p) => (
        <Row key={p.title} gap={14} align="flex-start">
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${p.color}22` }}>
            <Icon name={p.icon} size={20} color={p.color} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ui(16, 700), { color: C.text }]}>{p.title}</Text>
            <Text style={[ui(14, 500), { color: C.textMuted, lineHeight: 20 }]}>{p.body}</Text>
          </View>
        </Row>
      ))}
    </OnboardingScaffold>
  );
}
