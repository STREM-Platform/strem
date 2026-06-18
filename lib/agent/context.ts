/**
 * Context assembler (A6).
 *
 * The single place the Athlete Context Graph is gathered before any agent call.
 * Today it reads the mocked graph; when the real services land, this is where the
 * live profile / XP / training / nutrition / wearable signals merge into one
 * snapshot — every Forge surface keeps reading the same assembled context, so the
 * "one brain, one graph" guarantee holds without touching the screens.
 *
 * Privacy (A7): the assembler only includes sources the user has left on. Toggling
 * a source off here is what makes it "gone from every recommendation".
 */

import { agentMock } from "@/lib/services/agent.mock";
import type { AthleteContext } from "@/lib/agent/types";

export interface ContextOptions {
  /** Source ids (graph keys) the user has switched off in Privacy (A7). */
  disabledSources?: string[];
}

/**
 * Assemble the context the agent reasons over. Filters out any source the user
 * has disabled so the agent literally cannot cite it.
 */
export async function assembleContext(opts: ContextOptions = {}): Promise<AthleteContext> {
  const ctx = await agentMock.getContext();
  const disabled = new Set(opts.disabledSources ?? []);
  if (disabled.size === 0) return ctx;
  return { ...ctx, sources: ctx.sources.filter((s) => !disabled.has(s.id)) };
}
