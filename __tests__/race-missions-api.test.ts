import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ApiError } from "@/lib/api/client";
import { raceMissions, type MissionInput } from "@/lib/api/race-missions";
jest.mock("@/lib/config", () => ({ API_BASE_URL: "http://test/v1" }));
jest.mock("@/lib/session/tokens", () => ({ getStoredTokens: async () => ({ accessToken: "test-token" }), clearTokens: async () => {}, storeTokens: async () => {} }));
const fetchMock = jest.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock as unknown as typeof global.fetch; });
const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
describe("Race Mission API truth and retry", () => {
  it("only maps an explicit no-active-mission response to empty", async () => {
    fetchMock.mockResolvedValueOnce(response(404, { code: "no_active_mission", message: "none" }));
    await expect(raceMissions.active()).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(response(404, { code: "unknown_route", message: "not deployed" }));
    await expect(raceMissions.active()).rejects.toBeInstanceOf(ApiError);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(raceMissions.active()).rejects.toThrow("offline");
  });
  it("keeps the same idempotency key through token refresh", async () => {
    fetchMock.mockResolvedValueOnce(response(401, { code: "unauthorized", message: "expired" }));
    fetchMock.mockResolvedValueOnce(response(200, { access_token: "fresh", refresh_token: "refresh" }));
    fetchMock.mockResolvedValueOnce(response(201, { id: "persisted" }));
    await raceMissions.create({} as MissionInput, "stable_retry_key");
    const first = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    const retried = fetchMock.mock.calls[2][1]?.headers as Record<string, string>;
    expect(first["Idempotency-Key"]).toBe("stable_retry_key");
    expect(retried["Idempotency-Key"]).toBe("stable_retry_key");
    expect(retried.Authorization).toBe("Bearer fresh");
  });
});
