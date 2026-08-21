import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script=new URL("../scripts/gitops-policy.mjs",import.meta.url).pathname;
const root=new URL("..",import.meta.url).pathname;
const run=(args,env={})=>execFileSync(process.execPath,[script,...args],{cwd:root,encoding:"utf8",env:{...process.env,...env}});
const reject=(args,env={})=>spawnSync(process.execPath,[script,...args],{cwd:root,encoding:"utf8",env:{...process.env,...env}});
const fixture=value=>{const dir=mkdtempSync(join(tmpdir(),"gitops-"));const path=join(dir,"fixture.json");writeFileSync(path,JSON.stringify(value));return {dir,path};};
const sha="a".repeat(40), hash="b".repeat(64), future="2099-01-01T00:00:00Z";
const nightly={schemaVersion:1,base:{branch:"dev",sha},generation:1,features:[{slug:"alpha",repository:"kvnloo/Hermes3D",branch:"feature/hermes3d/alpha",pullRequest:1,headSha:"c".repeat(40),order:0,ownership:["src/alpha/**"],publicReceipt:"prv_abcdefgh",expiresAt:future}]};

 test("empty desired-state manifest validates deterministically",()=>assert.match(run(["validate-nightly"]),/^[0-9a-f]{64}\n$/));
 test("unknown nightly fields fail closed",()=>{const value={...nightly,extra:true};assert.notEqual(reject(["validate-nightly",fixture(value).path]).status,0);});
 test("expired nightly entries are rejected",()=>{const value=structuredClone(nightly);value.features[0].expiresAt="2000-01-01T00:00:00Z";assert.notEqual(reject(["validate-nightly",fixture(value).path],{NOW:"2026-01-01T00:00:00Z"}).status,0);});
 test("missing, stale, pending, skipped, neutral, and duplicate checks fail",()=>{
  const good=name=>({name,sha,status:"completed",conclusion:"success"});
  const names=["policy / public-safety","quality / node-matrix","provenance / preview-artifact","review / independent-receipt"];
  const base={sha,independentReviewReceipt:"prv_abcdefgh",checks:names.map(good)};
  assert.match(run(["validate-checks",fixture(base).path,sha]),/passed/);
  for(const mutate of [v=>v.checks.pop(),v=>v.checks[0].sha="d".repeat(40),v=>v.checks[0].status="in_progress",v=>v.checks[0].conclusion="skipped",v=>v.checks[0].conclusion="neutral",v=>v.checks.push({...v.checks[0]})]){const value=structuredClone(base);mutate(value);assert.notEqual(reject(["validate-checks",fixture(value).path,sha]).status,0);}
 });
 test("scanner suppresses values across private-data classes",()=>{for(const sensitive of ["github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456","/workspace/private/file","person@example.com","100.100.1.2"]){const {path}=fixture({safe:"x"});writeFileSync(path,sensitive);const result=reject(["scan",path]);assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));assert.match(result.stderr,/matched value suppressed/);}});
 test("clean-tree default scan examines committed diff",()=>assert.match(run(["scan"]),/passed \([1-9][0-9]* files\)/));
 test("schema-free and partial promotions fail closed",()=>{const base={schemaVersion:1,mode:"individual",captainGate:"G1_G2_REQUIRED",base:{branch:"dev",sha},nightlyAttestation:{manifestDigest:hash,treeSha:sha,receiptDigest:hash},features:[{slug:"alpha",headSha:"c".repeat(40),order:0}],expiresAt:future};assert.match(run(["validate-promotion",fixture(base).path,sha]),/^[0-9a-f]{64}/);for(const value of [{features:[{}]}, {...base,features:[]}, {...base,mode:"individual",features:[...base.features,{slug:"beta",headSha:"d".repeat(40),order:1}]}, {...base,expiresAt:"2000-01-01T00:00:00Z"}])assert.notEqual(reject(["validate-promotion",fixture(value).path,sha],{NOW:"2026-01-01T00:00:00Z"}).status,0);});
 test("promotion rejects stale current dev and malformed attestation",()=>{const value=JSON.parse(readFileSync(join(root,".gitops/promotion-manifest.example.json")));assert.notEqual(reject(["validate-promotion",fixture(value).path,"d".repeat(40)]).status,0);value.base.sha="d".repeat(40);value.nightlyAttestation.receiptDigest="none";assert.notEqual(reject(["validate-promotion",fixture(value).path,"d".repeat(40)]).status,0);});
 test("preview manifest detects artifact substitution and expiry",()=>{const dir=mkdtempSync(join(tmpdir(),"preview-"));for(const name of ["preview.tgz","sbom.json","provenance.json"])writeFileSync(join(dir,name),name);const bound=name=>({name,digest:createHash("sha256").update(name).digest("hex"),bytes:Buffer.byteLength(name)});const value={schemaVersion:1,repository:"kvnloo/Hermes3D",runId:1,runAttempt:1,commitSha:sha,treeSha:sha,artifact:bound("preview.tgz"),sbom:bound("sbom.json"),provenance:bound("provenance.json"),createdAt:"2026-01-01T00:00:00Z",expiresAt:future};const path=fixture(value).path;assert.match(run(["validate-preview",path,dir]),/^[0-9a-f]{64}/);writeFileSync(join(dir,"preview.tgz"),"substitute");assert.notEqual(reject(["validate-preview",path,dir]).status,0);value.expiresAt="2000-01-01T00:00:00Z";assert.notEqual(reject(["validate-preview",fixture(value).path],{NOW:"2026-01-01T00:00:00Z"}).status,0);});
 test("workflows enforce ownership, collision, CAS, cache distrust, and true upstream",()=>{const nightlyFlow=readFileSync(join(root,".github/workflows/nightly-compose.yml"),"utf8"),feature=readFileSync(join(root,".github/workflows/feature-pr.yml"),"utf8"),upstream=readFileSync(join(root,".github/workflows/upstream-candidate.yml"),"utf8");assert.match(nightlyFlow,/gitops-policy\.mjs ownership/);assert.match(nightlyFlow,/force-with-lease/);assert.match(nightlyFlow,/sha256sum -c nightly-bundle/);assert.match(feature,/npm ci --ignore-scripts/);assert.match(feature,/cmp preview-a/);assert.match(upstream,/remote add true-upstream/);assert.match(upstream,/generic-performance-only/);});
