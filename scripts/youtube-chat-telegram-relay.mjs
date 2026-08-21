#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
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
const DEFAULT_CONFIG = Object.freeze({
  mode: "summary",
  summaryIntervalMs: 300_000,
  messagesPerMinute: 20,
  queueLimit: 200,
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

export function validateConfig(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("config must be an object");
  const allowed = new Set(Object.keys(DEFAULT_CONFIG));
  for (const key of Object.keys(candidate)) if (!allowed.has(key)) throw new Error(`unknown config field: ${key}`);
  const config = { ...DEFAULT_CONFIG, ...candidate };
  if (!MODES.has(config.mode)) throw new Error("invalid relay mode");
  if (!Number.isInteger(config.summaryIntervalMs) || config.summaryIntervalMs < 60_000 || config.summaryIntervalMs > 3_600_000) throw new Error("summaryIntervalMs out of bounds");
  if (!Number.isInteger(config.messagesPerMinute) || config.messagesPerMinute < 1 || config.messagesPerMinute > 60) throw new Error("messagesPerMinute out of bounds");
  if (!Number.isInteger(config.queueLimit) || config.queueLimit < 10 || config.queueLimit > 1_000) throw new Error("queueLimit out of bounds");
  if (typeof config.pollWhileOff !== "boolean") throw new Error("pollWhileOff must be boolean");
  if (!Array.isArray(config.hybridTriggers) || config.hybridTriggers.length > 20 || config.hybridTriggers.some((v) => typeof v !== "string" || !v || v.length > 40)) throw new Error("invalid hybridTriggers");
  return config;
}

export class JsonStore {
  constructor(path) { this.path = path; }
  async load(fallback) {
    try { return JSON.parse(await readFile(this.path, "utf8")); }
    catch (error) { if (error?.code === "ENOENT") return structuredClone(fallback); throw error; }
  }
  async save(value) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await rename(temp, this.path);
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
    this.summary = [];
    this.queue = [];
    this.sentAt = [];
  }
  async init() {
    this.config = await this.configStore.loadConfig();
    this.state = await this.stateStore.load({ seen: [], initializedChats: [], pageTokens: {}, dropped: 0, mode: this.config.mode, summaryStartedAt: this.now() });
    return this;
  }
  async reloadConfig() {
    const next = await this.configStore.loadConfig();
    if (next.mode !== this.config.mode) {
      this.summary = [];
      this.queue = [];
      this.state.mode = next.mode;
      this.state.summaryStartedAt = this.now();
      await this.stateStore.save(this.state);
    }
    this.config = next;
  }
  async ingest(chatId, items, videoUrl) {
    await this.reloadConfig();
    const firstPage = !this.state.initializedChats.includes(chatId);
    const seen = new Set(this.state.seen);
    const fresh = [];
    for (const item of items) {
      if (!item?.id || seen.has(String(item.id))) continue;
      seen.add(String(item.id));
      if (isDeliverable(item)) fresh.push(publicMessage(item));
    }
    this.state.seen = [...seen].slice(-5000);
    if (firstPage) {
      this.state.initializedChats.push(chatId);
      await this.stateStore.save(this.state);
      return { primed: fresh.length, delivered: 0 };
    }
    if (this.config.mode === "off") { await this.stateStore.save(this.state); return { delivered: 0 }; }
    for (const message of fresh) {
      if (this.config.mode === "continuous" || (this.config.mode === "hybrid" && isHybrid(message, this.config.hybridTriggers))) this.enqueue(message);
      else this.summary.push(message);
    }
    await this.flush(videoUrl);
    await this.maybeSummarize(videoUrl);
    await this.stateStore.save(this.state);
    return { delivered: fresh.length };
  }
  enqueue(message) {
    this.queue.push(message);
    if (this.queue.length > this.config.queueLimit) {
      const excess = this.queue.length - this.config.queueLimit;
      this.queue.splice(0, excess);
      this.state.dropped += excess;
    }
  }
  async flush(videoUrl) {
    const cutoff = this.now() - 60_000;
    this.sentAt = this.sentAt.filter((at) => at > cutoff);
    while (this.queue.length && this.sentAt.length < this.config.messagesPerMinute) {
      const batch = this.queue.splice(0, 10);
      await this.send(formatContinuous(batch, videoUrl));
      this.sentAt.push(this.now());
    }
    if (this.state.dropped && this.sentAt.length < this.config.messagesPerMinute) {
      await this.send(`YT LIVE CHAT\n${this.state.dropped} older messages dropped by bounded queue.`);
      this.sentAt.push(this.now());
      this.state.dropped = 0;
    }
  }
  async maybeSummarize(videoUrl) {
    if (this.now() - this.state.summaryStartedAt < this.config.summaryIntervalMs) return;
    const summary = formatSummary(this.summary, videoUrl);
    this.summary = [];
    this.state.summaryStartedAt = this.now();
    if (summary) await this.send(summary);
  }
}

export class YouTubeClient {
  constructor({ token, fetchImpl = fetch }) { this.token = token; this.fetch = fetchImpl; }
  async request(path, params) {
    if (!this.token) throw new Error("YouTube OAuth missing: authorize youtube.readonly; relay remains disabled");
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value));
    const response = await this.fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!response.ok) { const error = new Error(`YouTube API ${response.status}`); error.status = response.status; throw error; }
    return response.json();
  }
  async resolveLive() {
    const channels = await this.request("channels", { part: "id", forHandle: "@kvnloo" });
    const channelId = channels.items?.[0]?.id;
    if (!channelId) return null;
    const broadcasts = await this.request("search", { part: "id", channelId, eventType: "live", type: "video", maxResults: 5 });
    const videoId = broadcasts.items?.[0]?.id?.videoId;
    if (!videoId) return null;
    const data = await this.request("videos", { part: "snippet,liveStreamingDetails", id: videoId });
    const video = data.items?.[0];
    const chatId = video?.liveStreamingDetails?.activeLiveChatId;
    return chatId ? { videoId, chatId, channelId: video.snippet?.channelId, url: `https://www.youtube.com/watch?v=${videoId}` } : null;
  }
  list(chatId, pageToken) {
    return this.request("liveChat/messages", { part: "id,snippet,authorDetails", liveChatId: chatId, pageToken, maxResults: 200 });
  }
}

export function hermesSender(destination = DESTINATION) {
  if (destination !== DESTINATION) throw new Error("wrong Telegram destination refused");
  return (message) => new Promise((resolve, reject) => {
    const child = spawn("hermes", ["send", "--quiet", "--to", destination, message], { stdio: ["ignore", "ignore", "pipe"] });
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
  const youtube = new YouTubeClient({ token: process.env.YOUTUBE_ACCESS_TOKEN });
  const engine = await new RelayEngine({ stateStore: new JsonStore(join(root, "state.json")), configStore, send: hermesSender() }).init();
  let failures = 0;
  let live = null;
  let resolvedAt = 0;
  while (true) {
    try {
      if (!live || Date.now() - resolvedAt >= 300_000) {
        live = await youtube.resolveLive();
        resolvedAt = Date.now();
      }
      if (!live) { await new Promise((r) => setTimeout(r, 30_000)); continue; }
      const pageToken = engine.state.pageTokens[live.chatId];
      const page = await youtube.list(live.chatId, pageToken);
      await engine.ingest(live.chatId, page.items ?? [], live.url);
      if (page.nextPageToken) { engine.state.pageTokens[live.chatId] = page.nextPageToken; await engine.stateStore.save(engine.state); }
      failures = 0;
      await new Promise((r) => setTimeout(r, Math.max(1000, page.pollingIntervalMillis ?? 5000)));
    } catch (error) {
      failures += 1;
      if (error?.status === 403 || error?.status === 404) live = null;
      const delay = Math.min(60_000, 1000 * (2 ** Math.min(failures, 6)));
      process.stderr.write(`[relay] API/delivery failure status=${error?.status ?? "unknown"}; retryMs=${delay}\n`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
