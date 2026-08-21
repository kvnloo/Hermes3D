#!/usr/bin/env node
import { mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DESTINATION = "telegram:1083429746";
export const CHANNEL_LIVE_URL = "https://www.youtube.com/@kvnloo/live";
export const MODES = new Set(["continuous", "summary", "hybrid", "off"]);
const BIDI = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/gu;
const MENTION = /(^|\s)@([\p{L}\p{N}_]{2,})/gu;
const CREDENTIAL_URL = /\bhttps?:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/giu;
const URL_PATTERN = /\bhttps?:\/\/\S+/giu;
const TRANSPORT_META = /[\\*_\[\]()~`>#+\-=|{}.!<>]/gu;
const DEFAULT_CONFIG = Object.freeze({
  mode: "summary",
  summaryIntervalMs: 300_000,
  messagesPerMinute: 20,
  telegramSendsPerMinute: 6,
  queueLimit: 200,
  maxPendingBytes: 200_000,
  dailyQuotaUnits: 9_000,
  discoveryIntervalMs: 900_000,
  pollWhileOff: true,
  hybridTriggers: ["?", "@kvnloo"],
});

export function sanitizeText(value, max = 700) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(BIDI, "")
    .replace(CONTROLS, "")
    .replace(CREDENTIAL_URL, "[credential URL removed]")
    .replace(MENTION, "$1＠$2")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

export function transportSafeText(value, max = 3500) {
  return sanitizeText(value, max * 2)
    .replace(URL_PATTERN, (url) => url.replace(/^https?/iu, "hxxps").replaceAll(":", "："))
    .replaceAll("@", "＠")
    .replace(TRANSPORT_META, (char) => ({ "<": "‹", ">": "›", "`": "｀" }[char] ?? `\\${char}`))
    .slice(0, max);
}

export function validateConfig(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("config must be an object");
  const allowed = new Set(Object.keys(DEFAULT_CONFIG));
  for (const key of Object.keys(candidate)) if (!allowed.has(key)) throw new Error(`unknown config field: ${key}`);
  const config = { ...DEFAULT_CONFIG, ...candidate };
  if (!MODES.has(config.mode)) throw new Error("invalid relay mode");
  if (!Number.isInteger(config.summaryIntervalMs) || config.summaryIntervalMs < 60_000 || config.summaryIntervalMs > 3_600_000) throw new Error("summaryIntervalMs out of bounds");
  if (!Number.isInteger(config.messagesPerMinute) || config.messagesPerMinute < 1 || config.messagesPerMinute > 60) throw new Error("messagesPerMinute out of bounds");
  if (!Number.isInteger(config.telegramSendsPerMinute) || config.telegramSendsPerMinute < 1 || config.telegramSendsPerMinute > 30) throw new Error("telegramSendsPerMinute out of bounds");
  if (!Number.isInteger(config.queueLimit) || config.queueLimit < 10 || config.queueLimit > 1_000) throw new Error("queueLimit out of bounds");
  if (!Number.isInteger(config.maxPendingBytes) || config.maxPendingBytes < 10_000 || config.maxPendingBytes > 1_000_000) throw new Error("maxPendingBytes out of bounds");
  if (!Number.isInteger(config.dailyQuotaUnits) || config.dailyQuotaUnits < 100 || config.dailyQuotaUnits > 10_000) throw new Error("dailyQuotaUnits out of bounds");
  if (!Number.isInteger(config.discoveryIntervalMs) || config.discoveryIntervalMs < 900_000 || config.discoveryIntervalMs > 86_400_000) throw new Error("discoveryIntervalMs out of bounds");
  if (typeof config.pollWhileOff !== "boolean") throw new Error("pollWhileOff must be boolean");
  if (!Array.isArray(config.hybridTriggers) || config.hybridTriggers.length > 20 || config.hybridTriggers.some((v) => typeof v !== "string" || !v || v.length > 40)) throw new Error("invalid hybridTriggers");
  return config;
}

export class JsonStore {
  constructor(path) { this.path = path; }
  async load(fallback) {
    try { return JSON.parse(await readFile(this.path, "utf8")); }
    catch (error) {
      if (error?.code === "ENOENT") return structuredClone(fallback);
      if (error instanceof SyntaxError) {
        await rename(this.path, `${this.path}.corrupt-${Date.now()}`);
        throw new Error("relay state corrupt; quarantined and failed closed");
      }
      throw error;
    }
  }
  async save(value) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temp = `${this.path}.${process.pid}.tmp`;
    const file = await open(temp, "w", 0o600);
    try { await file.writeFile(`${JSON.stringify(value, null, 2)}\n`); await file.sync(); } finally { await file.close(); }
    await rename(temp, this.path);
    const directory = await open(dirname(this.path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  }
}

export class ConfigStore extends JsonStore {
  async loadConfig() { return validateConfig(await this.load(DEFAULT_CONFIG)); }
  async update(patch, actorUid = process.getuid?.()) {
    if (actorUid !== process.getuid?.()) throw new Error("owner-only mode change refused");
    const current = await this.loadConfig();
    const next = validateConfig({ ...current, ...patch });
    await this.save(next);
    return next;
  }
}

export class MemoryStore {
  constructor(initial = {}) { this.value = structuredClone(initial); }
  async load(fallback) { return Object.keys(this.value).length ? structuredClone(this.value) : structuredClone(fallback); }
  async save(value) { this.value = structuredClone(value); }
}

function eventType(item) { return item?.snippet?.type ?? ""; }
function isDeliverable(item) {
  return eventType(item) === "textMessageEvent" && typeof item?.snippet?.displayMessage === "string";
}
function publicMessage(item) {
  return {
    id: String(item.id),
    name: sanitizeText(item?.authorDetails?.displayName, 80) || "Viewer",
    text: sanitizeText(item?.snippet?.displayMessage, 700),
    moderator: item?.authorDetails?.isChatModerator === true || item?.authorDetails?.isChatOwner === true,
  };
}
function isHybrid(message, triggers) {
  const folded = message.text.toLocaleLowerCase("en-US");
  return message.moderator || triggers.some((trigger) => folded.includes(trigger.toLocaleLowerCase("en-US")));
}

export function formatContinuous(messages, videoUrl) {
  const body = messages.map((m) => `${m.name}: ${m.text}`).join("\n");
  return sanitizeText(`YT LIVE CHAT\n${body}\n${videoUrl}`, 3500);
}

const STOPWORDS = new Set(["this", "that", "with", "from", "have", "your", "what", "when", "where", "there", "about", "just", "like", "will", "would", "could", "should"]);
export function formatSummary(messages, videoUrl) {
  if (!messages.length) return null;
  const counts = new Map();
  let questions = 0;
  for (const message of messages) {
    if (message.text.includes("?")) questions += 1;
    for (const word of message.text.toLocaleLowerCase("en-US").match(/[\p{L}\p{N}]{4,}/gu) ?? []) {
      if (!STOPWORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  const topics = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([word]) => word);
  const energy = messages.length >= 30 ? "high" : messages.length >= 10 ? "moderate" : "light";
  return [
    "YT LIVE CHAT — PRIVACY-SAFE SUMMARY",
    `Messages: ${messages.length}`,
    `Questions detected: ${questions}`,
    `Approximate energy (volume only): ${energy}`,
    `Recurring terms: ${topics.length ? topics.join(", ") : "none"}`,
    "Viewer names and direct quotes omitted.",
    videoUrl,
  ].join("\n");
}

export class RelayEngine {
  constructor({ stateStore, configStore, send, now = () => Date.now() }) {
    this.stateStore = stateStore;
    this.configStore = configStore;
    this.send = send;
    this.now = now;
    this.state = null;
    this.config = null;
  }
  async init() {
    this.config = await this.configStore.loadConfig();
    this.state = await this.stateStore.load({ version: 2, seen: [], initializedChats: [], pageTokens: {}, pending: [], dropped: 0, deletedDelivered: 0, mode: this.config.mode, modeGeneration: 0, summaryStartedAt: this.now(), sourceSentAt: [], telegramSentAt: [], inFlight: null, live: null, quota: { day: "", used: 0 } });
    if (this.state.version !== 2 || !Array.isArray(this.state.pending)) throw new Error("relay state corrupt or unsupported; fail closed");
    if (this.state.inFlight) throw new Error("ambiguous prior Telegram delivery quarantined; operator reconciliation required");
    return this;
  }
  async reloadConfig() {
    const next = await this.configStore.loadConfig();
    if (next.mode !== this.config.mode) {
      this.state.mode = next.mode;
      this.state.modeGeneration += 1;
      await this.stateStore.save(this.state);
    }
    this.config = next;
  }
  async ingest(chatId, items, videoUrl, nextPageToken) {
    await this.reloadConfig();
    const firstPage = !this.state.initializedChats.includes(chatId);
    const seen = new Set(this.state.seen);
    const fresh = [];
    const deletedIds = new Set();
    const deletedPending = new Set();
    for (const item of items) {
      if (!item?.id || seen.has(String(item.id))) continue;
      seen.add(String(item.id));
      const deletedId = item?.snippet?.deletedMessageId;
      if (eventType(item) === "messageDeletedEvent" && deletedId) {
        deletedIds.add(String(deletedId));
        if (this.retract(String(deletedId))) deletedPending.add(String(deletedId));
      }
      else if (isDeliverable(item)) fresh.push(publicMessage(item));
    }
    this.state.seen = [...seen].slice(-5000);
    const freshIds = new Set(fresh.map((message) => message.id));
    for (const id of deletedIds) if (!deletedPending.has(id) && !freshIds.has(id)) this.state.deletedDelivered += 1;
    if (nextPageToken) this.state.pageTokens[chatId] = nextPageToken;
    if (firstPage) {
      this.state.initializedChats.push(chatId);
      await this.stateStore.save(this.state);
      return { primed: fresh.length, delivered: 0 };
    }
    if (this.config.mode === "off") { await this.stateStore.save(this.state); return { delivered: 0 }; }
    for (const message of fresh) {
      if (deletedIds.has(message.id)) continue;
      const immediate = this.config.mode === "continuous" || (this.config.mode === "hybrid" && isHybrid(message, this.config.hybridTriggers));
      this.enqueue({ ...message, kind: immediate ? "continuous" : "summary", generation: this.state.modeGeneration });
    }
    await this.stateStore.save(this.state);
    await this.flush(videoUrl);
    await this.maybeSummarize(videoUrl);
    await this.stateStore.save(this.state);
    return { delivered: fresh.length };
  }
  enqueue(message) {
    this.state.pending.push(message);
    while (this.state.pending.length > this.config.queueLimit || Buffer.byteLength(JSON.stringify(this.state.pending)) > this.config.maxPendingBytes) {
      this.state.pending.shift(); this.state.dropped += 1;
    }
  }
  retract(id) {
    const before = this.state.pending.length;
    this.state.pending = this.state.pending.filter((message) => message.id !== id);
    return before !== this.state.pending.length;
  }
  async flush(videoUrl) {
    const cutoff = this.now() - 60_000;
    this.state.sourceSentAt = this.state.sourceSentAt.filter((at) => at > cutoff);
    this.state.telegramSentAt = this.state.telegramSentAt.filter((at) => at > cutoff);
    while (this.state.telegramSentAt.length < this.config.telegramSendsPerMinute) {
      const available = this.config.messagesPerMinute - this.state.sourceSentAt.length;
      if (available <= 0) break;
      const batch = this.state.pending.filter((message) => message.kind === "continuous").slice(0, Math.min(10, available));
      if (!batch.length) break;
      await this.deliver(transportSafeText(formatContinuous(batch, videoUrl)), batch.map((message) => message.id), batch.length);
    }
    if (this.state.dropped && this.state.telegramSentAt.length < this.config.telegramSendsPerMinute) {
      const count = this.state.dropped;
      await this.deliver(`YT LIVE CHAT\n${count} older messages dropped by bounded storage.`, [], 0);
      this.state.dropped = 0;
    }
  }
  async deliver(text, ids, sourceCount) {
    this.state.inFlight = { ids, sourceCount, createdAt: this.now() };
    await this.stateStore.save(this.state);
    try { await this.send(text); }
    catch (error) { this.state.inFlight = null; await this.stateStore.save(this.state); throw error; }
    const delivered = new Set(ids);
    this.state.pending = this.state.pending.filter((message) => !delivered.has(message.id));
    this.state.sourceSentAt.push(...Array(sourceCount).fill(this.now()));
    this.state.telegramSentAt.push(this.now());
    this.state.inFlight = null;
    await this.stateStore.save(this.state);
  }
  async maybeSummarize(videoUrl) {
    if (this.now() - this.state.summaryStartedAt < this.config.summaryIntervalMs) return;
    const available = this.config.messagesPerMinute - this.state.sourceSentAt.length;
    const messages = this.state.pending.filter((message) => message.kind === "summary").slice(0, Math.max(0, available));
    const summary = formatSummary(messages, videoUrl);
    this.state.summaryStartedAt = this.now();
    if (summary && this.state.telegramSentAt.length < this.config.telegramSendsPerMinute) await this.deliver(transportSafeText(summary), messages.map((message) => message.id), messages.length);
    else await this.stateStore.save(this.state);
  }
  get queue() { return this.state.pending.filter((message) => message.kind === "continuous"); }
  get summary() { return this.state.pending.filter((message) => message.kind === "summary"); }
}

export class YouTubeClient {
  constructor({ token, fetchImpl = fetch, spend = async () => {} }) { this.token = token; this.fetch = fetchImpl; this.spend = spend; }
  async request(path, params, units = 1) {
    if (!this.token) throw new Error("YouTube OAuth missing: authorize youtube.readonly; relay remains disabled");
    await this.spend(units);
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value));
    const response = await this.fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!response.ok) { const error = new Error(`YouTube API ${response.status}`); error.status = response.status; throw error; }
    return response.json();
  }
  async resolveLive() {
    const data = await this.request("liveBroadcasts", { part: "id,snippet", broadcastStatus: "active", mine: true, maxResults: 5 });
    const broadcast = data.items?.[0];
    const videoId = broadcast?.id;
    const chatId = broadcast?.snippet?.liveChatId;
    return videoId && chatId ? { videoId, chatId, url: `https://www.youtube.com/watch?v=${videoId}` } : null;
  }
  list(chatId, pageToken) {
    return this.request("liveChat/messages", { part: "id,snippet,authorDetails", liveChatId: chatId, pageToken, maxResults: 200 }, 5);
  }
}

export class QuotaBudget {
  constructor({ state, limit, save, now = () => Date.now() }) { this.state = state; this.limit = limit; this.save = save; this.now = now; }
  async spend(units) {
    const day = new Date(this.now()).toISOString().slice(0, 10);
    if (this.state.quota.day !== day) this.state.quota = { day, used: 0 };
    if (this.state.quota.used + units > this.limit) throw new Error("YouTube daily quota budget exhausted; fail closed");
    this.state.quota.used += units;
    await this.save();
  }
}

export function hermesSender(destination = DESTINATION, spawnImpl = spawn) {
  if (destination !== DESTINATION) throw new Error("wrong Telegram destination refused");
  return (message) => new Promise((resolve, reject) => {
    const child = spawnImpl("hermes", ["send", "--quiet", "--to", destination, transportSafeText(message)], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Telegram delivery failed (${code}): ${sanitizeText(stderr, 160)}`)));
  });
}

function stateRoot() {
  const home = process.env.HERMES_HOME || join(homedir(), ".hermes");
  return join(home, "youtube-chat-telegram-relay");
}

async function audit(root, event) {
  const path = join(root, "audit.jsonl");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const previous = await readFile(path, "utf8").catch((error) => error?.code === "ENOENT" ? "" : Promise.reject(error));
  await writeFile(path, `${previous}${JSON.stringify({ event, at: new Date().toISOString(), uid: process.getuid?.() })}\n`, { mode: 0o600 });
}

async function main() {
  const root = stateRoot();
  const configStore = new ConfigStore(join(root, "config.json"));
  const command = process.argv[2] ?? "run";
  if (command === "status") {
    const config = await configStore.loadConfig();
    process.stdout.write(`${JSON.stringify({ enabled: false, mode: config.mode, destination: DESTINATION, credential: Boolean(process.env.YOUTUBE_ACCESS_TOKEN) })}\n`);
    return;
  }
  if (command === "mode") {
    const mode = process.argv[3];
    const config = await configStore.update({ mode });
    await audit(root, `mode:${config.mode}`);
    process.stdout.write(`mode=${config.mode}\n`);
    return;
  }
  if (command !== "run") throw new Error("usage: youtube-chat-telegram-relay.mjs [run|status|mode MODE]");
  if (!process.env.YOUTUBE_ACCESS_TOKEN) throw new Error("YouTube OAuth consent required: minimal scope https://www.googleapis.com/auth/youtube.readonly");
  const engine = await new RelayEngine({ stateStore: new JsonStore(join(root, "state.json")), configStore, send: hermesSender() }).init();
  const quota = new QuotaBudget({ state: engine.state, limit: engine.config.dailyQuotaUnits, save: () => engine.stateStore.save(engine.state) });
  const youtube = new YouTubeClient({ token: process.env.YOUTUBE_ACCESS_TOKEN, spend: (units) => quota.spend(units) });
  let failures = 0;
  let live = engine.state.live;
  let resolvedAt = live?.resolvedAt ?? 0;
  while (true) {
    try {
      if (!live && Date.now() - resolvedAt >= engine.config.discoveryIntervalMs) {
        live = await youtube.resolveLive();
        resolvedAt = Date.now();
        engine.state.live = live ? { ...live, resolvedAt } : null;
        await engine.stateStore.save(engine.state);
      }
      if (!live) { await new Promise((r) => setTimeout(r, 60_000)); continue; }
      const pageToken = engine.state.pageTokens[live.chatId];
      const page = await youtube.list(live.chatId, pageToken);
      await engine.ingest(live.chatId, page.items ?? [], live.url, page.nextPageToken);
      failures = 0;
      await new Promise((r) => setTimeout(r, Math.max(60_000, page.pollingIntervalMillis ?? 60_000)));
    } catch (error) {
      failures += 1;
      if (error?.status === 403 || error?.status === 404) { live = null; engine.state.live = null; resolvedAt = Date.now() - engine.config.discoveryIntervalMs; await engine.stateStore.save(engine.state); }
      const delay = Math.min(60_000, 1000 * (2 ** Math.min(failures, 6)));
      process.stderr.write(`[relay] API/delivery failure status=${error?.status ?? "unknown"}; retryMs=${delay}\n`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
