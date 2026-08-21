#!/usr/bin/env node
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DESTINATION = "telegram:1083429746";
export const CHANNEL_LIVE_URL = "https://www.youtube.com/@kvnloo/live";
export const MODES = new Set(["continuous", "summary", "hybrid", "off"]);
export const CREATE_OUTCOME = Object.freeze({ CREATED: "CREATED", EXISTS: "EXISTS", UNSAFE_PATH: "UNSAFE_PATH", ERROR: "ERROR" });
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
  constructor(path, { fault = async (_step) => {}, suffix = () => `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}` } = {}) {
    this.path = path;
    this.fault = fault;
    this.suffix = suffix;
  }
  async validateParent() {
    const directoryPath = dirname(this.path);
    await mkdir(directoryPath, { recursive: true, mode: 0o700 });
    const parent = await lstat(directoryPath);
    if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error("relay state parent must be a real directory");
    if (await realpath(directoryPath) !== resolve(directoryPath)) throw new Error("relay state parent realpath substitution refused");
    return directoryPath;
  }
  async assertRegularOrAbsent() {
    try {
      const entry = await lstat(this.path);
      if (!entry.isFile() || entry.isSymbolicLink()) throw new Error("relay state path must be a regular file");
      return entry;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }
  async createIfAbsent(value) {
    let directoryPath;
    const temp = `${this.path}.${this.suffix()}.bootstrap.tmp`;
    let file;
    try {
      directoryPath = await this.validateParent();
      await this.fault("bootstrap:open"); file = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      await this.fault("bootstrap:write"); await file.writeFile(`${JSON.stringify(value, null, 2)}\n`);
      await this.fault("bootstrap:fsync"); await file.sync();
      await this.fault("bootstrap:close"); await file.close(); file = null;
      await this.fault("bootstrap:link");
      try { await link(temp, this.path); }
      catch (error) {
        if (error?.code === "EEXIST") return { outcome: CREATE_OUTCOME.EXISTS };
        if (["ELOOP", "ENOTDIR", "EPERM"].includes(error?.code)) return { outcome: CREATE_OUTCOME.UNSAFE_PATH, error };
        throw error;
      }
      await rm(temp);
      const directory = await open(directoryPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await this.fault("bootstrap:dir-fsync"); await directory.sync(); }
      finally { await directory.close(); }
      return { outcome: CREATE_OUTCOME.CREATED };
    } catch (error) {
      return { outcome: CREATE_OUTCOME.ERROR, error };
    } finally {
      await file?.close().catch(() => {}); await rm(temp, { force: true });
    }
  }
  async load(fallback, { corruptFallback } = {}) {
    try {
      await this.validateParent();
      await this.assertRegularOrAbsent();
      const file = await open(this.path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { return JSON.parse(await file.readFile("utf8")); } finally { await file.close(); }
    }
    catch (error) {
      if (error?.code === "ENOENT") return structuredClone(fallback);
      if (error instanceof SyntaxError && corruptFallback) {
        await this.replaceCorrupt(structuredClone(corruptFallback));
        return structuredClone(corruptFallback);
      }
      throw error;
    }
  }
  async replaceCorrupt(sentinel) {
    const directoryPath = await this.validateParent();
    await this.assertRegularOrAbsent();
    const suffix = this.suffix();
    const quarantine = `${this.path}.corrupt-${suffix}`;
    const temp = `${this.path}.${suffix}.tmp`;
    const invalid = await readFile(this.path);
    let quarantineFile;
    let sentinelFile;
    try {
      await this.fault("quarantine:open"); quarantineFile = await open(quarantine, "wx", 0o600);
      await this.fault("quarantine:write"); await quarantineFile.writeFile(invalid);
      await this.fault("quarantine:fsync"); await quarantineFile.sync();
      await this.fault("quarantine:close"); await quarantineFile.close(); quarantineFile = null;
      await this.fault("safe-temp:open"); sentinelFile = await open(temp, "wx", 0o600);
      await this.fault("safe-temp:write"); await sentinelFile.writeFile(`${JSON.stringify(sentinel, null, 2)}\n`);
      await this.fault("safe-temp:fsync"); await sentinelFile.sync();
      await this.fault("safe-temp:close"); await sentinelFile.close(); sentinelFile = null;
      await this.fault("state:rename");
      await this.assertRegularOrAbsent();
      await rename(temp, this.path);
      await this.fault("parent:open");
      const directory = await open(directoryPath, "r");
      try { await this.fault("parent:fsync"); await directory.sync(); }
      finally { await this.fault("parent:close"); await directory.close(); }
    } catch (error) {
      await quarantineFile?.close().catch(() => {}); await sentinelFile?.close().catch(() => {}); await rm(temp, { force: true });
      throw new Error(`relay state corrupt and durable safe-off replacement failed: ${error.message}`);
    }
  }
  async save(value) {
    await this.validateParent();
    await this.assertRegularOrAbsent();
    const lock = `${this.path}.lock`;
    let lockFile;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try { lockFile = await open(lock, "wx", 0o600); break; }
      catch (error) { if (error?.code !== "EEXIST" || attempt === 199) throw error; await new Promise((resolve) => setTimeout(resolve, 10)); }
    }
    const temp = `${this.path}.${process.pid}.tmp`;
    try {
      const current = await this.load(null);
      if (current?.version === 3 && value?.version === 3 && current.modeGeneration > value.modeGeneration) throw new Error("stale relay generation write refused");
      const file = await open(temp, "w", 0o600);
      try { await file.writeFile(`${JSON.stringify(value, null, 2)}\n`); await file.sync(); } finally { await file.close(); }
      await this.fault("save:before-rename");
      await this.assertRegularOrAbsent();
      await rename(temp, this.path);
      const directory = await open(dirname(this.path), "r");
      try { await directory.sync(); } finally { await directory.close(); }
    } finally {
      await lockFile?.close(); await rm(lock, { force: true }); await rm(temp, { force: true });
    }
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
  async quarantine() { this.quarantined = structuredClone(this.value); this.value = {}; }
}

class AsyncMutex {
  constructor() { this.tail = Promise.resolve(); }
  async runExclusive(operation, timeoutMs = 30_000) {
    let release;
    let acquired = false;
    const predecessor = this.tail;
    this.tail = new Promise((resolve) => { release = resolve; });
    let timer;
    try {
      await Promise.race([predecessor, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("relay transition pending; in-flight transport did not settle")), timeoutMs); })]);
      acquired = true; clearTimeout(timer);
      return await operation();
    } finally {
      clearTimeout(timer);
      if (acquired) release(); else predecessor.finally(release);
    }
  }
}
const transitionSendMutex = new AsyncMutex();

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

const DELIVERED_LIMIT = 5_000;
const DELIVERED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const initialState = (config, now) => ({ version: 3, initialized: true, enabled: config.mode !== "off", reason: null, config, modeGeneration: 0, seen: [], initializedChats: [], pageTokens: {}, pending: [], dropped: 0, droppedOnModeChange: { count: 0, bytes: 0 }, deletedAfterDelivery: 0, unknownDeletion: 0, deliveredSourceIds: [], summaryStartedAt: now, sourceSentAt: [], telegramSentAt: [], inFlight: null, inFlightUncertain: 0, live: null, quota: { day: "", used: 0 }, migrationReceipt: null });
function validState(state) {
  if (!state || state.version !== 3 || !Number.isInteger(state.modeGeneration) || !Array.isArray(state.pending) || !Array.isArray(state.deliveredSourceIds)) return false;
  try { validateConfig(state.config); } catch { return false; }
  return Array.isArray(state.seen) && Array.isArray(state.initializedChats) && Array.isArray(state.sourceSentAt) && Array.isArray(state.telegramSentAt) && state.pageTokens && state.quota;
}

export class RelayEngine {
  constructor({ stateStore, configStore, send, now = () => Date.now(), beforeSend = async () => {}, transitionTimeoutMs = 30_000 }) {
    this.stateStore = stateStore;
    this.configStore = configStore;
    this.send = send;
    this.now = now;
    this.beforeSend = beforeSend;
    this.transitionTimeoutMs = transitionTimeoutMs;
    this.state = null;
    this.config = null;
  }
  async init() {
    const defaults = await this.configStore.loadConfig();
    const safeOff = initialState({ ...defaults, mode: "off" }, this.now());
    safeOff.modeGeneration = 1;
    safeOff.migrationReceipt = { corruptStateQuarantined: true, at: this.now() };
    let state = await this.stateStore.load(null, { corruptFallback: safeOff });
    if (state === null) {
      state = initialState({ ...defaults, mode: "off" }, this.now());
      state.modeGeneration = Math.max(1, Math.trunc(this.now()) || 1);
      state.enabled = false;
      state.reason = "absent_state_bootstrap";
      state.migrationReceipt = { reason: "absent_state_bootstrap", at: this.now() };
      if (this.stateStore.createIfAbsent) {
        const creation = await this.stateStore.createIfAbsent(state);
        if (creation?.outcome !== CREATE_OUTCOME.CREATED) {
          this.state = state;
          this.config = state.config;
          const detail = creation?.outcome === CREATE_OUTCOME.EXISTS ? "bootstrap_race" : creation?.outcome?.toLowerCase?.() ?? "error";
          throw new Error(`durable absent-state safe-off bootstrap failed: ${detail}${creation?.error?.message ? `: ${creation.error.message}` : ""}`);
        }
      } else await this.stateStore.save(state);
    }
    else if (state?.version === 2 && MODES.has(state.mode) && Array.isArray(state.pending)) {
      const pending = state.pending;
      state = { ...initialState({ ...defaults, mode: state.mode }, this.now()), modeGeneration: Number.isInteger(state.modeGeneration) ? state.modeGeneration : 0, seen: state.seen ?? [], initializedChats: state.initializedChats ?? [], pageTokens: state.pageTokens ?? {}, live: state.live ?? null, quota: state.quota ?? { day: "", used: 0 }, droppedOnModeChange: { count: pending.length, bytes: Buffer.byteLength(JSON.stringify(pending)) }, migrationReceipt: { fromVersion: 2, pendingDiscarded: pending.length, at: this.now() } };
    } else if (!validState(state)) {
      state = initialState({ ...defaults, mode: "off" }, this.now());
      state.migrationReceipt = { corruptStateQuarantined: true, at: this.now() };
      if (this.stateStore.replaceCorrupt) await this.stateStore.replaceCorrupt(state);
      else { await this.stateStore.quarantine?.(); await this.stateStore.save(state); }
      throw new Error("relay state incomplete or unsupported; quarantined and failed closed off");
    }
    this.state = state; this.config = state.config; this.pruneDelivered(); this.purgeStale();
    if (state.inFlight) {
      state.inFlightUncertain = (state.inFlightUncertain ?? 0) + 1;
      this.discardPending(); state.config.mode = "off"; state.modeGeneration += 1; state.inFlight = null;
      state.migrationReceipt = { ambiguousDeliveryFailedClosed: true, at: this.now() };
    }
    await this.stateStore.save(state); return this;
  }
  async reloadConfig() {
    const state = await this.stateStore.load(null);
    if (!validState(state)) throw new Error("canonical relay state invalid; fail closed");
    this.state = state; this.config = state.config; this.pruneDelivered(); this.purgeStale();
  }
  async transitionMode(mode, actorUid = process.getuid?.()) {
    if (actorUid !== process.getuid?.()) throw new Error("owner-only mode change refused");
    if (!MODES.has(mode)) throw new Error("invalid relay mode");
    return transitionSendMutex.runExclusive(async () => {
      await this.reloadConfig();
      if (this.state.inFlight) this.state.inFlightUncertain = (this.state.inFlightUncertain ?? 0) + 1;
      this.discardPending(); this.state.config.mode = mode; this.state.modeGeneration += 1;
      this.state.enabled = mode !== "off"; this.state.reason = null;
      this.state.summaryStartedAt = this.now(); this.state.sourceSentAt = []; this.state.telegramSentAt = []; this.state.inFlight = null;
      await this.stateStore.save(this.state); this.config = this.state.config; return this.state;
    }, this.transitionTimeoutMs);
  }
  discardPending() {
    this.state.droppedOnModeChange.count += this.state.pending.length;
    this.state.droppedOnModeChange.bytes += Buffer.byteLength(JSON.stringify(this.state.pending)); this.state.pending = [];
  }
  purgeStale() { this.state.pending = this.state.pending.filter((item) => item.generation === this.state.modeGeneration); }
  pruneDelivered() { const cutoff = this.now() - DELIVERED_RETENTION_MS; this.state.deliveredSourceIds = this.state.deliveredSourceIds.filter((item) => item.deliveredAt >= cutoff).slice(-DELIVERED_LIMIT); }
  recordDelivered(ids, generation) { const known = new Set(this.state.deliveredSourceIds.map((item) => item.id)); for (const id of ids) if (!known.has(id)) this.state.deliveredSourceIds.push({ id, deliveredAt: this.now(), generation }); this.pruneDelivered(); }
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
    const deliveredIds = new Set(this.state.deliveredSourceIds.map((item) => item.id));
    for (const id of deletedIds) if (!deletedPending.has(id) && !freshIds.has(id)) {
      if (deliveredIds.has(id)) this.state.deletedAfterDelivery += 1;
      else this.state.unknownDeletion += 1;
    }
    if (nextPageToken) this.state.pageTokens[chatId] = nextPageToken;
    if (firstPage) {
      this.state.initializedChats.push(chatId);
      await this.stateStore.save(this.state);
      return { primed: fresh.length, delivered: 0 };
    }
    if (this.config.mode === "off") { this.state.pending = []; await this.stateStore.save(this.state); return { delivered: 0 }; }
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
    if (message.generation !== this.state.modeGeneration) return;
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
    this.purgeStale();
    const cutoff = this.now() - 60_000;
    this.state.sourceSentAt = this.state.sourceSentAt.filter((at) => at > cutoff);
    this.state.telegramSentAt = this.state.telegramSentAt.filter((at) => at > cutoff);
    while (this.state.telegramSentAt.length < this.config.telegramSendsPerMinute) {
      const available = this.config.messagesPerMinute - this.state.sourceSentAt.length;
      if (available <= 0) break;
      const batch = this.state.pending.filter((message) => message.kind === "continuous" && message.generation === this.state.modeGeneration).slice(0, Math.min(10, available));
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
    return transitionSendMutex.runExclusive(async () => {
      await this.reloadConfig();
      const generation = this.state.modeGeneration;
      if (this.config.mode === "off" || (ids.length && !ids.every((id) => this.state.pending.some((item) => item.id === id && item.generation === generation)))) return false;
      const operationId = `${process.pid}:${generation}:${this.now()}:${Math.random().toString(16).slice(2)}`;
      this.state.inFlight = { ids, sourceCount, generation, operationId, createdAt: this.now() };
      await this.stateStore.save(this.state);
      await this.beforeSend();
      const canonical = await this.stateStore.load(null);
      if (!validState(canonical) || canonical.modeGeneration !== generation || canonical.config.mode === "off" || canonical.inFlight?.operationId !== operationId) { this.state = canonical; this.config = canonical?.config; return false; }
      try { await this.send(text); }
      catch (error) {
        const failed = await this.stateStore.load(null);
        if (validState(failed) && failed.inFlight?.operationId === operationId) {
          failed.inFlight = { generation, operationId, sourceCount, uncertain: true, createdAt: this.now() };
          await this.stateStore.save(failed); this.state = failed; this.config = failed.config;
        }
        throw error;
      }
      const acknowledged = await this.stateStore.load(null);
      if (!validState(acknowledged) || acknowledged.modeGeneration !== generation || acknowledged.inFlight?.operationId !== operationId) throw new Error("transport completed but canonical acknowledgement is uncertain");
      this.state = acknowledged; this.config = acknowledged.config;
      const delivered = new Set(ids);
      this.state.pending = this.state.pending.filter((message) => !delivered.has(message.id));
      this.state.sourceSentAt.push(...Array(sourceCount).fill(this.now())); this.state.telegramSentAt.push(this.now());
      this.recordDelivered(ids, generation); this.state.inFlight = null;
      await this.stateStore.save(this.state); return true;
    }, this.transitionTimeoutMs);
  }
  async maybeSummarize(videoUrl) {
    this.purgeStale();
    if (this.now() - this.state.summaryStartedAt < this.config.summaryIntervalMs) return;
    const available = this.config.messagesPerMinute - this.state.sourceSentAt.length;
    const messages = this.state.pending.filter((message) => message.kind === "summary" && message.generation === this.state.modeGeneration).slice(0, Math.max(0, available));
    const summary = formatSummary(messages, videoUrl);
    this.state.summaryStartedAt = this.now();
    if (summary && this.state.telegramSentAt.length < this.config.telegramSendsPerMinute) await this.deliver(transportSafeText(summary), messages.map((message) => message.id), messages.length);
    else await this.stateStore.save(this.state);
  }
  get queue() { return this.state.pending.filter((message) => message.kind === "continuous" && message.generation === this.state.modeGeneration); }
  get summary() { return this.state.pending.filter((message) => message.kind === "summary" && message.generation === this.state.modeGeneration); }
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
  const stateStore = new JsonStore(join(root, "state.json"));
  const command = process.argv[2] ?? "run";
  if (command === "status") {
    const engine = await new RelayEngine({ stateStore, configStore, send: async () => { throw new Error("status cannot send"); } }).init();
    process.stdout.write(`${JSON.stringify({ enabled: false, mode: engine.config.mode, modeGeneration: engine.state.modeGeneration, destination: DESTINATION, credential: Boolean(process.env.YOUTUBE_ACCESS_TOKEN) })}\n`);
    return;
  }
  if (command === "mode") {
    const mode = process.argv[3];
    const engine = await new RelayEngine({ stateStore, configStore, send: async () => { throw new Error("mode command cannot send"); } }).init();
    await engine.transitionMode(mode);
    await audit(root, `mode:${engine.config.mode}:generation:${engine.state.modeGeneration}`);
    process.stdout.write(`mode=${engine.config.mode} generation=${engine.state.modeGeneration}\n`);
    return;
  }
  if (command !== "run") throw new Error("usage: youtube-chat-telegram-relay.mjs [run|status|mode MODE]");
  if (!process.env.YOUTUBE_ACCESS_TOKEN) throw new Error("YouTube OAuth consent required: minimal scope https://www.googleapis.com/auth/youtube.readonly");
  const engine = await new RelayEngine({ stateStore, configStore, send: hermesSender() }).init();
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
