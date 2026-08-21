#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_RECEIPT = /^prv_[A-Za-z0-9_-]{8,64}$/;
const REQUIRED_CHECKS = Object.freeze(["policy / public-safety", "quality / node-matrix", "provenance / preview-artifact", "review / independent-receipt"]);
const PRIVATE_PATTERNS = [
  ["credential-file", /(?:^|[\\/])\.(?:env|ssh|aws|gnupg|kube)(?:[\\/]|$)/i],
  ["kanban-id", /(?:^|\W)t_[0-9a-f]{8}(?:\W|$)/i],
  ["private-path", /(?:\/home\/|\/workspace\/|[A-Z]:\\Users\\)/i],
  ["private-network", /(?:100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}|(?:10|127)\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/],
  ["private-key-or-token", /(?:BEGIN (?:RSA |OPENSSH |EC |PGP )?PRIVATE KEY|gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:api[_-]?key|password|secret|token)\s*[:=]\s*["']?[A-Za-z0-9_\/+.-]{16,})/i],
  ["email", /[A-Z0-9._%+-]+@(?!users\.noreply\.github\.com\b)[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ["private-host", /\b(?:groot|tailnet|tailscale|localhost)(?:\b|\.)/i],
];

function fail(message) { throw new Error(message); }
function load(path) { return JSON.parse(readFileSync(isAbsolute(path) ? path : resolve(ROOT, path), "utf8")); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : canonical(value)).digest("hex"); }
function assertKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const actual=Object.keys(value).sort(), expected=[...keys].sort();
  if (actual.join("\0") !== expected.join("\0")) fail(`${label} has unknown or missing fields`);
}
function future(value, now=Date.now()) {
  const parsed=Date.parse(value); return Number.isFinite(parsed) && parsed > now;
}
function validOwnership(pattern) {
  return typeof pattern === "string" && pattern.length > 0 && pattern.length <= 160 && !pattern.startsWith("/") && !pattern.startsWith("!") && !pattern.includes("..") && !pattern.includes("\\") && !pattern.includes("//");
}
function validateNightly(value, now=Date.now()) {
  assertKeys(value,["schemaVersion","base","generation","features"],"manifest");
  if(value.schemaVersion!==1||!Number.isSafeInteger(value.generation)||value.generation<1) fail("invalid schemaVersion or generation");
  assertKeys(value.base,["branch","sha"],"base");
  if(value.base.branch!=="dev"||!SHA40.test(value.base.sha)) fail("base must pin dev to a full SHA");
  if(!Array.isArray(value.features)||value.features.length>3) fail("features must contain at most 3 entries");
  const seen={slug:new Set(),pullRequest:new Set(),headSha:new Set(),order:new Set()};
  for(const feature of value.features){
    assertKeys(feature,["slug","repository","branch","pullRequest","headSha","order","ownership","publicReceipt","expiresAt"],"feature");
    if(!SLUG.test(feature.slug)||feature.repository!=="kvnloo/Hermes3D"||feature.branch!==`feature/hermes3d/${feature.slug}`) fail("invalid feature identity");
    if(!Number.isSafeInteger(feature.pullRequest)||feature.pullRequest<1||!SHA40.test(feature.headSha)||!Number.isSafeInteger(feature.order)||feature.order<0) fail("feature must pin PR, SHA, and order");
    if(!Array.isArray(feature.ownership)||feature.ownership.length===0||new Set(feature.ownership).size!==feature.ownership.length||!feature.ownership.every(validOwnership)) fail("invalid ownership glob");
    if(!SAFE_RECEIPT.test(feature.publicReceipt)||!future(feature.expiresAt,now)) fail("invalid or expired receipt");
    for(const key of Object.keys(seen)){if(seen[key].has(feature[key])) fail(`duplicate feature ${key}`);seen[key].add(feature[key]);}
  }
  const ordered=[...value.features].sort((a,b)=>a.order-b.order||a.slug.localeCompare(b.slug));
  if(ordered.some((item,index)=>item!==value.features[index])) fail("features are not in deterministic order");
  return digest(value);
}
function validateChecks(value, expectedSha){
  assertKeys(value,["sha","checks","independentReviewReceipt"],"check receipt");
  if(value.sha!==expectedSha||!SHA40.test(value.sha)||!SAFE_RECEIPT.test(value.independentReviewReceipt)) fail("check receipt is not bound to the exact SHA");
  if(!Array.isArray(value.checks)) fail("checks must be an array");
  const byName=new Map();
  for(const check of value.checks){assertKeys(check,["name","sha","status","conclusion"],"check");if(byName.has(check.name)) fail(`duplicate required check: ${check.name}`);byName.set(check.name,check);}
  if(value.checks.length!==REQUIRED_CHECKS.length||REQUIRED_CHECKS.some(name=>!byName.has(name))) fail("required check allowlist mismatch");
  for(const name of REQUIRED_CHECKS){const check=byName.get(name);if(check.sha!==expectedSha||check.status!=="completed"||check.conclusion!=="success") fail(`required check not successful for exact SHA: ${name}`);}
}
function walk(dir, budget={files:0,bytes:0}){
  const output=[];
  for(const name of readdirSync(dir).sort()){
    if([".git","node_modules",".next","test-results","playwright-report"].includes(name)) continue;
    const path=resolve(dir,name), st=statSync(path);
    if(st.isDirectory()) output.push(...walk(path,budget));
    else { if(st.size>2_000_000) fail(`scan file exceeds bound: ${relative(ROOT,path)}`); budget.files++;budget.bytes+=st.size;if(budget.files>5000||budget.bytes>50_000_000) fail("scan input exceeds bounded budget");output.push(path); }
  }
  return output;
}
function scan(paths){
  for(const path of paths){const rel=relative(ROOT,path).split(sep).join("/");let text;try{text=readFileSync(path,"utf8");}catch{continue;}for(const [kind,pattern] of PRIVATE_PATTERNS)if(pattern.test(`${rel}\n${text}`))fail(`public-safety finding (${kind}) in ${rel}; matched value suppressed`);}
}
function git(args){return execFileSync("git",args,{cwd:ROOT,encoding:"utf8"}).trim();}
function changed(base,head="HEAD",filter="ACMR"){const text=git(["diff","--name-only",`--diff-filter=${filter}`,`${base}...${head}`]);return text?text.split("\n"):[];}
function committedScanTargets(base,head="HEAD"){return changed(base,head).map(path=>resolve(ROOT,path));}
function globRegex(glob){return new RegExp(`^${glob.split("**").map(part=>part.split("*").map(s=>s.replace(/[.+?^${}()|[\]\\]/g,"\\$&")).join("[^/]*")).join(".*")}$`);}
function claimed(files,patterns){return files.filter(file=>patterns.some(pattern=>globRegex(pattern).test(file)));}
function ownership(manifest){
  const claims=new Map();
  for(const feature of manifest.features){
    const files=changed(manifest.base.sha,feature.headSha,"ACMRD");
    const owned=claimed(files,feature.ownership);
    if(files.length!==owned.length) fail(`${feature.slug} changed file outside declared ownership`);
    for(const file of owned){if(claims.has(file)&&claims.get(file)!==feature.slug)fail(`cross-feature ownership collision: ${file}`);claims.set(file,feature.slug);}
  }
}
function validatePromotion(value,currentDev,now=Date.now()){
  assertKeys(value,["schemaVersion","mode","captainGate","base","nightlyAttestation","features","expiresAt"],"promotion");
  if(value.schemaVersion!==1||!["individual","all"].includes(value.mode)||value.captainGate!=="G1_G2_REQUIRED"||!future(value.expiresAt,now)) fail("invalid or expired promotion");
  assertKeys(value.base,["branch","sha"],"promotion base");
  if(value.base.branch!=="dev"||value.base.sha!==currentDev||!SHA40.test(currentDev)) fail("promotion is not based on exact current dev");
  assertKeys(value.nightlyAttestation,["manifestDigest","treeSha","receiptDigest"],"nightly attestation");
  if(!SHA256.test(value.nightlyAttestation.manifestDigest)||!SHA40.test(value.nightlyAttestation.treeSha)||!SHA256.test(value.nightlyAttestation.receiptDigest)) fail("invalid attestation binding");
  if(!Array.isArray(value.features)||value.features.length<1||value.features.length>3||(value.mode==="individual"&&value.features.length!==1)) fail("promotion feature set does not match mode");
  for(const [index,feature] of value.features.entries()){assertKeys(feature,["slug","headSha","order"],`promotion feature ${index}`);if(!SLUG.test(feature.slug)||!SHA40.test(feature.headSha)||feature.order!==index)fail("promotion features must be exact and deterministically ordered");}
  return digest(value);
}
function validatePreview(value,now=Date.now()){
  assertKeys(value,["schemaVersion","repository","runId","runAttempt","commitSha","treeSha","artifact","sbom","provenance","createdAt","expiresAt"],"preview manifest");
  if(value.schemaVersion!==1||value.repository!=="kvnloo/Hermes3D"||!Number.isSafeInteger(value.runId)||value.runId<1||!Number.isSafeInteger(value.runAttempt)||value.runAttempt<1||!SHA40.test(value.commitSha)||!SHA40.test(value.treeSha)||!future(value.expiresAt,now)||!Number.isFinite(Date.parse(value.createdAt)))fail("invalid preview identity or expiry");
  for(const key of ["artifact","sbom","provenance"]){assertKeys(value[key],["name","digest","bytes"],key);if(!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(value[key].name)||!SHA256.test(value[key].digest)||!Number.isSafeInteger(value[key].bytes)||value[key].bytes<1)fail(`invalid ${key} binding`);}
  return digest(value);
}
function verifyPreviewFiles(value,dir){
  for(const key of ["artifact","sbom","provenance"]){
    const bytes=readFileSync(resolve(dir,value[key].name));
    if(bytes.length!==value[key].bytes||digest(bytes)!==value[key].digest) fail(`preview ${key} substitution detected`);
  }
}
function defaultScanTargets(){
  const base=process.env.GITHUB_BASE_SHA;
  if(base&&SHA40.test(base)) return committedScanTargets(base,process.env.GITHUB_HEAD_SHA||"HEAD");
  const parent=git(["rev-parse","HEAD^"]); return committedScanTargets(parent,"HEAD");
}

const [command,...args]=process.argv.slice(2);
try{
  if(command==="validate-nightly")console.log(validateNightly(load(args[0]||".gitops/nightly-manifest.json"),process.env.NOW?Date.parse(process.env.NOW):Date.now()));
  else if(command==="validate-checks"){validateChecks(load(args[0]),args[1]);console.log("required checks passed");}
  else if(command==="scan"){const targets=args.length?args.flatMap(p=>statSync(resolve(ROOT,p)).isDirectory()?walk(resolve(ROOT,p)):[resolve(ROOT,p)]):defaultScanTargets();scan(targets);console.log(`public-safety scan passed (${targets.length} files)`);}
  else if(command==="ownership"){const manifest=load(args[0]||".gitops/nightly-manifest.json");validateNightly(manifest,process.env.NOW?Date.parse(process.env.NOW):Date.now());ownership(manifest);console.log("ownership and collision checks passed");}
  else if(command==="validate-promotion")console.log(validatePromotion(load(args[0]||".gitops/promotion-manifest.json"),args[1],process.env.NOW?Date.parse(process.env.NOW):Date.now()));
  else if(command==="validate-preview"){const value=load(args[0]);const result=validatePreview(value,process.env.NOW?Date.parse(process.env.NOW):Date.now());if(args[1])verifyPreviewFiles(value,resolve(ROOT,args[1]));console.log(result);}
  else fail("usage: gitops-policy.mjs validate-nightly|validate-checks|scan|ownership|validate-promotion|validate-preview");
}catch(error){console.error(`gitops policy failed: ${error.message}`);process.exit(1);}
