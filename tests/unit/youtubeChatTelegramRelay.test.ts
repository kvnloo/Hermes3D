import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { chmod, lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConfigStore,
  CREATE_OUTCOME,
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
async function activate(relay: RelayEngine, stateStore: MemoryStore, mode = "continuous") {
  await relay.transitionMode(mode);
  relay.state.modeGeneration = 0;
  await stateStore.save(relay.state);
}
async function engine(mode = "continuous", now = () => 0, patch = {}) {
  const stateStore = new MemoryStore();
  const configStore = new TestConfigStore(config({ mode, ...patch }));
  const sent: string[] = [];
  const relay = await new RelayEngine({ stateStore, configStore, send: async (text: string) => sent.push(text), now }).init();
  if (mode !== "off") await activate(relay, stateStore, mode);
  else { relay.state.modeGeneration = 0; await stateStore.save(relay.state); }
  return { relay, stateStore, configStore, sent };
}

describe("YouTube chat Telegram relay", () => {
  it.each(["continuous", "summary", "hybrid"])("durably bootstraps absent state off despite static %s and stays off across restart", async (mode) => {
    const root = await mkdtemp(join(tmpdir(), "relay-absent-")); const path = join(root, "state.json"); let sends = 0;
    const first = await new RelayEngine({ stateStore: new JsonStore(path), configStore: new TestConfigStore(config({ mode })), send: async () => { sends += 1; }, now: () => 77 }).init();
    expect(first.state).toMatchObject({ initialized: true, enabled: false, reason: "absent_state_bootstrap", config: { mode: "off" }, pending: [], inFlight: null });
    expect(first.state.modeGeneration).toBeGreaterThan(0);
    const second = await new RelayEngine({ stateStore: new JsonStore(path), configStore: new TestConfigStore(config({ mode })), send: async () => { sends += 1; }, now: () => 88 }).init();
    expect(second.config.mode).toBe("off"); expect(second.state.modeGeneration).toBe(first.state.modeGeneration); expect(sends).toBe(0);
    await rm(root, { recursive: true, force: true });
  });

  const bootstrapSteps = ["bootstrap:open", "bootstrap:write", "bootstrap:fsync", "bootstrap:close", "bootstrap:link", "bootstrap:dir-fsync"];
  it.each(bootstrapSteps)("fails closed during absent-state %s", async (step) => {
    const root = await mkdtemp(join(tmpdir(), "relay-bootstrap-fault-")); const path = join(root, "state.json"); let sends = 0;
    const store = new JsonStore(path, { fault: async (at: string) => { if (at === step) throw new Error(`injected ${at}`); } });
    await expect(new RelayEngine({ stateStore: store, configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; } }).init()).rejects.toThrow("safe-off bootstrap failed");
    expect(sends).toBe(0); await rm(root, { recursive: true, force: true });
  });

  it.each(["valid-symlink", "dangling-symlink", "directory", "fifo"])("rejects non-regular canonical state path: %s", async (kind) => {
    const root = await mkdtemp(join(tmpdir(), "relay-state-path-")); const path = join(root, "state.json"); const target = join(root, "target.json");
    await writeFile(target, "target-must-not-change", { mode: 0o600 });
    if (kind === "valid-symlink") await symlink(target, path); else if (kind === "dangling-symlink") await symlink(join(root, "missing"), path); else if (kind === "fifo") execFileSync("mkfifo", [path]); else await mkdir(path);
    await expect(new RelayEngine({ stateStore: new JsonStore(path), configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { throw new Error("must not send"); } }).init()).rejects.toThrow("regular file");
    expect(await readFile(target, "utf8")).toBe("target-must-not-change"); await rm(root, { recursive: true, force: true });
  });

  it("fails closed when a symlink is substituted between absent validation and atomic creation", async () => {
    const root = await mkdtemp(join(tmpdir(), "relay-state-race-")); const path = join(root, "state.json"); const target = join(root, "external.json");
    await writeFile(target, "external-must-not-change", { mode: 0o600 });
    const store = new JsonStore(path, { fault: async (step: string) => { if (step === "bootstrap:link") await symlink(target, path); } });
    await expect(new RelayEngine({ stateStore: store, configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { throw new Error("must not send"); } }).init()).rejects.toThrow("safe-off bootstrap failed");
    expect(await readFile(target, "utf8")).toBe("external-must-not-change"); expect((await lstat(path)).isSymbolicLink()).toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it("refuses an active regular state substituted immediately before exclusive bootstrap creation", async () => {
    const root = await mkdtemp(join(tmpdir(), "relay-active-race-")); const path = join(root, "state.json"); let sends = 0;
    const activeStore = new MemoryStore();
    const active = await new RelayEngine({ stateStore: activeStore, configStore: new TestConfigStore(config()), send: async () => {} }).init();
    await active.transitionMode("continuous");
    const activeBytes = `${JSON.stringify(active.state, null, 2)}\n`;
    const store = new JsonStore(path, { fault: async (step: string) => { if (step === "bootstrap:link") await writeFile(path, activeBytes, { flag: "wx", mode: 0o600 }); } });
    const relay = new RelayEngine({ stateStore: store, configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; } });
    await expect(relay.init()).rejects.toThrow("bootstrap_race");
    expect(relay.state).toMatchObject({ enabled: false, reason: "absent_state_bootstrap", config: { mode: "off" } });
    expect(relay.config.mode).toBe("off"); expect(sends).toBe(0); expect(await readFile(path, "utf8")).toBe(activeBytes);
    const fresh = await new RelayEngine({ stateStore: new JsonStore(path), configStore: new TestConfigStore(config({ mode: "off" })), send: async () => { sends += 1; } }).init();
    expect(fresh.config.mode).toBe("continuous"); expect(sends).toBe(0);
    await rm(root, { recursive: true, force: true });
  });

  it("allows exactly one of two concurrent absent-state bootstraps to create safe-off", async () => {
    const root = await mkdtemp(join(tmpdir(), "relay-concurrent-bootstrap-")); const path = join(root, "state.json"); let sends = 0;
    let absentReads = 0; let releaseAbsentReads!: () => void;
    const bothReadAbsent = new Promise<void>((resolve) => { releaseAbsentReads = resolve; });
    class SynchronizedBootstrapStore extends JsonStore {
      async load(fallback: unknown, options?: object) {
        const value = await super.load(fallback, options);
        if (value === null && ++absentReads === 2) releaseAbsentReads();
        if (value === null) await bothReadAbsent;
        return value;
      }
    }
    const make = () => new RelayEngine({ stateStore: new SynchronizedBootstrapStore(path), configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; }, now: () => 91 });
    const first = make(); const second = make();
    const results = await Promise.allSettled([first.init(), second.init()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected" && String(result.reason).includes("bootstrap_race"))).toHaveLength(1);
    expect([first, second].every((relay) => relay.config?.mode === "off" && relay.state?.enabled === false)).toBe(true);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ enabled: false, reason: "absent_state_bootstrap", config: { mode: "off" } });
    expect(sends).toBe(0); expect(CREATE_OUTCOME.EXISTS).toBe("EXISTS");
    await rm(root, { recursive: true, force: true });
  });
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
    await activate(relay, stateStore);
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

  it("does not commit or acknowledge off until an in-flight transport settles", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" }));
    let releaseTransport!: () => void;
    let transportStarted!: () => void;
    const started = new Promise<void>((resolve) => { transportStarted = resolve; });
    const transport = new Promise<void>((resolve) => { releaseTransport = resolve; });
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => { transportStarted(); await transport; }, now: () => 0 }).init();
    await activate(relay, stateStore);
    await relay.ingest("chat", [message("prime", "prime")], "url");
    const delivery = relay.ingest("chat", [message("stale", "old-generation")], "url");
    await started;
    let offAcknowledged = false;
    const off = relay.transitionMode("off").then(() => { offAcknowledged = true; });
    await Promise.resolve();
    expect(offAcknowledged).toBe(false);
    expect((await stateStore.load(null)).config.mode).toBe("continuous");
    releaseTransport();
    await delivery; await off;
    expect(offAcknowledged).toBe(true);
    expect((await stateStore.load(null))).toMatchObject({ config: { mode: "off" }, modeGeneration: 1, pending: [], inFlight: null });
  });

  it("records every deferred transport boundary and never completes an old generation after off acknowledgment", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" }));
    const events: string[] = []; let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => { events.push("send:start"); await held; events.push("send:complete"); }, now: () => 10 }).init();
    await activate(relay, stateStore);
    await relay.ingest("chat", [message("prime", "prime")], "url");
    relay.state.pending = [{ id: "old", name: "n", text: "old", kind: "continuous", generation: 0 }]; await stateStore.save(relay.state);
    const delivery = relay.deliver("old", ["old"], 1);
    while (!events.includes("send:start")) await Promise.resolve();
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "continuous" }, modeGeneration: 0, inFlight: { ids: ["old"], generation: 0 }, pending: [{ id: "old" }], dropped: 0, inFlightUncertain: 0 });
    const off = relay.transitionMode("off").then(() => events.push("off:ack"));
    await Promise.resolve(); expect(events).toEqual(["send:start"]);
    release(); await Promise.all([delivery, off]);
    expect(events).toEqual(["send:start", "send:complete", "off:ack"]);
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "off" }, modeGeneration: 1, inFlight: null, pending: [], dropped: 0, inFlightUncertain: 0, droppedOnModeChange: { count: 0 } });
  });

  it("persists transport rejection as uncertain and restart fails closed without replay", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" })); let sends = 0;
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => { sends += 1; throw new Error("transport rejected"); }, now: () => 20 }).init();
    await activate(relay, stateStore);
    relay.state.pending = [{ id: "reject", name: "n", text: "secret", kind: "continuous", generation: 0 }]; await stateStore.save(relay.state);
    await expect(relay.deliver("secret", ["reject"], 1)).rejects.toThrow("transport rejected");
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "continuous" }, modeGeneration: 0, pending: [{ id: "reject" }], inFlight: { uncertain: true, sourceCount: 1 }, inFlightUncertain: 0 });
    const restarted = await new RelayEngine({ stateStore, configStore, send: async () => { sends += 1; }, now: () => 30 }).init();
    expect(restarted.state).toMatchObject({ config: { mode: "off" }, modeGeneration: 1, pending: [], inFlight: null, inFlightUncertain: 1, droppedOnModeChange: { count: 1 } });
    await restarted.flush("url"); expect(sends).toBe(1);
  });

  it("bounds an off command waiting on a hung transport without false acknowledgment", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" })); let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const relay = await new RelayEngine({ stateStore, configStore, send: async () => held, transitionTimeoutMs: 5 }).init();
    await activate(relay, stateStore);
    relay.state.pending = [{ id: "hung", name: "n", text: "hung", kind: "continuous", generation: 0 }]; await stateStore.save(relay.state);
    const delivery = relay.deliver("hung", ["hung"], 1); await Promise.resolve();
    await expect(relay.transitionMode("off")).rejects.toThrow("in-flight transport did not settle");
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "continuous" }, modeGeneration: 0, pending: [{ id: "hung" }], inFlight: { ids: ["hung"] }, dropped: 0, inFlightUncertain: 0 });
    release(); await delivery;
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "continuous" }, modeGeneration: 0, pending: [], inFlight: null, inFlightUncertain: 0 });
  });

  it("serializes two concurrent sends and concurrent mode commands at every boundary", async () => {
    const stateStore = new MemoryStore(); const configStore = new TestConfigStore(config({ mode: "continuous" }));
    const releases: Array<() => void> = []; const events: string[] = [];
    const relay = await new RelayEngine({ stateStore, configStore, send: async (text: string) => { events.push(`start:${text}`); await new Promise<void>((resolve) => releases.push(resolve)); events.push(`done:${text}`); } }).init();
    await activate(relay, stateStore);
    relay.state.pending = ["a", "b"].map((id) => ({ id, name: "n", text: id, kind: "continuous", generation: 0 })); await stateStore.save(relay.state);
    const first = relay.deliver("a", ["a"], 1); while (releases.length < 1) await Promise.resolve();
    const second = relay.deliver("b", ["b"], 1); const off = relay.transitionMode("off"); const summary = relay.transitionMode("summary");
    await Promise.resolve(); expect(events).toEqual(["start:a"]);
    expect(await stateStore.load(null)).toMatchObject({ modeGeneration: 0, pending: [{ id: "a" }, { id: "b" }], inFlight: { ids: ["a"] }, dropped: 0, inFlightUncertain: 0 });
    releases.shift()!(); while (releases.length < 1) await Promise.resolve(); expect(events).toEqual(["start:a", "done:a", "start:b"]);
    expect(await stateStore.load(null)).toMatchObject({ modeGeneration: 0, pending: [{ id: "b" }], inFlight: { ids: ["b"] }, inFlightUncertain: 0 });
    releases.shift()!(); await Promise.all([first, second, off, summary]);
    expect(events).toEqual(["start:a", "done:a", "start:b", "done:b"]);
    expect(await stateStore.load(null)).toMatchObject({ config: { mode: "summary" }, modeGeneration: 2, pending: [], inFlight: null, dropped: 0, inFlightUncertain: 0, droppedOnModeChange: { count: 0 } });
  });

  it.each(["malformed", "truncated", "schema-invalid"])("recovers real-filesystem %s state to canonical 0600 off without static active defaults", async (kind) => {
    const root = await mkdtemp(join(tmpdir(), "relay-json-")); const path = join(root, "state.json");
    const original = kind === "malformed" ? Buffer.from("{bad-json") : kind === "truncated" ? Buffer.from('{"version":3,') : Buffer.from(JSON.stringify({ version: 3, config: config({ mode: "continuous" }) }));
    await writeFile(path, original, { mode: 0o600 }); let sends = 0;
    const relay = new RelayEngine({ stateStore: new JsonStore(path, { suffix: () => "fixture" }), configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; }, now: () => 42 });
    if (kind === "schema-invalid") await expect(relay.init()).rejects.toThrow("failed closed off"); else await relay.init();
    const canonical = JSON.parse(await readFile(path, "utf8")); expect(canonical).toMatchObject({ version: 3, config: { mode: "off" }, pending: [], inFlight: null });
    expect((await lstat(path)).mode & 0o777).toBe(0o600);
    expect(await readFile(`${path}.corrupt-fixture`)).toEqual(original);
    expect((await lstat(`${path}.corrupt-fixture`)).mode & 0o777).toBe(0o600);
    const restarted = await new RelayEngine({ stateStore: new JsonStore(path), configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; } }).init();
    expect(restarted.config.mode).toBe("off"); expect(sends).toBe(0); await rm(root, { recursive: true, force: true });
  });

  const recoverySteps = ["quarantine:open", "quarantine:write", "quarantine:fsync", "quarantine:close", "safe-temp:open", "safe-temp:write", "safe-temp:fsync", "safe-temp:close", "state:rename", "parent:open", "parent:fsync", "parent:close"];
  it.each(recoverySteps)("fails closed at filesystem step %s with original retryable or durable off", async (step) => {
    const root = await mkdtemp(join(tmpdir(), "relay-fault-")); const path = join(root, "state.json"); const original = Buffer.from("{malformed"); await writeFile(path, original, { mode: 0o600 }); let sends = 0;
    const store = new JsonStore(path, { suffix: () => "fault", fault: async (at: string) => { if (at === step) throw new Error(`injected ${at}`); } });
    await expect(new RelayEngine({ stateStore: store, configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; } }).init()).rejects.toThrow("durable safe-off replacement failed");
    const after = await readFile(path); const isOriginal = after.equals(original);
    if (isOriginal) {
      const retry = await new RelayEngine({ stateStore: new JsonStore(path, { suffix: () => "retry" }), configStore: new TestConfigStore(config({ mode: "continuous" })), send: async () => { sends += 1; } }).init();
      expect(retry.config.mode).toBe("off");
    } else expect(JSON.parse(after.toString())).toMatchObject({ version: 3, config: { mode: "off" }, pending: [], inFlight: null });
    expect(sends).toBe(0); expect(await lstat(path)).toBeTruthy(); await rm(root, { recursive: true, force: true });
  });

  it("preserves malformed state for unwritable directories, quarantine collisions, symlinks, and path substitution", async () => {
    for (const attack of ["unwritable", "collision", "symlink", "substitution"]) {
      const root = await mkdtemp(join(tmpdir(), "relay-attack-")); const path = join(root, "state.json"); const original = Buffer.from("{original-malformed"); await writeFile(path, original, { mode: 0o600 });
      if (attack === "collision") await writeFile(`${path}.corrupt-fixed`, "occupied", { mode: 0o600 });
      if (attack === "symlink") await symlink(path, `${path}.corrupt-fixed`);
      if (attack === "substitution") { await rm(path); await mkdir(path); }
      if (attack === "unwritable") await chmod(root, 0o500);
      const store = new JsonStore(path, { suffix: () => "fixed" });
      await expect(store.load(null, { corruptFallback: { version: 3, config: config({ mode: "off" }) } })).rejects.toThrow();
      if (attack === "unwritable") { await chmod(root, 0o700); expect(await readFile(path)).toEqual(original); }
      else if (attack !== "substitution") expect(await readFile(path)).toEqual(original);
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
