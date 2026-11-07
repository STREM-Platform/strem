/**
 * Race photography with attribution, and an honest graphic fallback.
 *
 * Every photo shows its credit and licence (race-media-policy). Without a photo
 * the hero uses a generated topographic graphic that is never presented as the
 * event. The scrim keeps text legible regardless of the image.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { C, ui } from "@/constants/theme";
import type { CoverMedia } from "@/lib/api/race-missions";

export function PhotoCredit({ cover, style }: { cover: CoverMedia; style?: StyleProp<ViewStyle> }) {
  const generated = cover.provider === "generated";
  const text = generated ? `AI-generated image · ${cover.creator ?? "image model"}` : [cover.creator ? `Photo: ${cover.creator}` : "Photo", cover.license].filter(Boolean).join(" · ");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${text}. Open the photo's source page`}
      onPress={() => void Linking.openURL(cover.source_url)}
      hitSlop={8}
      style={style}
    >
      <Text style={styles.credit} numberOfLines={1}>
        {text}
        {cover.depicts !== "event" && !generated ? " · atmosphere" : ""}
      </Text>
    </Pressable>
  );
}

export function TopoArt({ seed = 1, tint = C.accent }: { seed?: number; tint?: string }) {
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = 120 + i * 46;
    const a = 30 + ((seed * (i + 3)) % 40);
    return `M-40 ${y} C 60 ${y - a}, 140 ${y + a * 0.6}, 220 ${y - a * 0.4} S 380 ${y - a}, 460 ${y + 10}`;
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["#1a2420", "#0f1513", C.ink]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 420 560" preserveAspectRatio="xMidYMid slice">
        <Path d="M0 360 L90 250 L140 300 L215 170 L265 240 L320 190 L420 330 L420 560 L0 560 Z" fill="#0b100e" opacity={0.85} />
        <Path d="M215 170 L238 205 L222 212 L205 196 Z" fill={C.text} opacity={0.18} />
        {lines.map((d, i) => (
          <Path key={i} d={d} stroke={i % 3 ? C.text : tint} strokeOpacity={i % 3 ? 0.05 : 0.09} strokeWidth={1} fill="none" />
        ))}
      </Svg>
    </View>
  );
}

/**
 * Full-bleed hero media. `children` render over the scrim (bottom-aligned).
 */
export function HeroMedia({
  cover,
  height,
  children,
  seed,
  overlayTop,
}: {
  cover: CoverMedia | null | undefined;
  height: number;
  children?: ReactNode;
  seed?: number;
  overlayTop?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const usable = cover && !failed;
  const content = (
    <>
      <LinearGradient
        colors={["rgba(8,9,11,0.55)", "rgba(8,9,11,0.0)", "rgba(8,9,11,0.5)", "rgba(8,9,11,0.92)", C.ink]}
        locations={[0, 0.2, 0.45, 0.8, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {overlayTop ? <View style={styles.top}>{overlayTop}</View> : null}
      <View style={styles.bottom}>{children}</View>
      {usable && cover ? <PhotoCredit cover={cover} style={styles.creditWrap} /> : null}
    </>
  );
  if (usable && cover) {
    return (
      <ImageBackground
        source={{ uri: cover.url }}
        onError={() => setFailed(true)}
        resizeMode="cover"
        accessibilityLabel={cover.title ?? "Race photo"}
        style={[styles.hero, { height }]}
      >
        {content}
      </ImageBackground>
    );
  }
  return (
    <View style={[styles.hero, { height }]}>
      <TopoArt seed={seed} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", overflow: "hidden", backgroundColor: C.night, justifyContent: "flex-end" },
  top: { position: "absolute", top: 0, left: 0, right: 0 },
  bottom: { width: "100%" },
  creditWrap: { position: "absolute", right: 14, top: 0, paddingTop: 6 },
  credit: { ...ui(10, 600), color: "rgba(244,245,246,0.72)", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4, maxWidth: 260 },
});
