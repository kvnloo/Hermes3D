import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = new URL("../scripts/gitops-policy.mjs", import.meta.url).pathname;
const root = new URL("..", import.meta.url).pathname;
const run = (...args) => execFileSync(process.execPath, [script, ...args], {cwd:root,encoding:"utf8"});

test("empty desired-state manifest validates deterministically", () => {
  assert.match(run("validate-nightly"), /^[0-9a-f]{64}\n$/);
});

test("unknown manifest fields fail closed", () => {
  const dir=mkdtempSync(join(tmpdir(),"gitops-")); const path=join(dir,"bad.json");
  const manifest=JSON.parse(execFileSync(process.execPath,["-e",`process.stdout.write(require('fs').readFileSync('.gitops/nightly-manifest.json'))`],{cwd:root,encoding:"utf8"})); manifest.extra=true; writeFileSync(path,JSON.stringify(manifest));
  const result=spawnSync(process.execPath,[script,"validate-nightly",path],{cwd:root,encoding:"utf8"}); assert.notEqual(result.status,0); assert.doesNotMatch(result.stderr,/558803c505091/);
});

test("scanner suppresses sensitive matched value", () => {
  const dir=mkdtempSync(join(tmpdir(),"gitops-")); const path=join(dir,"fixture.txt"); const sensitive=["github","pat","ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"].join("_"); writeFileSync(path,sensitive);
  const result=spawnSync(process.execPath,[script,"scan",path],{cwd:root,encoding:"utf8"}); assert.notEqual(result.status,0); assert.doesNotMatch(result.stderr,new RegExp(sensitive)); assert.match(result.stderr,/matched value suppressed/);
});

test("repository public-safety scan passes", () => assert.match(run("scan"),/passed/));
