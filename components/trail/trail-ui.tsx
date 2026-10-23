import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Trail } from "@/constants/theme";

export function TrailAtmosphere({ quiet = false }: { quiet?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#121715", Trail.bg, "#060708"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.atmosphereGlow, quiet && styles.atmosphereGlowQuiet]} />
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={styles.topography}>
        <Circle cx="338" cy="112" r="118" fill="none" stroke={Trail.lime} strokeOpacity={quiet ? 0.035 : 0.055} strokeWidth="1" />
        <Circle cx="338" cy="112" r="90" fill="none" stroke={Trail.lime} strokeOpacity={quiet ? 0.025 : 0.045} strokeWidth="1" />
        <Path d="M-45 195C35 119 91 154 143 119S239 45 435 112" fill="none" stroke={Trail.text} strokeOpacity="0.045" strokeWidth="1" />
        <Path d="M-55 226C24 150 92 188 153 146S274 70 446 143" fill="none" stroke={Trail.text} strokeOpacity="0.04" strokeWidth="1" />
        <Path d="M-70 259C20 184 92 218 167 177S295 105 462 177" fill="none" stroke={Trail.text} strokeOpacity="0.035" strokeWidth="1" />
        <Path d="M-74 689C27 610 74 657 147 608S276 532 452 601" fill="none" stroke={Trail.lime} strokeOpacity="0.035" strokeWidth="1" />
        <Path d="M-75 727C27 650 85 695 159 647S291 572 454 639" fill="none" stroke={Trail.lime} strokeOpacity="0.03" strokeWidth="1" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  atmosphereGlow: { position: "absolute", width: 430, height: 430, borderRadius: 215, top: -245, right: -195, backgroundColor: "rgba(255,255,255,0.03)", boxShadow: "0px 0px 110px rgba(255,255,255,0.04)" },
  atmosphereGlowQuiet: { opacity: 0.55 },
  topography: { position: "absolute", inset: 0 },
});
