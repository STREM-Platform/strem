/**
 * Unit tests for the WEB recap export path (`lib/recap-export.web.ts`).
 *
 * We mock the capture dependency (react-native-view-shot's web captureRef) and
 * the monitoring sink, and stub the browser globals the module touches
 * (document / URL / navigator / atob / Blob / File). The goal: prove the web
 * path actually produces a PNG and routes Download → browser download and
 * Share → Web Share API (with download fallback) — and never swallows failures.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCaptureRef = jest.fn<(...a: unknown[]) => Promise<string>>();
const mockCaptureError = jest.fn<(...a: unknown[]) => void>();

jest.mock("react-native-view-shot", () => ({ captureRef: (...a: unknown[]) => mockCaptureRef(...a) }));
jest.mock("@/lib/monitoring", () => ({ captureError: (...a: unknown[]) => mockCaptureError(...a) }));
jest.mock("html2canvas", () => jest.fn());

// 1x1 transparent PNG data-uri.
const PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// A fake DOM element that passes `instanceof HTMLElement`.
function makeRef() {
  const el = Object.create((globalThis as { HTMLElement: { prototype: object } }).HTMLElement.prototype);
  return { current: el } as never;
}

let clickedAnchors: { href: string; download: string }[];
let createdObjectUrls: string[];
let revokedObjectUrls: string[];

const GLOBAL_KEYS = ["HTMLElement", "document", "URL", "atob", "Blob", "File", "navigator"] as const;
const savedGlobals: Record<string, unknown> = {};

beforeEach(() => {
  jest.clearAllMocks();
  clickedAnchors = [];
  createdObjectUrls = [];
  revokedObjectUrls = [];

  const g = globalThis as Record<string, unknown>;
  for (const k of GLOBAL_KEYS) savedGlobals[k] = g[k];

  // Minimal HTMLElement so `instanceof` works and `<a>` capture is observable.
  class FakeHTMLElement {}
  class FakeAnchor extends FakeHTMLElement {
    href = "";
    download = "";
    remove() {}
    click() {
      clickedAnchors.push({ href: this.href, download: this.download });
    }
  }
  g.HTMLElement = FakeHTMLElement;
  g.document = {
    createElement: () => new FakeAnchor(),
    body: { appendChild() {}, removeChild() {} },
  };
  g.URL = {
    createObjectURL: (b: unknown) => {
      const url = `blob:mock/${createdObjectUrls.length}`;
      void b;
      createdObjectUrls.push(url);
      return url;
    },
    revokeObjectURL: (u: string) => revokedObjectUrls.push(u),
  };
  g.atob = (b64: string) => Buffer.from(b64, "base64").toString("binary");
  g.Blob = class {
    type: string;
    constructor(_parts: unknown[], opts?: { type?: string }) {
      this.type = opts?.type ?? "";
    }
  };
  g.File = class {
    name: string;
    type: string;
    constructor(_parts: unknown[], name: string, opts?: { type?: string }) {
      this.name = name;
      this.type = opts?.type ?? "";
    }
  };
  g.navigator = undefined; // each test sets what it needs
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  const g = globalThis as Record<string, unknown>;
  for (const k of GLOBAL_KEYS) g[k] = savedGlobals[k];
});

// Imported lazily so the global stubs above are in place first.
function load() {
  return require("@/lib/recap-export.web") as typeof import("@/lib/recap-export.web");
}

describe("downloadRecap (web)", () => {
  it("captures a PNG and triggers a browser download", async () => {
    mockCaptureRef.mockResolvedValue(PNG_DATA_URI);
    const { downloadRecap } = load();

    const result = await downloadRecap(makeRef());

    expect(result).toBe("saved");
    expect(mockCaptureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: "png", result: "data-uri" }),
    );
    expect(clickedAnchors).toHaveLength(1);
    expect(clickedAnchors[0].download).toBe("strem-recap.png");
    expect(createdObjectUrls).toHaveLength(1);
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it("returns 'error' and reports when capture fails", async () => {
    mockCaptureRef.mockRejectedValue(new Error("html2canvas boom"));
    const { downloadRecap } = load();

    const result = await downloadRecap(makeRef());

    expect(result).toBe("error");
    expect(clickedAnchors).toHaveLength(0);
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it("returns 'error' when the card DOM node is unavailable", async () => {
    const { downloadRecap } = load();
    const result = await downloadRecap({ current: null } as never);
    expect(result).toBe("error");
    expect(mockCaptureRef).not.toHaveBeenCalled();
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });
});

describe("shareRecap (web)", () => {
  it("uses the Web Share API with a PNG file when available", async () => {
    mockCaptureRef.mockResolvedValue(PNG_DATA_URI);
    const share =
      jest.fn<(data: { files: { name: string }[]; title?: string }) => Promise<void>>().mockResolvedValue(undefined);
    (globalThis as Record<string, unknown>).navigator = {
      share,
      canShare: () => true,
    };
    const { shareRecap } = load();

    const result = await shareRecap(makeRef());

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0];
    expect(arg.files[0].name).toBe("strem-recap.png");
    expect(clickedAnchors).toHaveLength(0); // shared, not downloaded
  });

  it("falls back to a download when Web Share is unavailable", async () => {
    mockCaptureRef.mockResolvedValue(PNG_DATA_URI);
    (globalThis as Record<string, unknown>).navigator = {}; // no share
    const { shareRecap } = load();

    const result = await shareRecap(makeRef());

    expect(result).toBe("shared");
    expect(clickedAnchors).toHaveLength(1);
  });

  it("treats a dismissed share sheet as a no-op (not an error)", async () => {
    mockCaptureRef.mockResolvedValue(PNG_DATA_URI);
    const abort = new DOMException("cancelled", "AbortError");
    const share = jest.fn<() => Promise<void>>().mockRejectedValue(abort);
    (globalThis as Record<string, unknown>).navigator = { share, canShare: () => true };
    const { shareRecap } = load();

    const result = await shareRecap(makeRef());

    expect(result).toBe("unavailable");
    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  it("returns 'error' and reports when capture fails", async () => {
    mockCaptureRef.mockRejectedValue(new Error("boom"));
    (globalThis as Record<string, unknown>).navigator = {};
    const { shareRecap } = load();

    const result = await shareRecap(makeRef());

    expect(result).toBe("error");
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });
});
