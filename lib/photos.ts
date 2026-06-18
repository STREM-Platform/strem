/**
 * Athlete photography used across the AI surfaces. Static `require`s so Metro
 * bundles them; every photo-backed surface also renders a `HeroBackdrop`
 * underneath so it degrades gracefully if an image is missing.
 */

import type { ImageSourcePropType } from "react-native";

export const PHOTOS: Record<string, ImageSourcePropType> = {
  heroRun: require("../assets/img/hero-run.png"),
  run: require("../assets/img/run.png"),
  strength: require("../assets/img/strength.png"),
  hyrox: require("../assets/img/hyrox.png"),
  profileBg: require("../assets/img/profile-bg.png"),
  fuel: require("../assets/img/fuel.png"),
  tribe: require("../assets/img/tribe.jpg"),
  coachData: require("../assets/img/coach-data.jpg"),
};
