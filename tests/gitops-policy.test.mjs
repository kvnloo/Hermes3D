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
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(",")}]`:value&&typeof value==="object"?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`:JSON.stringify(value);
const digest=value=>createHash("sha256").update(canonical(value)).digest("hex");
const promotionFixtures=(mode="individual")=>{const manifest=structuredClone(nightly);const features=manifest.features.map(({slug,headSha,order})=>({slug,headSha,order}));const receipt={schemaVersion:1,repository:"kvnloo/Hermes3D",manifestDigest:digest(manifest),treeSha:sha,features};const promotion={schemaVersion:1,mode,captainGate:"G1_G2_REQUIRED",base:{branch:"dev",sha},nightlyAttestation:{manifestDigest:receipt.manifestDigest,treeSha:sha,receiptDigest:digest(receipt)},features,expiresAt:future};return {manifest,receipt,promotion};};

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
 test("scanner suppresses values across private-data classes",()=>{for(const sensitive of [["github","pat","ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"].join("_"),["","workspace","private","file"].join("/"),["person","example.com"].join("@"),[100,100,1,2].join(".")]){const {path}=fixture({safe:"x"});writeFileSync(path,sensitive);const result=reject(["scan",path]);assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));assert.match(result.stderr,/matched value suppressed/);}});
 test("clean-tree default scan examines committed diff without scanner self-trigger",()=>assert.match(run(["scan"]),/passed \([1-9][0-9]* files\)/));
 test("private-host detector still rejects hostile fixtures",()=>{const {path}=fixture({});writeFileSync(path,["local","host"].join(""));assert.notEqual(reject(["scan",path]).status,0);});
 test("promotion requires trusted receipt and exact selected set",()=>{const {manifest,receipt,promotion}=promotionFixtures();const args=[fixture(promotion).path,sha,fixture(receipt).path,fixture(manifest).path];assert.match(run(["validate-promotion",...args]),/^[0-9a-f]{64}/);assert.notEqual(reject(["validate-promotion",fixture(promotion).path,sha]).status,0);for(const mutate of [v=>v.nightlyAttestation.receiptDigest=hash,v=>v.features[0].headSha="d".repeat(40),v=>v.features=[],v=>v.features[0].slug="other"]){const value=structuredClone(promotion);mutate(value);assert.notEqual(reject(["validate-promotion",fixture(value).path,sha,fixture(receipt).path,fixture(manifest).path]).status,0);}});
 test("promotion rejects stale current dev and substituted receipt",()=>{const {manifest,receipt,promotion}=promotionFixtures();assert.notEqual(reject(["validate-promotion",fixture(promotion).path,"d".repeat(40),fixture(receipt).path,fixture(manifest).path]).status,0);receipt.treeSha="d".repeat(40);assert.notEqual(reject(["validate-promotion",fixture(promotion).path,sha,fixture(receipt).path,fixture(manifest).path]).status,0);});
 test("check-run pagination aggregation handles more than 100 checks deterministically",()=>{const pages=[{check_runs:Array.from({length:100},(_,id)=>({id,name:`z${id}`}))},{check_runs:[{id:101,name:"a"}]}];const aggregated=pages.flatMap(page=>page.check_runs).sort((a,b)=>a.name.localeCompare(b.name)||a.id-b.id);assert.equal(aggregated.length,101);assert.equal(aggregated[0].name,"a");assert.ok(readFileSync(join(root,".github/workflows/nightly-compose.yml"),"utf8").includes("jq -s '{check_runs: [.[].check_runs[]]"));});
 test("atomic tag/CAS transaction converges after lease loss and receipt interruption",()=>{
  const dir=mkdtempSync(join(tmpdir(),"cas-")),remote=join(dir,"remote.git"),a=join(dir,"a"),b=join(dir,"b"),receipt=join(dir,"receipt");
  const git=(cwd,...args)=>execFileSync("git",args,{cwd,encoding:"utf8"}).trim();
  git(dir,"init","--bare",remote);for(const clone of [a,b])git(dir,"clone",remote,clone);
  for(const clone of [a,b]){git(clone,"config","user.email","bot@users.noreply.github.com");git(clone,"config","user.name","bot");}
  writeFileSync(join(a,"state"),"one");git(a,"add","state");git(a,"commit","-m","one");git(a,"push","origin","HEAD:nightly");git(b,"fetch","origin");git(b,"switch","-c","target","origin/nightly");
  writeFileSync(join(b,"state"),"target");git(b,"commit","-am","target");const target=git(b,"rev-parse","HEAD"),stale=git(b,"rev-parse","origin/nightly");
  git(b,"tag","-a","preserved",stale,"-m","preserved");writeFileSync(join(a,"state"),"racer");git(a,"commit","-am","racer");git(a,"push","origin","HEAD:nightly");
  assert.throws(()=>git(b,"push","--atomic",`--force-with-lease=refs/heads/nightly:${stale}`,"origin","refs/tags/preserved:refs/tags/preserved",`${target}:refs/heads/nightly`));
  assert.equal(git(b,"ls-remote","--tags","origin"),"");
  git(b,"tag","-d","preserved");git(b,"fetch","origin");const displaced=git(b,"rev-parse","origin/nightly");git(b,"tag","-a","preserved",displaced,"-m","preserved");
  git(b,"push","--atomic",`--force-with-lease=refs/heads/nightly:${displaced}`,"origin","refs/tags/preserved:refs/tags/preserved",`${target}:refs/heads/nightly`);
  // Inject interruption after the indivisible tag+CAS and before receipt. Retry
  // observes both durable refs and only has to converge the trusted receipt.
  assert.equal(git(b,"ls-remote","origin","refs/heads/nightly").split("\t")[0],target);
  assert.equal(git(b,"ls-remote","origin","refs/tags/preserved^{}").split("\t")[0],displaced);
  assert.throws(()=>readFileSync(receipt));writeFileSync(receipt,`${target}\n`);writeFileSync(receipt,`${target}\n`);
  assert.equal(readFileSync(receipt,"utf8"),`${target}\n`);assert.equal(git(b,"ls-remote","--tags","origin").split("\n").filter(line=>line.endsWith("refs/tags/preserved")).length,1);
  const flow=readFileSync(join(root,".github/workflows/nightly-compose.yml"),"utf8");assert.match(flow,/git push --atomic --force-with-lease/);
 });
 test("preview manifest detects artifact substitution and expiry",()=>{const dir=mkdtempSync(join(tmpdir(),"preview-"));for(const name of ["preview.tgz","sbom.json","provenance.json"])writeFileSync(join(dir,name),name);const bound=name=>({name,digest:createHash("sha256").update(name).digest("hex"),bytes:Buffer.byteLength(name)});const value={schemaVersion:1,repository:"kvnloo/Hermes3D",runId:1,runAttempt:1,commitSha:sha,treeSha:sha,artifact:bound("preview.tgz"),sbom:bound("sbom.json"),provenance:bound("provenance.json"),createdAt:"2026-01-01T00:00:00Z",expiresAt:future};const path=fixture(value).path;assert.match(run(["validate-preview",path,dir]),/^[0-9a-f]{64}/);writeFileSync(join(dir,"preview.tgz"),"substitute");assert.notEqual(reject(["validate-preview",path,dir]).status,0);value.expiresAt="2000-01-01T00:00:00Z";assert.notEqual(reject(["validate-preview",fixture(value).path],{NOW:"2026-01-01T00:00:00Z"}).status,0);});
 test("workflows enforce ownership, collision, CAS, cache distrust, and true upstream",()=>{const nightlyFlow=readFileSync(join(root,".github/workflows/nightly-compose.yml"),"utf8"),feature=readFileSync(join(root,".github/workflows/feature-pr.yml"),"utf8"),upstream=readFileSync(join(root,".github/workflows/upstream-candidate.yml"),"utf8");assert.match(nightlyFlow,/gitops-policy\.mjs ownership/);assert.match(nightlyFlow,/force-with-lease/);assert.match(nightlyFlow,/sha256sum -c nightly-bundle/);assert.match(feature,/npm ci --ignore-scripts/);assert.match(feature,/cmp preview-a/);assert.match(upstream,/remote add true-upstream/);assert.match(upstream,/generic-performance-only/);});
