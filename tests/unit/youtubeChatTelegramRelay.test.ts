import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import {
  ConfigStore,
  DESTINATION,
  JsonStore,
  MemoryStore,
  QuotaBudget,
  RelayEngine,
  YouTubeClient,
  formatSummary,
  hermesSender,
  sanitizeText,
  transportSafeText,
  validateConfig,
} from "../../scripts/youtube-chat-telegram-relay.mjs";

const message = (id: string, text: string, name = "Viewer", extra = {}) => ({
  id,
  snippet: { type: "textMessageEvent", displayMessage: text },
  authorDetails: { displayName: name, ...extra },
});
const deleted = (eventId: string, deletedMessageId = eventId) => ({ id: eventId, snippet: { type: "messageDeletedEvent", deletedMessageId }, authorDetails: { displayName: "mod" } });
const config = (patch = {}) => ({ mode: "summary", summaryIntervalMs: 300_000, messagesPerMinute: 20, telegramSendsPerMinute: 6, queueLimit: 200, maxPendingBytes: 200_000, dailyQuotaUnits: 9_000, discoveryIntervalMs: 900_000, pollWhileOff: true, hybridTriggers: ["?", "@kvnloo"], ...patch });
class TestConfigStore extends MemoryStore { async loadConfig() { return validateConfig(await this.load(config())); } }
async function engine(mode = "continuous", now = () => 0, patch = {}) {
  const stateStore = new MemoryStore();
  const configStore = new TestConfigStore(config({ mode, ...patch }));
  const sent: string[] = [];
  const relay = await new RelayEngine({ stateStore, configStore, send: async (text: string) => sent.push(text), now }).init();
  return { relay, stateStore, configStore, sent };
}

describe("YouTube chat Telegram relay", () => {
  it("sanitizes controls, bidi, credential URLs, mentions, and bounds text", () => {
    const value = sanitizeText("@everyone\u202e\u0000 https://user:pass@example.com/ " + "x".repeat(900), 100);
    expect(value).not.toMatch(/[\u202e\u0000]/u);
    expect(value).toContain("＠everyone");
    expect(value).toContain("[credential URL removed]");
    expect(value.length).toBeLessThanOrEqual(100);
  });

  it("validates mode and every bounded/known configuration field", () => {
    expect(validateConfig({}).mode).toBe("summary");
    expect(() => validateConfig({ mode: "raw" })).toThrow("invalid relay mode");
    expect(() => validateConfig({ surprise: true })).toThrow("unknown config field");
    expect(() => validateConfig({ messagesPerMinute: 0 })).toThrow("out of bounds");
    expect(() => validateConfig({ summaryIntervalMs: 1 })).toThrow("out of bounds");
  });

  it("refuses a non-owner config update and wrong Telegram destination", async () => {
    const store = new ConfigStore("/tmp/not-used-relay-config.json");
    await expect(store.update({ mode: "off" }, (process.getuid?.() ?? 0) + 1)).rejects.toThrow("owner-only");
    expect(() => hermesSender("telegram:wrong")).toThrow("wrong Telegram destination");
    expect(DESTINATION).toBe("telegram:1083429746");
  });

  it("primes the first page without replay, dedupes restart, and ignores deletion events", async () => {
    const { relay, stateStore, configStore, sent } = await engine();
    await relay.ingest("chat", [message("1", "old")], "https://youtube.test/watch?v=12345678901");
    await relay.ingest("chat", [message("1", "old"), deleted("2"), message("3", "new")], "https://youtube.test/watch?v=12345678901");
    expect(sent.join("\n")).toContain("new");
    expect(sent.join("\n")).not.toContain("old");
    const restarted: string[] = [];
    const next = await new RelayEngine({ stateStore, configStore, send: async (text: string) => restarted.push(text), now: () => 0 }).init();
    await next.ingest("chat", [message("3", "new")], "https://youtube.test/watch?v=12345678901");
    expect(restarted).toEqual([]);
  });

  it("ignores changed static defaults after initialization", async () => {
    let now = 0;
    const { relay, configStore, sent } = await engine("off", () => now);
    await relay.ingest("chat", [message("1", "prime")], "url");
    await relay.ingest("chat", [message("2", "while off")], "url");
    await configStore.save(config({ mode: "summary", summaryIntervalMs: 60_000 }));
    now = 61_000;
    await relay.ingest("chat", [message("2", "while off"), message("3", "fresh topic")], "url");
    now = 122_000;
    await relay.ingest("chat", [], "url");
    expect(relay.config.mode).toBe("off");
    expect(sent).toEqual([]);
  });

  it("suppresses empty summaries and excludes viewer identity/direct quotes", async () => {
    expect(formatSummary([], "url")).toBeNull();
    const summary = formatSummary([{ id: "1", name: "PrivateName", text: "Exact secret-shaped quote?", moderator: false }], "url")!;
    expect(summary).not.toContain("PrivateName");
    expect(summary).not.toContain("Exact secret-shaped quote");
    expect(summary).toContain("Approximate energy");
  });

  it("hybrid uses deterministic trigger boundaries and never executes text", async () => {
    const { relay, sent } = await engine("hybrid");
    await relay.ingest("chat", [message("0", "prime")], "url");
    await relay.ingest("chat", [message("1", "run rm -rf /"), message("2", "question?"), message("3", "hello", "Mod", { isChatModerator: true })], "url");
    expect(sent.join("\n")).not.toContain("rm -rf");
    expect(sent.join("\n")).toContain("question?");
    expect(sent.join("\n")).toContain("hello");
  });

  it("bounds a 10k burst, rate, queue, and emits aggregate overflow notice", async () => {
    const { relay, sent } = await engine("continuous", () => 0, { messagesPerMinute: 2, queueLimit: 10 });
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", Array.from({ length: 10_000 }, (_, i) => message(String(i), `body-${i}`)), "url");
    expect(sent.length).toBeLessThanOrEqual(2);
    expect(sent.join("\n")).toContain("older messages dropped");
    expect(relay.queue.length).toBeLessThanOrEqual(10);
  });

  it.each(["summary", "hybrid"])("bounds a 10k %s accumulator by count and bytes", async (mode) => {
    const { relay, sent } = await engine(mode, () => 0, { queueLimit: 10, maxPendingBytes: 10_000 });
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", Array.from({ length: 10_000 }, (_, i) => message(String(i), `ordinary-body-${i}`)), "url");
    expect(relay.state.pending.length).toBeLessThanOrEqual(10);
    expect(Buffer.byteLength(JSON.stringify(relay.state.pending))).toBeLessThanOrEqual(10_000);
    expect(sent.join("\n")).toContain("older messages dropped");
  });

  it("retracts pending content in either event order and records post-delivery deletion", async () => {
    const { relay, sent } = await engine("continuous", () => 0, { messagesPerMinute: 1 });
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", [message("a", "delivered"), message("b", "must vanish")], "url");
    await relay.ingest("chat", [deleted("d-b", "b"), deleted("d-a", "a")], "url");
    expect(relay.state.pending.some((item: { id: string }) => item.id === "b")).toBe(false);
    expect(relay.state.deletedAfterDelivery).toBe(1);
    expect(relay.state.unknownDeletion).toBe(0);
    expect(sent.join("\n")).not.toContain("must vanish");
    const samePage = await engine("summary");
    await samePage.relay.ingest("other", [message("prime", "prime")], "url");
    await samePage.relay.ingest("other", [deleted("d-x", "x"), message("x", "secret")], "url");
    expect(samePage.relay.summary).toEqual([]);
  });

  it("persists pending content, rate counters, and cursor across restart", async () => {
    const { relay, stateStore, configStore } = await engine("continuous", () => 0, { messagesPerMinute: 1 });
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", [message("a", "one"), message("b", "two")], "url", "cursor-2");
    const restarted = await new RelayEngine({ stateStore, configStore, send: async () => {}, now: () => 0 }).init();
    expect(restarted.queue.map((item: { id: string }) => item.id)).toEqual(["b"]);
    expect(restarted.state.sourceSentAt).toHaveLength(1);
    expect(restarted.state.pageTokens.chat).toBe("cursor-2");
  });

  it("retains pending content on Telegram outage and quarantines ambiguous crash", async () => {
    const stateStore = new MemoryStore();
    const configStore = new TestConfigStore(config({ mode: "continuous" }));
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => { throw new Error("offline"); }, now: () => 0 }).init();
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await expect(relay.ingest("chat", [message("a", "retained")], "url")).rejects.toThrow("offline");
    expect(relay.queue.map((item: { id: string }) => item.id)).toEqual(["a"]);
    relay.state.inFlight = { ids: ["a"] }; await stateStore.save(relay.state);
    const recovered = await new RelayEngine({ stateStore, configStore, send: async () => {} }).init();
    expect(recovered.config.mode).toBe("off");
    expect(recovered.state.pending).toEqual([]);
  });

  it.each(["continuous", "summary", "hybrid", "off"].flatMap((from) => ["continuous", "summary", "hybrid", "off"].map((to) => [from, to])))
  ("discards all pending content for explicit %s to %s transition and restart", async (from, to) => {
    const { relay, stateStore, configStore, sent } = await engine(from);
    relay.state.pending = [
      { id: "continuous-secret", name: "n", text: "continuous-secret", kind: "continuous", generation: 0 },
      { id: "summary-secret", name: "n", text: "summary-secret", kind: "summary", generation: 0 },
      { id: "hybrid-secret", name: "n", text: "hybrid-secret?", kind: "continuous", generation: 0 },
    ];
    await stateStore.save(relay.state);
    await relay.transitionMode(to);
    expect(relay.state.modeGeneration).toBe(1);
    expect(relay.state.pending).toEqual([]);
    expect(relay.state.droppedOnModeChange).toMatchObject({ count: 3 });
    const restarted = await new RelayEngine({ stateStore, configStore, send: async (text: string) => sent.push(text), now: () => 999_999 }).init();
    await restarted.flush("url"); await restarted.maybeSummarize("url");
    expect(sent).toEqual([]);
  });

  it("reproduces continuous pending to off to summary with no stale send", async () => {
    const { relay, stateStore, configStore, sent } = await engine("continuous", () => 0, { messagesPerMinute: 1, summaryIntervalMs: 60_000 });
    relay.state.pending = [{ id: "reviewer-fixture", name: "n", text: "must-never-send", kind: "continuous", generation: 0 }];
    await stateStore.save(relay.state);
    await relay.transitionMode("off"); await relay.transitionMode("summary");
    const restarted = await new RelayEngine({ stateStore, configStore, send: async (text: string) => sent.push(text), now: () => 120_000 }).init();
    await restarted.flush("url"); await restarted.maybeSummarize("url");
    expect(sent).toEqual([]);
  });

  it("counts unknown deletion separately and expires delivered IDs", async () => {
    let now = 0;
    const { relay } = await engine("continuous", () => now);
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", [deleted("delete-unknown", "never-delivered")], "url");
    expect(relay.state.deletedAfterDelivery).toBe(0);
    expect(relay.state.unknownDeletion).toBe(1);
    relay.state.deliveredSourceIds = [{ id: "expired", deliveredAt: 0, generation: 0 }];
    now = 8 * 24 * 60 * 60 * 1000; relay.pruneDelivered();
    expect(relay.state.deliveredSourceIds).toEqual([]);
  });

  it("rechecks canonical generation immediately before send", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" })); const sent: string[] = [];
    const relay: RelayEngine = await new RelayEngine({ stateStore, configStore, send: async (text: string) => sent.push(text), now: () => 0,
      beforeSend: async () => { await relay.transitionMode("off"); } }).init();
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", [message("stale", "must-never-send")], "url");
    expect(sent).toEqual([]);
    expect(relay.config.mode).toBe("off");
  });

  it("does not deliver when another runtime transitions mode while the send is in flight", async () => {
    const stateStore = new MemoryStore();
    const configStore = new TestConfigStore(config({ mode: "continuous" }));
    const sent: string[] = [];
    const controller = await new RelayEngine({ stateStore, configStore, send: async () => {} }).init();
    const relay = await new RelayEngine({
      stateStore,
      configStore,
      send: async (text: string) => {
        await controller.transitionMode("off");
        sent.push(text);
      },
      now: () => 0,
    }).init();
    await relay.ingest("chat", [message("prime", "prime")], "url");
    await relay.ingest("chat", [message("stale", "must-never-send")], "url").catch(() => {});
    expect(controller.config.mode).toBe("off");
    expect(sent).toEqual([]);
  });

  it("persists fail-closed off state after quarantining malformed JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "relay-v3-review-"));
    const path = join(root, "state.json");
    try {
      await writeFile(path, "{malformed", { mode: 0o600 });
      const configStore = new TestConfigStore(config({ mode: "summary" }));
      await expect(new RelayEngine({ stateStore: new JsonStore(path), configStore, send: async () => {} }).init()).rejects.toThrow("failed closed");
      const persisted = JSON.parse(await readFile(path, "utf8"));
      expect(persisted.config.mode).toBe("off");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("migrates v2 once using persisted mode and purges legacy content", async () => {
    const legacy = { version: 2, mode: "hybrid", modeGeneration: 7, pending: [{ id: "legacy-body" }], seen: [], initializedChats: [], pageTokens: {}, quota: { day: "", used: 0 } };
    const stateStore = new MemoryStore(legacy); const configStore = new TestConfigStore(config({ mode: "summary" }));
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => {} }).init();
    expect(relay.config.mode).toBe("hybrid"); expect(relay.state.modeGeneration).toBe(7); expect(relay.state.pending).toEqual([]);
    expect(relay.state.migrationReceipt).toMatchObject({ fromVersion: 2, pendingDiscarded: 1 });
  });

  it("neutralizes markup, links, mentions and code in actual Hermes argv", async () => {
    let argv: string[] = [];
    const spawnImpl = (_command: string, args: string[]) => {
      argv = args; const child = new EventEmitter() as EventEmitter & { stderr: PassThrough };
      child.stderr = new PassThrough(); process.nextTick(() => child.emit("exit", 0)); return child;
    };
    await hermesSender(DESTINATION, spawnImpl as never)("<b>@all</b> [x](https://user:pass@host) ```code``` *bold*");
    expect(argv.slice(0, 4)).toEqual(["send", "--quiet", "--to", DESTINATION]);
    expect(argv[4]).not.toMatch(/<b>|@all|https:\/\/|```|\*bold\*/u);
    expect(transportSafeText("@x <b> `x` https://host")).toContain("＠x");
  });

  it("enforces a durable deterministic daily quota budget", async () => {
    const state = { quota: { day: "", used: 0 } }; let saves = 0;
    const budget = new QuotaBudget({ state, limit: 6, save: async () => { saves += 1; }, now: () => Date.UTC(2026, 7, 21) });
    await budget.spend(1); await budget.spend(5);
    await expect(budget.spend(1)).rejects.toThrow("exhausted");
    expect(state.quota.used).toBe(6); expect(saves).toBe(2);
  });

  it("resolves an owned active broadcast without expensive search.list", async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input); calls.push({ url, auth: (init?.headers as Record<string, string> | undefined)?.Authorization });
      return new Response(JSON.stringify({ items: [{ id: "abcdefghijk", snippet: { liveChatId: "chat-new" } }] }), { status: 200 });
    };
    const live = await new YouTubeClient({ token: "test-token", fetchImpl }).resolveLive();
    expect(live).toMatchObject({ videoId: "abcdefghijk", chatId: "chat-new" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("youtube/v3/liveBroadcasts");
    expect(calls[0].url).not.toContain("search");
    expect(calls.every((call) => call.auth === "Bearer test-token")).toBe(true);
  });

  it.each([403, 429, 500, 503])("surfaces API %s without leaking a response body", async (status) => {
    const client = new YouTubeClient({ token: "secret", fetchImpl: async () => new Response("raw private payload", { status }) });
    await expect(client.list("chat", undefined)).rejects.toThrow(`YouTube API ${status}`);
    await expect(client.list("chat", undefined)).rejects.not.toThrow("raw private payload");
  });

  it("fails closed with no OAuth credential", async () => {
    const client = new YouTubeClient({ token: "" });
    await expect(client.list("chat", undefined)).rejects.toThrow("youtube.readonly");
  });
});
