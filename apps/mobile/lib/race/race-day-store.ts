/** Race-day mode keeps one race pack and its clock on the device, so it works
 * with no signal (mobile#128). localStorage on web, a document file on native. */

import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { Arrival, RacePack } from "@/lib/race/race-pack";

export interface RaceDayState {
  pack: RacePack;
  startedAt: string | null;
  arrivals: Arrival[];
}

const KEY = "strem.race-day";

export async function loadRaceDay(): Promise<RaceDayState | null> {
  try {
    const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await new File(Paths.document, `${KEY}.json`).text();
    return raw ? (JSON.parse(raw) as RaceDayState) : null;
  } catch {
    return null;
  }
}

export async function saveRaceDay(state: RaceDayState | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (state) globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    const file = new File(Paths.document, `${KEY}.json`);
    if (state) file.write(JSON.stringify(state));
    else if (file.exists) file.delete();
  } catch {
    // The pack is rebuilt from the race team's layers whenever there is signal.
  }
}
