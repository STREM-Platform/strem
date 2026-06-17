/**
 * Athlete photography used by the AI surfaces (Today run, Train strength, Profile
 * summit, League tribe), lifted from the prototype's `assets/img/`. Static
 * `require`s so Metro bundles them; every photo-backed surface also renders a
 * `HeroBackdrop` underneath so it degrades gracefully if an image is missing.
 */

import type { ImageSourcePropType } from "react-native";

export const PHOTOS: Record<string, ImageSourcePropType> = {
  heroRun: require("../assets/img/hero-run.jpg"),
  strength: require("../assets/img/strength.jpg"),
  profileBg: require("../assets/img/profile-bg.jpg"),
  tribe: require("../assets/img/tribe.jpg"),
  identity: require("../assets/img/identity.jpg"),
  fuel: require("../assets/img/fuel.jpg"),
  coachData: require("../assets/img/coach-data.jpg"),
};
