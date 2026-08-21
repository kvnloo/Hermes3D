#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SHA40 = /^[0-9a-f]{40}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_RECEIPT = /^prv_[A-Za-z0-9_-]{8,64}$/;
const PRIVATE_PATTERNS = [
  /(?:^|[\\/])\.(?:env|ssh|aws)(?:[\\/]|$)/i,
  /(?:^|\W)t_[0-9a-f]{8}(?:\W|$)/i,
  /(?:\/home\/|\/workspace\/|[A-Z]:\\Users\\)/i,
  /(?:100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})/,
  /(?:BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY|gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/,
];

function fail(message) { throw new Error(message); }
function json(path) { return JSON.parse(readFileSync(resolve(ROOT, path), "utf8")); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function assertKeys(value, keys, label) {
  const actual = Object.keys(value).sort(); const expected = [...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) fail(`${label} has unknown or missing fields`);
}
function validOwnership(pattern) {
  return typeof pattern === "string" && pattern.length <= 160 && !pattern.startsWith("/") && !pattern.startsWith("!") && !pattern.includes("..") && !pattern.includes("\\") && !pattern.includes("//");
}
function validateNightly(value) {
  assertKeys(value, ["schemaVersion", "base", "generation", "features"], "manifest");
  if (value.schemaVersion !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1) fail("invalid schemaVersion or generation");
  assertKeys(value.base, ["branch", "sha"], "base");
  if (value.base.branch !== "dev" || !SHA40.test(value.base.sha)) fail("base must pin dev to a full SHA");
  if (!Array.isArray(value.features) || value.features.length > 3) fail("features must contain at most 3 entries");
  const seen = { slug: new Set(), pullRequest: new Set(), headSha: new Set(), order: new Set() };
  for (const feature of value.features) {
    assertKeys(feature, ["slug", "repository", "branch", "pullRequest", "headSha", "order", "ownership", "publicReceipt", "expiresAt"], "feature");
    if (!SLUG.test(feature.slug) || feature.repository !== "kvnloo/Hermes3D" || feature.branch !== `feature/hermes3d/${feature.slug}`) fail("invalid feature identity");
    if (!Number.isSafeInteger(feature.pullRequest) || feature.pullRequest < 1 || !SHA40.test(feature.headSha) || !Number.isSafeInteger(feature.order)) fail("feature must pin PR, SHA, and order");
    if (!Array.isArray(feature.ownership) || feature.ownership.length === 0 || !feature.ownership.every(validOwnership)) fail("invalid ownership glob");
    if (!SAFE_RECEIPT.test(feature.publicReceipt) || Number.isNaN(Date.parse(feature.expiresAt))) fail("invalid receipt or expiry");
    for (const key of Object.keys(seen)) { if (seen[key].has(feature[key])) fail(`duplicate feature ${key}`); seen[key].add(feature[key]); }
  }
  const ordered = [...value.features].sort((a,b) => a.order-b.order || a.slug.localeCompare(b.slug));
  if (ordered.some((item,index) => item !== value.features[index])) fail("features are not in deterministic order");
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function walk(dir) {
  const output=[]; for (const name of readdirSync(dir)) { if ([".git","node_modules",".next","test-results","playwright-report"].includes(name)) continue; const path=resolve(dir,name); const st=statSync(path); if(st.isDirectory()) output.push(...walk(path)); else if(st.size <= 2_000_000) output.push(path); } return output;
}
function scan(paths) {
  for (const path of paths) { const rel=relative(ROOT,path).split(sep).join("/"); let text; try { text=readFileSync(path,"utf8"); } catch { continue; }
    if (PRIVATE_PATTERNS.some(pattern => pattern.test(`${rel}\n${text}`))) fail(`public-safety finding in ${rel}; matched value suppressed`);
  }
}
function changed(base, head="HEAD") { return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", `${base}...${head}`], {cwd:ROOT,encoding:"utf8"}).trim().split("\n").filter(Boolean); }
function defaultScanTargets() {
  if (process.env.GITHUB_BASE_SHA && SHA40.test(process.env.GITHUB_BASE_SHA)) return changed(process.env.GITHUB_BASE_SHA).map(path => resolve(ROOT,path));
  return execFileSync("git", ["ls-files", "--modified", "--others", "--exclude-standard"], {cwd:ROOT,encoding:"utf8"}).trim().split("\n").filter(Boolean).map(path => resolve(ROOT,path));
}
function globRegex(glob) { return new RegExp(`^${glob.split("**").map(part => part.split("*").map(s=>s.replace(/[.+?^${}()|[\]\\]/g,"\\$&")).join("[^/]*")).join(".*")}$`); }
function ownership(manifest, base, head) {
  const files=changed(base,head); const claims=new Map();
  for (const feature of manifest.features) for (const pattern of feature.ownership) { const regex=globRegex(pattern); for (const file of files) if(regex.test(file)) { if(claims.has(file) && claims.get(file)!==feature.slug) fail(`ownership collision: ${file}`); claims.set(file,feature.slug); } }
  for (const file of files) if(!claims.has(file)) fail(`changed file outside declared ownership: ${file}`);
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "validate-nightly") console.log(validateNightly(json(args[0] || ".gitops/nightly-manifest.json")));
  else if (command === "scan") { const targets=args.length ? args.flatMap(p=>statSync(resolve(ROOT,p)).isDirectory()?walk(resolve(ROOT,p)):[resolve(ROOT,p)]) : defaultScanTargets(); scan(targets); console.log("public-safety scan passed"); }
  else if (command === "ownership") { const manifest=json(args[0] || ".gitops/nightly-manifest.json"); validateNightly(manifest); ownership(manifest,args[1] || manifest.base.sha,args[2]); console.log("ownership check passed"); }
  else fail("usage: gitops-policy.mjs validate-nightly [file] | scan [paths...] | ownership [manifest] [base] [head]");
} catch (error) { console.error(`gitops policy failed: ${error.message}`); process.exit(1); }
