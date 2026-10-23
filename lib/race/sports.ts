/** Sport metadata for missions: labels, icons and sensible intake defaults. */

import type { IconName } from "@/constants/theme";
import type { RaceFormat, Sport, Support, Terrain } from "@/lib/api/race-missions";

export interface SportMeta {
  id: Sport;
  label: string;
  short: string;
  icon: IconName;
  blurb: string;
  distanceHint: string;
  hasElevation: boolean;
  legs?: { discipline: "swim" | "bike" | "run"; distance_km: number }[];
}

export const SPORTS: SportMeta[] = [
  { id: "trail_running", label: "Trail & mountain running", short: "Trail", icon: "mountain", blurb: "Skyraces, mountain marathons, ultras", distanceHint: "e.g. 50", hasElevation: true },
  { id: "road_running", label: "Road running", short: "Road", icon: "run", blurb: "10K to marathon and road ultras", distanceHint: "e.g. 42.2", hasElevation: false },
  { id: "triathlon", label: "Triathlon", short: "Triathlon", icon: "swim", blurb: "Sprint to full distance", distanceHint: "e.g. 113", hasElevation: true, legs: [{ discipline: "swim", distance_km: 1.9 }, { discipline: "bike", distance_km: 90 }, { discipline: "run", distance_km: 21.1 }] },
  { id: "cycling", label: "Road cycling", short: "Cycling", icon: "bike", blurb: "Gran fondos, sportives, ultra-cycling", distanceHint: "e.g. 160", hasElevation: true },
  { id: "gravel", label: "Gravel", short: "Gravel", icon: "bike", blurb: "Gravel races and bikepacking", distanceHint: "e.g. 200", hasElevation: true },
  { id: "mountain_biking", label: "Mountain biking", short: "MTB", icon: "bike", blurb: "XC marathons and stage races", distanceHint: "e.g. 80", hasElevation: true },
  { id: "swimming", label: "Open-water swim", short: "Swim", icon: "swim", blurb: "Lake, sea and marathon swims", distanceHint: "e.g. 5", hasElevation: false },
  { id: "hiking", label: "Hiking & fastpacking", short: "Hike", icon: "hike", blurb: "Long trails, traverses, multi-day", distanceHint: "e.g. 120", hasElevation: true },
  { id: "skimo", label: "Ski mountaineering", short: "Skimo", icon: "ski", blurb: "Skimo races and long tours", distanceHint: "e.g. 25", hasElevation: true },
  { id: "nordic_skiing", label: "Nordic skiing", short: "Nordic", icon: "ski", blurb: "Loppets and long-distance classics", distanceHint: "e.g. 50", hasElevation: true },
  { id: "rowing", label: "Rowing & paddling", short: "Row", icon: "row", blurb: "Regattas, marathons, expeditions", distanceHint: "e.g. 21", hasElevation: false },
  { id: "hybrid", label: "Hybrid racing", short: "Hybrid", icon: "dumbbell", blurb: "Hyrox, OCR and fitness racing", distanceHint: "e.g. 8", hasElevation: false },
  { id: "multisport", label: "Adventure racing", short: "Adventure", icon: "compass", blurb: "Multisport and expedition races", distanceHint: "e.g. 150", hasElevation: true },
  { id: "custom", label: "Custom challenge", short: "Challenge", icon: "flag", blurb: "Everesting, an FKT, a crossing — your own", distanceHint: "e.g. 300", hasElevation: true },
];

export function sportMeta(id: Sport | undefined | null): SportMeta {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0];
}

export const FORMATS: { value: RaceFormat; label: string; hint: string }[] = [
  { value: "single_day", label: "One day", hint: "Start to finish in a day" },
  { value: "multi_stage", label: "Stage race", hint: "Several days, rest between stages" },
  { value: "non_stop", label: "Non-stop", hint: "Continuous over a day or more" },
];

export const SUPPORTS: { value: Support; label: string }[] = [
  { value: "aid_stations", label: "Aid stations" },
  { value: "crewed", label: "Crewed" },
  { value: "self_supported", label: "Self-supported" },
  { value: "unsupported", label: "Unsupported" },
];

export const TERRAIN: { value: Terrain; label: string }[] = [
  { value: "trails", label: "Trails" },
  { value: "mountains", label: "Mountains" },
  { value: "rolling_hills", label: "Rolling hills" },
  { value: "flat_roads", label: "Flat roads" },
  { value: "track", label: "Track" },
  { value: "treadmill", label: "Treadmill" },
  { value: "indoor_trainer", label: "Indoor trainer" },
  { value: "pool", label: "Pool" },
  { value: "open_water", label: "Open water" },
  { value: "gym", label: "Gym" },
  { value: "snow", label: "Snow" },
  { value: "heat", label: "Hot climate" },
  { value: "altitude", label: "Altitude" },
];

export const SESSION_ICON: Record<string, IconName> = {
  running: "run",
  trail_running: "mountain",
  cycling: "bike",
  swimming: "swim",
  strength: "dumbbell",
  mobility: "sliders",
  hiking: "hike",
  rowing: "row",
  skiing: "ski",
  hybrid: "bolt",
  brick: "layers",
  rest: "moon",
  other: "compass",
};
