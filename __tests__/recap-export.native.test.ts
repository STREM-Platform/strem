/**
 * Unit tests for the NATIVE recap export path (`lib/recap-export.ts`).
 *
 * The native modules (react-native-view-shot, expo-sharing, expo-media-library)
 * can't run headless, so we mock them and assert the orchestration: capture →
 * share sheet / media-library save, the permission + availability branches, and
 * that real failures are reported (never silently swallowed) rather than lost.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCaptureRef = jest.fn<(...a: unknown[]) => Promise<string>>();
const mockIsAvailable = jest.fn<(...a: unknown[]) => Promise<boolean>>();
const mockShareAsync = jest.fn<(...a: unknown[]) => Promise<void>>();
const mockRequestPerms = jest.fn<(...a: unknown[]) => Promise<{ granted: boolean }>>();
const mockSaveToLibrary = jest.fn<(...a: unknown[]) => Promise<void>>();
const mockCaptureError = jest.fn<(...a: unknown[]) => void>();

jest.mock("react-native-view-shot", () => ({ captureRef: (...a: unknown[]) => mockCaptureRef(...a) }));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
}));
jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: (...a: unknown[]) => mockRequestPerms(...a),
  saveToLibraryAsync: (...a: unknown[]) => mockSaveToLibrary(...a),
}));
jest.mock("@/lib/monitoring", () => ({ captureError: (...a: unknown[]) => mockCaptureError(...a) }));

const REF = { current: {} } as never;

function load() {
  return require("@/lib/recap-export") as typeof import("@/lib/recap-export");
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("shareRecap (native)", () => {
  it("captures a PNG and opens the share sheet", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    const { shareRecap } = load();

    const result = await shareRecap(REF);

    expect(result).toBe("shared");
    expect(mockCaptureRef).toHaveBeenCalledWith(REF, expect.objectContaining({ format: "png" }));
    expect(mockShareAsync).toHaveBeenCalledWith(
      "file:///tmp/recap.png",
      expect.objectContaining({ mimeType: "image/png" }),
    );
  });

  it("returns 'unavailable' when sharing isn't supported", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockIsAvailable.mockResolvedValue(false);
    const { shareRecap } = load();

    expect(await shareRecap(REF)).toBe("unavailable");
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it("returns 'error' and reports when capture fails", async () => {
    mockCaptureRef.mockRejectedValue(new Error("view-shot failed"));
    const { shareRecap } = load();

    expect(await shareRecap(REF)).toBe("error");
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it("returns 'error' and reports when the share sheet throws", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockRejectedValue(new Error("share boom"));
    const { shareRecap } = load();

    expect(await shareRecap(REF)).toBe("error");
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });
});

describe("downloadRecap (native)", () => {
  it("saves the PNG to the media library", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockRequestPerms.mockResolvedValue({ granted: true });
    mockSaveToLibrary.mockResolvedValue(undefined);
    const { downloadRecap } = load();

    expect(await downloadRecap(REF)).toBe("saved");
    expect(mockSaveToLibrary).toHaveBeenCalledWith("file:///tmp/recap.png");
  });

  it("returns 'denied' when photo permission is refused", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockRequestPerms.mockResolvedValue({ granted: false });
    const { downloadRecap } = load();

    expect(await downloadRecap(REF)).toBe("denied");
    expect(mockSaveToLibrary).not.toHaveBeenCalled();
  });

  it("returns 'error' and reports when the save throws", async () => {
    mockCaptureRef.mockResolvedValue("file:///tmp/recap.png");
    mockRequestPerms.mockResolvedValue({ granted: true });
    mockSaveToLibrary.mockRejectedValue(new Error("save boom"));
    const { downloadRecap } = load();

    expect(await downloadRecap(REF)).toBe("error");
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });
});
