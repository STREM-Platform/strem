/**
 * Unit tests for the server-backed Forge runtime (#60): in live mode the action
 * log + autonomy hydrate from the backend and mutations write through
 * optimistically (reverting on failure); in mock mode it seeds locally and never
 * touches the network.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { defaultAutonomy } from "@/lib/agent/capabilities";
import type { AgentAction, AgentCapability, AutonomyLevel } from "@/lib/agent/types";

type AutonomyMap = Record<AgentCapability, AutonomyLevel>;
interface ActivityPage {
  items: AgentAction[];
  pagination: { limit: number; offset: number; total: number };
}

const mockGetActivity = jest.fn<() => Promise<ActivityPage>>();
const mockGetAutonomy = jest.fn<() => Promise<AutonomyMap>>();
const mockSetAutonomy = jest.fn<(c: AgentCapability, l: AutonomyLevel) => Promise<AutonomyMap>>();
const mockApprove = jest.fn<(id: string) => Promise<AgentAction>>();
const mockUndo = jest.fn<(id: string) => Promise<AgentAction>>();

jest.mock("@/lib/api/agent", () => ({
  agentApi: {
    getActivity: () => mockGetActivity(),
    getAutonomy: () => mockGetAutonomy(),
    setAutonomy: (c: AgentCapability, l: AutonomyLevel) => mockSetAutonomy(c, l),
    approveAction: (id: string) => mockApprove(id),
    undoAction: (id: string) => mockUndo(id),
  },
}));

// eslint-disable-next-line import/first -- must import after jest.mock() above
import { ForgeRuntime } from "@/lib/agent/runtime";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function action(id: string, status: AgentAction["status"]): AgentAction {
  return {
    id,
    capability: "updateReadiness",
    type: "Updated readiness",
    summary: "s",
    reasoning: "r",
    citedData: [],
    status,
    autonomy: "auto",
    createdAt: new Date().toISOString(),
  };
}

const page = (items: AgentAction[]): ActivityPage => ({
  items,
  pagination: { limit: 50, offset: 0, total: items.length },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ForgeRuntime — live (server-backed)", () => {
  it("hydrates the action log + autonomy from the backend", async () => {
    mockGetActivity.mockResolvedValue(page([action("a1", "proposed")]));
    const auto = defaultAutonomy();
    auto.updateReadiness = "off";
    mockGetAutonomy.mockResolvedValue(auto);

    const rt = new ForgeRuntime(true);
    await flush();

    expect(rt.getActions().map((a) => a.id)).toEqual(["a1"]);
    expect(rt.getAutonomy().updateReadiness).toBe("off");
  });

  it("falls back to an empty feed if hydrate fails (never fabricates)", async () => {
    mockGetActivity.mockRejectedValue(new Error("down"));
    mockGetAutonomy.mockRejectedValue(new Error("down"));

    const rt = new ForgeRuntime(true);
    await flush();

    expect(rt.getActions()).toEqual([]);
  });

  it("updates autonomy optimistically and persists it server-side", async () => {
    mockGetActivity.mockResolvedValue(page([]));
    mockGetAutonomy.mockResolvedValue(defaultAutonomy());
    const server = defaultAutonomy();
    server.adjustTodayPlan = "auto";
    mockSetAutonomy.mockResolvedValue(server);

    const rt = new ForgeRuntime(true);
    await flush();

    rt.setAutonomy("adjustTodayPlan", "auto");
    expect(rt.getAutonomy().adjustTodayPlan).toBe("auto"); // optimistic, immediate
    expect(mockSetAutonomy).toHaveBeenCalledWith("adjustTodayPlan", "auto");

    await flush();
    expect(rt.getAutonomy().adjustTodayPlan).toBe("auto"); // reconciled from server
  });

  it("reverts autonomy when the server write fails", async () => {
    mockGetActivity.mockResolvedValue(page([]));
    mockGetAutonomy.mockResolvedValue(defaultAutonomy());
    mockSetAutonomy.mockRejectedValue(new Error("nope"));

    const rt = new ForgeRuntime(true);
    await flush();
    const before = rt.getAutonomy().adjustTodayPlan;

    rt.setAutonomy("adjustTodayPlan", before === "off" ? "auto" : "off");
    expect(rt.getAutonomy().adjustTodayPlan).not.toBe(before); // optimistic
    await flush();
    expect(rt.getAutonomy().adjustTodayPlan).toBe(before); // rolled back
  });

  it("approves an action optimistically and persists it", async () => {
    mockGetActivity.mockResolvedValue(page([action("a1", "proposed")]));
    mockGetAutonomy.mockResolvedValue(defaultAutonomy());
    mockApprove.mockResolvedValue(action("a1", "done"));

    const rt = new ForgeRuntime(true);
    await flush();

    rt.approve("a1");
    expect(rt.getActions()[0].status).toBe("done"); // optimistic
    expect(mockApprove).toHaveBeenCalledWith("a1");
  });

  it("reverts an undo when the server write fails", async () => {
    mockGetActivity.mockResolvedValue(page([action("a1", "done")]));
    mockGetAutonomy.mockResolvedValue(defaultAutonomy());
    mockUndo.mockRejectedValue(new Error("nope"));

    const rt = new ForgeRuntime(true);
    await flush();

    rt.undo("a1");
    expect(rt.getActions()[0].status).toBe("undone"); // optimistic
    await flush();
    expect(rt.getActions()[0].status).toBe("done"); // rolled back
  });
});

describe("ForgeRuntime — mock (offline)", () => {
  it("seeds locally and never calls the backend", async () => {
    const rt = new ForgeRuntime(false);
    await flush();
    expect(mockGetActivity).not.toHaveBeenCalled();
    expect(mockGetAutonomy).not.toHaveBeenCalled();
    expect(rt.getActions().length).toBeGreaterThan(0);
  });
});
