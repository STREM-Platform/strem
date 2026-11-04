import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { api } from "@/lib/api/client";
import { checkStoredSession } from "@/lib/session/restore";

jest.mock("@/lib/config", () => ({ API_BASE_URL: "http://test/v1" }));

// An in-memory token store, so the tests see what the client keeps or clears.
let mockStored: { accessToken: string; refreshToken: string } | null = null;
jest.mock("@/lib/session/tokens", () => ({
  getStoredTokens: async () => mockStored,
  storeTokens: async (pair: { access_token: string; refresh_token: string }) => {
    mockStored = { accessToken: pair.access_token, refreshToken: pair.refresh_token };
  },
  clearTokens: async () => {
    mockStored = null;
  },
}));

const fetchMock = jest.fn<typeof fetch>();
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const me = { user_id: "u1", email: "a@strem.app" };
const ok = (url: string) =>
  url.endsWith("/auth/me")
    ? json(200, me)
    : url.endsWith("/onboarding/status")
      ? json(200, { status: "completed", completed: true })
      : json(200, { needs_acceptance: false, documents: [] });
const path = (input: unknown) => String(input);

beforeEach(() => {
  mockStored = { accessToken: "access-1", refreshToken: "refresh-1" };
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof global.fetch;
});

describe("session restore on launch (#2)", () => {
  it("signs in when every check answers", async () => {
    fetchMock.mockImplementation(async (url) => ok(path(url)));
    await expect(checkStoredSession()).resolves.toMatchObject({ phase: "signedIn", legalAccepted: true });
  });

  it("keeps the session when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(checkStoredSession()).resolves.toEqual({ phase: "unavailable" });
    expect(mockStored).not.toBeNull();
  });

  it("keeps the session when onboarding or legal status has a server error", async () => {
    fetchMock.mockImplementation(async (url) =>
      path(url).endsWith("/users/me/legal") ? json(503, { code: "unavailable", message: "down" }) : ok(path(url)),
    );
    await expect(checkStoredSession()).resolves.toEqual({ phase: "unavailable" });
    expect(mockStored).not.toBeNull();
  });

  it("keeps the session when the token refresh itself has a server error", async () => {
    fetchMock.mockImplementation(async (url) =>
      path(url).endsWith("/auth/refresh")
        ? json(502, { code: "bad_gateway", message: "upstream" })
        : json(401, { code: "unauthorized", message: "expired" }),
    );
    await expect(checkStoredSession()).resolves.toEqual({ phase: "unavailable" });
    expect(mockStored).toEqual({ accessToken: "access-1", refreshToken: "refresh-1" });
  });

  it("signs out and clears tokens when the refresh token is refused", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "invalid_refresh_token", message: "revoked" }));
    await expect(checkStoredSession()).resolves.toEqual({ phase: "signedOut" });
    expect(mockStored).toBeNull();
  });

  it("signs out without a request when nothing is mockStored", async () => {
    mockStored = null;
    await expect(checkStoredSession()).resolves.toEqual({ phase: "signedOut" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("token refresh under concurrency (#2)", () => {
  it("shares one refresh between simultaneous 401s", async () => {
    let refreshes = 0;
    fetchMock.mockImplementation(async (url, init) => {
      if (path(url).endsWith("/auth/refresh")) {
        refreshes += 1;
        return json(200, { access_token: "access-2", refresh_token: "refresh-2", token_type: "bearer" });
      }
      const auth = new Headers(init?.headers).get("Authorization");
      return auth === "Bearer access-2" ? ok(path(url)) : json(401, { code: "unauthorized", message: "expired" });
    });
    await Promise.all([api.getMe(), api.getOnboardingStatus(), api.getLegalStatus()]);
    expect(refreshes).toBe(1);
    expect(mockStored).toEqual({ accessToken: "access-2", refreshToken: "refresh-2" });
  });

  it("uses a pair another tab already rotated instead of refreshing again", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      const auth = new Headers(init?.headers).get("Authorization");
      if (auth === "Bearer access-1") {
        mockStored = { accessToken: "access-2", refreshToken: "refresh-2" }; // the other tab wins
        return json(401, { code: "unauthorized", message: "expired" });
      }
      if (path(url).endsWith("/auth/refresh")) throw new Error("must not refresh twice");
      return ok(path(url));
    });
    await expect(api.getMe()).resolves.toEqual(me);
    expect(mockStored).toEqual({ accessToken: "access-2", refreshToken: "refresh-2" });
  });

  it("keeps the newer pair when a racing refresh is refused", async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (path(url).endsWith("/auth/refresh")) {
        mockStored = { accessToken: "access-2", refreshToken: "refresh-2" }; // rotated meanwhile
        return json(401, { code: "invalid_refresh_token", message: "already used" });
      }
      const auth = new Headers(init?.headers).get("Authorization");
      return auth === "Bearer access-2" ? ok(path(url)) : json(401, { code: "unauthorized", message: "expired" });
    });
    await expect(api.getMe()).resolves.toEqual(me);
    expect(mockStored).toEqual({ accessToken: "access-2", refreshToken: "refresh-2" });
  });
});
