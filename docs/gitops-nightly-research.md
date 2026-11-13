# Hermes3D nightly GitOps research and design

Status: research/design only; no branches, workflows, rulesets, environments, services, or remote state were changed.

Observed: 2026-08-20 (CDT). Target: public fork `kvnloo/Hermes3D`; parent/upstream `iamlukethedev/Hermes3D`.

## Executive decision

Use strategy **B with immutable receipts from C**:

1. `dev` is the only base for product feature work.
2. A versioned, reviewed opt-in manifest pins eligible `feature/hermes3d/<slug>` PR head SHAs.
3. An integrator deterministically creates a new candidate from the current `dev` SHA plus those pinned SHAs, in manifest order, without rewriting published history.
4. The moving `nightly` branch advances only by fast-forward to the verified candidate. Every successful composition also gets an immutable annotated tag `nightly-YYYYMMDD-HHMM-<manifestDigest12>` and a signed integration receipt/artifact manifest. Tags are preferred over daily branches to avoid branch explosion.
5. Removing or rejecting a feature means editing the desired-state manifest and rebuilding from `dev`; it does not require reverting an unknown cumulative merge or force-pushing `nightly`.
6. `nightly` is disposable combined-preview state, never an authority source. Promotion is a separate, Captain-approved PR into `dev`, pinned to an exact promotion manifest.
7. One approved feature can merge through its own PR to `dev`; other entries remain nightly-only. An all-feature promotion PR replays only the exact approved set against current `dev` and must pass CI again.
8. `dev -> main/release/live` is a later G3/G4 flow. Nothing auto-merges to `dev`, `main`, release, or live.
9. Generic performance work uses `upstream-candidate/perf-<slug>` and a separate Draft PR to `iamlukethedev/Hermes3D`, after a fail-closed public/product-exclusion scan. Product work never enters that lane.

This is GitOps integrated with Keel, not GitHub Actions replaced by Keel:

`feature PR/manifest -> GitHub Actions CI + artifact/attestation -> Kanban review -> Keel policy/provenance/Captain gate -> bounded capability -> integrator/deployer -> signed receipt -> Keel verification -> Kanban transition`

Nightly composition is non-production automation. `nightly -> dev` requires a Captain-bound G1/G2 capability; `dev -> main/live` requires distinct G3/G4 capabilities. Mesh may transport approved jobs/receipts to trusted machines. Keel must not execute arbitrary workflow code, store GitHub secrets, or substitute for GitHub rulesets. Current Keel/Mesh are not production-authorized, so initial rollout uses GitHub rules plus explicit human approval and records future integration points only.

## 1. Current-state inventory

### Repository and hosting

| Item | Observed truth |
|---|---|
| Fork | `https://github.com/kvnloo/Hermes3D`, public, GitHub reports `isFork=true` |
| True parent | `https://github.com/iamlukethedev/Hermes3D` |
| Default branch | `main`; `origin/HEAD -> origin/main` |
| Remote | only `origin`, fetch/push to Kevin's fork; no local `upstream` remote |
| Remote branches | `main`, one legacy Cursor branch, and one generic performance branch at observation time |
| Tags | `v1.0.0`, plus a local rollback tag not observed as remote |
| Rulesets/protection | no repository rulesets; `main` reported unprotected |
| Environments/Pages | no environments; no Pages site configured |
| Merge settings | merge commit, squash, and rebase allowed; auto-merge disabled; merged branches not auto-deleted |
| Actions policy | Actions enabled; all actions allowed; SHA pinning disabled; default token permission read; Actions cannot approve PR reviews |
| Security | secret scanning and push protection enabled; Dependabot security updates disabled |
| Existing workflow | `.github/workflows/docker-publish.yml`: publishes GHCR on `main`, `v*`, and manual dispatch; explicit `contents:read`, `packages:write`; third-party actions use moving major tags, not immutable SHAs |
| Existing CODEOWNERS | global owner is upstream identity `@iamlukethedev`, unsuitable as sole owner of fork policy |
| Repository secrets/variables | none by name at observation time |
| Auth | `gh` authenticated as `kvnloo`; scopes were inspected without exposing the credential |

The research worktree was clean at `558803c`. Many independent local worktrees/preview branches exist, which validates the need for collision ownership and a maximum active-lane budget. This report does not encode their private filesystem locations or coordination IDs.

### Application stack

- Private npm package, npm lockfile present; use `npm ci`, never `npm install`, in CI.
- Next.js 16.1.7 custom Node server; React 19.2.3; Three.js 0.185.1, React Three Fiber/Drei/postprocessing; Phaser 3.90; TypeScript 5; Tailwind 4.
- Vitest 4/JSDOM unit tests and Playwright 1.58 E2E. Playwright starts the custom development server with a controlled empty gateway fixture.
- Build is `next build`; checks are ESLint, `tsc --noEmit`, Vitest, Playwright, and dev-server smoke.
- Existing Docker workflow builds amd64/arm64 images for GHCR, but only main/tags should publish. Preview CI should build a non-pushed OCI archive or Next artifact.
- Current checkout had no installed dependencies. Package versions above come from the lock/manifest, not ambient `node_modules`.
- Known baseline defects from repository instructions: one lint error, stale test type errors, and several test failures. Rollout must first seal a baseline or repair them; required checks cannot be defined as “green except whatever failed.” New-change gating may temporarily compare against a pinned baseline, with an expiry date.

### Local control plane and preview capability

- Hermes Agent v0.20.4; profiles `default`, `canary-worker`, `reviewer`, `starwars`, plus `chiefstaff`; requested profiles use exact `gpt-5.6-sol`. Relevant installed skill families include GitHub, DevOps, MLOps, software-development, research, visual-design, and Hermes orchestration. Default and starwars have the cluster plugin. Version/profile/model/tool/skill details belong in private receipts, not public PR logs.
- Kanban provides durable parent dependencies, isolated worktree workspaces, assignee-specific execution, review/rework transitions, and structured completion metadata. Cards should be the work envelope, not PR prose.
- Keel current truth is fail-closed Level 0 only; its LF006 supervisor was documented unhealthy and higher levels unproven. It cannot authorize production promotion today.
- Hermes Mesh/Keel is a private pre-activation signed transport package. It explicitly does not activate production, schedule arbitrary work, run arbitrary shell, or change Kanban status. Taildrop imports are quarantined/manual.
- Pipeline Studio is a local read-only Kanban projection service, not acceptance authority. Boplog is a public projection and therefore must consume only sanitized public receipts.
- Trusted preview machine has an RTX 3080 Ti (12 GiB), Wayland, OBS capability, and active Tailscale. These facts establish a possible GPU lane, not an active autonomous deployment service.
- Hard public-fork rule: workflows, manifests, artifacts, logs, annotations, cache keys, and public receipts must not expose local paths, Tailnet URLs, device IDs, private project names, prompts, Kanban/task IDs, Keel/Mesh internals, credentials, or exact private agent evidence.

## 2. Nightly strategy decision matrix

Scores: 5 best, 1 worst.

| Strategy | Remove rejected feature | No-force/audit | Conflict/bisect | Branch/route ops | Exact promotion | Total |
|---|---:|---:|---:|---:|---:|---:|
| A persistent cumulative merges | 1 (revert topology becomes fragile) | 3 | 3 | 5 | 2 | 14 |
| B rebuild from `dev` + pinned opt-in manifest | 5 | 5 when candidate is new commit and alias fast-forwards | 5 with ordered merge receipts | 4 | 5 | **24** |
| C daily immutable branches + moving alias | 5 | 5 | 5 | 1 (branch explosion/cleanup) | 5 | 21 |
| D GitHub merge queue/integration PR bot | 3 | 4 | 4 | 3 | 3 | 17 |

Rejected:

- A makes subtraction the hard operation; reverting merge commits can retain dependencies and creates hard-to-review accumulated history.
- C is useful as evidence but branches are the wrong immutable primitive. Keep immutable tags, manifests, attestations, and artifacts instead.
- D's merge queue is designed to merge approved PRs into a protected target, not maintain an easily subtractive preview composition. It may later serialize `dev` promotion after rulesets are mature, but must not be the nightly selector and must never imply auto-promotion.

### Deterministic composition algorithm

1. Lock concurrency group `nightly-integrate` with `cancel-in-progress:false`; only one integrator may mutate the alias.
2. Fetch only the manifest-approved refs and verify every named repository, PR, branch namespace, and exact head SHA via API.
3. Require `baseSha == current dev` or stop as stale; never silently rebase the desired state.
4. Sort by explicit integer `order`, then slug. Reject duplicate order/slug/SHA.
5. Create a fresh local candidate at `baseSha`; merge each pinned head with `--no-ff --no-edit`. Record each resulting tree SHA. Conflict means fail closed, publish diagnostics, and do not move `nightly`.
6. Run integration CI and build once more from the resulting commit.
7. Create the immutable integration receipt and artifact manifest; attest artifact subjects.
8. Under a second remote compare-and-swap check, advance `nightly` only if its observed previous SHA is unchanged and the candidate descends from it only when possible. Because recomposition from `dev` may not descend from the old alias, do **not** force-update a protected moving branch. Recommended implementation: open/update a bot-authored PR `nightly-candidate/<digest> -> nightly` and allow an explicitly scoped integrator GitHub App to replace the alias through a ruleset bypass only after checks, while preserving the old tip by immutable tag. If Captain forbids any bypass/alias replacement, use `nightly/current.json` as the moving pointer on an append-only `nightly-ledger` branch and deploy by digest; do not fake fast-forwardability.
9. Never push a partially composed candidate.

Important semantic choice: a subtractive deterministic nightly cannot always be both a Git branch rebuilt from `dev` and strictly fast-forward-only. The safe compromise is no human force-push, immutable old-tip tags/receipts, and a single narrowly scoped integration App allowed to replace only `nightly`; or use a manifest pointer instead. Captain decision C1 selects these.

## 3. Branch graph and state machine

```text
true upstream main (iamlukethedev/Hermes3D)
       ^ Draft PR only: upstream-candidate/perf-*
       | product/public-exclusion = PASS

fork main  <------------------------------ G3/G4 release PR only
    ^
    |
   dev  <---- G1/G2 individual feature PR (Captain)
    ^   <---- G1/G2 promotion/<digest> PR (Captain, approved set only)
    |
    +---- feature/hermes3d/a  (Draft PR -> dev; independent preview)
    +---- feature/hermes3d/b  (Draft PR -> dev; independent preview)
    |
    +---- nightly desired manifest pins a@SHA,b@SHA
              -> deterministic candidate -> nightly combined preview
              -> immutable tag + receipt/artifact manifest
```

State machine:

`draft -> ci_candidate -> reviewable -> nightly_eligible -> composed -> preview_verified -> {nightly_only | individually_approved | set_approved} -> promotion_pr -> captain_approved -> merged_dev -> {held | release_candidate -> G3/G4 -> main/live}`

Any SHA change returns the feature to `ci_candidate` and invalidates approvals, previews, receipts, and capabilities. `rejected`, `stale`, `conflict`, `privacy_blocked`, and `artifact_mismatch` are terminal for that exact revision, not for later revisions.

## 4. Eligibility contract

A feature is eligible only when all are true:

- branch exactly matches `feature/hermes3d/<lower-kebab-slug>`;
- open Draft PR targets `dev` in Kevin's fork; PR head belongs to that fork, not an untrusted fork;
- opt-in is an approved manifest entry (labels may request inclusion but cannot alone grant it);
- manifest pins exact PR number and 40-hex head SHA; live API values match;
- work card declared allowed paths, ownership, acceptance checks, and gate; private card identity is represented publicly only by a random receipt ID;
- clean worktree and commit exist in private implementation evidence;
- required check suite is successful for the exact SHA;
- independent reviewer receipt exists and reviewer identity differs from builder identity;
- changed files are within declared ownership globs and do not collide with another active entry unless an explicit integration owner resolves it;
- public/product-exclusion, privacy, secret, provenance, license/IP, asset, and log-redaction scans pass;
- no workflow/policy file changes unless separately approved by fork CODEOWNER;
- no unresolved review request, conflict, stale base, or expired receipt.

A branch's existence never includes it.

## 5. Manifest schemas

Store public-safe desired state at `.gitops/nightly-manifest.json`. Validate with JSON Schema and a semantic verifier; canonicalize with RFC 8785/JCS before hashing.

```json
{
  "schemaVersion": 1,
  "base": {"branch": "dev", "sha": "40-hex"},
  "generation": 42,
  "features": [
    {
      "slug": "camera-orbit",
      "repository": "kvnloo/Hermes3D",
      "branch": "feature/hermes3d/camera-orbit",
      "pullRequest": 123,
      "headSha": "40-hex",
      "order": 10,
      "ownership": ["src/features/orbit/**"],
      "publicReceipt": "prv_opaque_random",
      "expiresAt": "2026-08-28T00:00:00Z"
    }
  ]
}
```

Reject unknown keys; cap 3 features; require unique slugs/PRs/SHAs/orders; forbid URLs, filesystem paths, task IDs, prompts, free-form logs, device data, and private project vocabulary. `ownership` supports repository-relative positive globs only—no `..`, absolute paths, or negation.

Promotion manifest is generated, never inferred from the moving branch:

```json
{
  "schemaVersion": 1,
  "kind": "individual-or-set",
  "sourceManifestSha256": "64-hex",
  "devBaseSha": "40-hex",
  "features": [{"slug":"camera-orbit","pullRequest":123,"headSha":"40-hex"}],
  "candidateTreeSha": "40-hex",
  "ciRun": {"repository":"kvnloo/Hermes3D","runId":"decimal","attempt":1},
  "artifactSubjects": [{"name":"hermes3d-preview.tar.zst","sha256":"64-hex","bytes":123}],
  "publicReceipts": ["prv_opaque_random"],
  "captainGate": "G1_G2_REQUIRED"
}
```

Captain approval binds exact `devBaseSha`, source manifest digest, feature SHAs, candidate tree, artifact subjects, and promotion PR head. It expires on any change. Never put operator identity, private gate internals, Kanban ID, local paths, or Tailnet routes in this public file; private evidence binds the sanitized manifest digest to the operator and Keel capability.

## 6. Preview/deploy contract

GitHub-hosted CI produces a tar archive and `preview-manifest.json`:

```json
{
  "schemaVersion": 1,
  "previewId": "feature-camera-orbit-<sha12>",
  "channel": "feature",
  "source": {"repository":"kvnloo/Hermes3D","commit":"40-hex","tree":"40-hex"},
  "build": {"workflow":"preview-build","runId":"decimal","attempt":1},
  "artifacts": [{"name":"app.tar.zst","sha256":"64-hex","bytes":123}],
  "routeKey": "feature-camera-orbit",
  "createdAt": "RFC3339",
  "expiresAt": "RFC3339",
  "teardownAfter": "RFC3339"
}
```

Public-safe stable route keys are `feature-<slug>` and `nightly`; actual Tailnet hostnames/URLs remain in the local deployer's private mapping. Feature routes expire after 7 days of inactivity; nightly keeps current plus previous rollback artifact for 14 days. CI artifacts: test logs 14 days, screenshots/video 14 days, release/SBOM/attestation 90 days; tune after measured storage.

Trusted local consumer protocol:

1. Event or explicit authorized request identifies repository/run/attempt/artifact name and expected digest; do not poll ambient latest.
2. Download over GitHub API using a short-lived read-only credential; verify GitHub artifact attestation where supported, archive SHA-256, manifest schema, source commit, expiry, and public-exclusion scan.
3. Extract in a new unprivileged staging directory with traversal/symlink/size/file-count defenses. Never execute scripts from the artifact.
4. Start a sandboxed preview process with no production secrets, no write access to source, no Docker socket, and a loopback-only listener. Route through an independently configured Tailnet reverse proxy/Serve mapping.
5. Full-body readiness; desktop 1440x900 and mobile 390x844 smoke; software WebGL always, real-GPU lane when scheduled; capture sanitized screenshots/video only.
6. Atomically switch stable route, retain prior verified revision, append signed private receipt, and teardown expired revision. On failure retain current route and quarantine candidate.

A GitHub-hosted runner gets no Tailnet credential and no direct production/local runtime access. If Tailscale's GitHub Action is later used, restrict it to a dedicated preview tag with ACLs and ephemeral/OIDC auth; it still must not reach production or local control-plane endpoints. Preferred design is outbound pull by the trusted deployer.

## 7. Workflow architecture and reusable interfaces

All third-party actions must be pinned to full commit SHAs and updated by Dependabot/Renovate. Every workflow defines top-level or job-level `permissions`; default is `{contents: read}`. Shell uses `set -euo pipefail`; interpolate untrusted values through environment variables, not source text.

### `ci-core.yml` (`workflow_call`)

Inputs: `ref` (required immutable SHA), `mode` enum `feature|integration|promotion|upstream`, `run_e2e` boolean, `baseline_sha` optional. Outputs: `source_sha`, `tree_sha`, `artifact_name`, `artifact_sha256`, `sbom_sha256`, `public_scan_receipt`.

Jobs:

1. **policy**: validate ref/branch/base; changed-file ownership and collision; workflow-policy diff; manifest/schema; public/product-exclusion; source/log redaction; secret scan; license/IP allowlist; asset extension/MIME/hash/size/polycount/texture budgets; GLTF parser safety.
2. **install**: Node 20 LTS and npm 10 as repository contract; `npm ci --ignore-scripts` first, allow lifecycle scripts only through audited allowlist if required; cache npm download cache keyed by OS + lockfile SHA, never `node_modules`; untrusted PRs cannot save caches used by protected refs.
3. **static**: lint, typecheck, unit, schema tests; split required checks into stable names.
4. **build**: production Next build, dev-server smoke, deterministic second build comparing normalized outputs; identify legitimate nondeterminism explicitly instead of ignoring whole trees.
5. **e2e-software**: Playwright Chromium desktop/mobile, empty mock gateway, SwiftShader/WebGL smoke; no external gateway.
6. **security**: CodeQL, dependency review on PRs, `npm audit` policy, secret scan, SBOM (CycloneDX/SPDX), provenance/license report.
7. **performance**: bundle/asset bytes, initial load, route timing, DPR and frame-time scenario budgets. Block regressions against versioned baseline; raw FPS on shared runners is advisory.
8. **package**: archive only expected runtime files; manifest; hashes; attest subjects using `id-token:write` and `attestations:write` only in this job on trusted same-repository refs. Untrusted fork PRs get no attestation-writing token.

### `feature-pr.yml`

Trigger `pull_request` to `dev` for opened/synchronize/reopened/ready_for_review. Safe read-only checkout of PR merge/head; no secrets, no write token, no cache save to protected namespace, no deployment. Concurrency `feature-${PR_NUMBER}` with cancellation. Produce immutable per-SHA artifacts; update PR status only from a separate trusted workflow that never checks out or executes PR code.

### `nightly-plan.yml`

Trigger manifest PR/push, `workflow_dispatch`, and scheduled debounce (for example 02:00 local-equivalent UTC). Read-only planning validates entries and emits a canonical plan. A trusted `workflow_run` consumer may compose only after verifying originating workflow/repository/conclusion/head SHA and loading code from the trusted default branch—not from artifacts containing executable scripts. Concurrency has one integrator and `cancel-in-progress:false`.

### `nightly-compose.yml`

Only trusted default-branch code; minimal `contents:write` for the final alias/tag operation, or preferably GitHub App installation token restricted to contents. Compose in temp refs, rerun `ci-core(mode=integration)`, produce receipt, then compare-and-swap. It cannot write `dev` or `main`; rulesets enforce that independently.

### `promotion.yml`

PR-only validation for `promotion/* -> dev`; `contents:read`, attest verification, exact replay against current `dev`, full CI. Environment `dev-promotion` has required Captain reviewer and prevents self-review where available. Workflow never merges. Captain merges through GitHub UI after G1/G2 private capability verification.

### `upstream-candidate.yml`

Trigger PR/dispatch for `upstream-candidate/perf-*`. Require diff against true upstream default SHA, generic-only allowlist, product/public-exclusion and provenance/license scans, complete CI, and sanitized Draft PR body. Token may open/update Draft PR only; cannot mark ready or merge. Never run product workflows from the true upstream PR context with local secrets.

### `preview-cleanup.yml`

Scheduled/manual, read-only inventory then scoped delete of expired artifacts/routes. Local route teardown is a separate trusted receipt-bound consumer. Cleanup cannot delete current or rollback-pinned digest.

## 8. Required CI matrix and exact stable checks

Rulesets refer to these stable names:

- `policy / manifest-schema`
- `policy / branch-and-base`
- `policy / changed-file-ownership`
- `policy / product-public-exclusion`
- `policy / privacy-log-redaction`
- `policy / secrets-license-ip`
- `policy / assets-and-gltf`
- `quality / lint`
- `quality / typecheck`
- `quality / unit`
- `build / next-production`
- `build / deterministic-artifact`
- `e2e / chromium-desktop-mobile`
- `webgl / software-smoke`
- `performance / budgets`
- `security / codeql-dependency-sbom`
- `provenance / artifact-subjects`
- `integration / conflict-and-order` (nightly/promotion only)
- `review / independent-receipt`

Optional/non-required trusted lane until stable: `webgl / trusted-gpu`, native OBS video, and long frame pacing. Promotion requires its latest successful receipt for designated visual/performance changes, but GitHub-hosted CI should not wait indefinitely on the local machine.

Privacy scanner inputs include source diff, manifests, workflow YAML, generated reports, artifact file list/content (bounded text), Playwright traces, screenshots OCR where feasible, annotations, step summaries, cache keys, and logs before upload. Deny patterns/classes: absolute home/workspace paths, RFC1918/Tailnet IPs and hostnames, device IDs, private project names registry, prompts/transcripts, Kanban IDs (`t_[0-9a-f]+`), Keel/Mesh internal names/records, credential formats, `.env`, auth/session databases. Findings are redacted in annotations—never echo the matching secret/value.

## 9. Rulesets, CODEOWNERS, environments

### Fork CODEOWNERS

Replace sole upstream ownership with Kevin/fork policy ownership, while keeping upstream attribution outside authority:

```text
* @kvnloo
/.github/ @kvnloo
/.gitops/ @kvnloo
/package.json @kvnloo
/package-lock.json @kvnloo
/server/ @kvnloo
/next.config.ts @kvnloo
/public/**/*.glb @kvnloo
/public/**/*.gltf @kvnloo
/public/**/*.{png,jpg,jpeg,webp,mp4,webm} @kvnloo
```

GitHub CODEOWNERS does not support brace expansion; implementation must expand media patterns into individual lines. This snippet is conceptual. Add a team later only if it exists in the fork organization and has explicit responsibility.

### `main` ruleset

- target `main`; active; no deletion; no force push; linear history recommended (squash only); signed commits if operationally feasible;
- PR required, 1 approval from `@kvnloo`, Code Owner review, dismiss stale approvals, require approval of most recent reviewable push, resolve conversations;
- all stable quality/security/provenance checks plus `promotion / G3-G4-receipt` required;
- require deployments to protected `release`/`production` environments only in later rollout;
- block branch creation bypass except repository admin emergency; bypass actors limited and audited.

### `dev` ruleset

- no deletion/force push; PR required; Code Owner; stale approval dismissal; last-push approval; conversations resolved;
- all stable checks; promotion-specific exact-manifest check;
- Captain is required human approval. Agents/GitHub Actions cannot approve, mark ready, or merge.
- allow heads only from `feature/hermes3d/*` and `promotion/*` by semantic required check (rulesets cannot fully express source namespace).

### `nightly`

- no deletion by humans; restrict updates to integrator App; required integration checks; no direct human pushes; old tips retained by immutable tags/receipts.
- integrator App bypass is scoped to this branch only. If C1 chooses pointer model, make `nightly-ledger` append-only and protect it normally.

### Feature/upstream namespaces

Ruleset blocks force-push/deletion while PR open and requires feature CI where GitHub plan supports it. Local worktree cleanliness remains private evidence, because GitHub cannot prove it.

### Environments

- `feature-preview-artifact`: no secrets; no reviewer; artifacts only.
- `nightly-preview-artifact`: no secrets; trusted branch restriction; no direct local access.
- `dev-promotion`: Captain required reviewer; protected branches/tags only; no deployment secret initially.
- `release`: G3 reviewer and later OIDC-only cloud identity.
- `production`: G4 reviewer, wait timer optional, branch/tag restriction, no long-lived cloud key.

Environment approval is not merge approval; require both. Avoid allowing an initiator to self-approve where GitHub settings support it.

## 10. Agent/LLM GitOps model

Private card envelope:

- role, exact model/provider/profile and revision;
- skill/tool/plugin versions;
- base SHA, branch/worktree, allowed paths, forbidden authority;
- input manifest hash, expected artifacts, acceptance checks, rejection class, WIP budget;
- public receipt ID generated independently from Kanban ID.

Agents may implement, rework, test, compose a candidate, and provide review evidence. Independent reviewer profile/run must differ from builder and cannot self-approve. Builder and reviewer cannot set Ready, satisfy Captain gates, merge, release, publish, alter rulesets, create environment approvals, or issue Keel authority.

LLM origin is recorded through private signed receipts, not comments in every source file. Public PR provenance is sanitized: tool class, automated-assistance boolean, source commit, checks, artifact digest, and opaque receipt ID. Never commit prompts, transcripts, memory, local paths, secrets, private model routing, Kanban IDs, or private evidence.

Prompt-injection controls:

- Issue/PR text, filenames, code comments, assets, GLTF metadata, test snapshots, and dependency output are untrusted data, never instructions.
- Agent gets a machine-generated task envelope, bounded file allowlist, read-only GitHub token where possible, no production secrets, and no shell interpolation from untrusted text.
- Tool permissions are capability-based; mutation is a separate reviewed phase.
- Review checks compare actual diff/artifact, not agent claims. A builder self-report cannot create `acceptanceClaim=true`.
- Two same-class failures require a changed approach; three escalate to Captain. Max three feature lanes plus one integrator.

## 11. Threat model and controls

| Threat | Required control |
|---|---|
| Compromised feature/PR workflow | `pull_request` read-only, no secrets/write token, trusted workflow definitions for privileged follow-up, immutable action pins |
| `pull_request_target` | Do not checkout/execute PR code. Prefer `workflow_run`; if metadata comment workflow exists, treat all PR fields as data and grant only `pull-requests:write` |
| Malicious dependency | lockfile, `npm ci`, dependency review, lifecycle-script policy, SBOM, provenance, Renovate/Dependabot grouped Draft updates |
| Malicious asset/GLTF | MIME/magic validation, file/texture/poly/animation budgets, parser fuzz/sandbox, no external URI, no executable extensions |
| Self-hosted persistence | no untrusted PR code on trusted host; ephemeral staging/user, no Docker socket, egress/FS controls, teardown/quarantine; local deployer consumes inert verified artifact only |
| Cache poisoning | cache key includes lock SHA/trust domain; protected runs do not restore untrusted mutable caches; no `node_modules` cache; read-only restore for PRs |
| Secret exfiltration | no secrets on PR; OIDC short-lived credentials; environment gates; redact logs; prohibit debug dumps and fork secrets |
| Tailnet exposure | outbound-pull design; loopback listener; private route map; ACL tag limited to preview; no URLs/IDs in public evidence |
| Artifact substitution | bind repo/run/attempt/source SHA/tree SHA/name/digest/bytes; verify attestation and hash before extraction/switch; never use “latest” |
| Workflow races | one non-cancelling integrator; compare-and-swap refs; per-PR cancelling CI; generation/base checks; idempotent receipt key |
| Branch bypass | active rulesets, narrow App bypass only for nightly, audit log, emergency procedure, no admin routine merge |
| LLM prompt injection | typed envelope, untrusted-content boundary, bounded paths/tools, independent verifier, no merge authority |
| Public metadata leakage | product/public-exclusion plus log/artifact redaction scanner; sanitized opaque receipts; deny private identifiers everywhere public |
| Fork PR attack | never expose secrets or privileged cache; do not run fork code on local GPU/self-hosted runner; require maintainer approval for first-time contributors if enabled |

## 12. Cost and operability

- Public repositories generally receive GitHub-hosted standard runner usage under GitHub's current plan terms, but budgets/limits change; treat the official billing page as authority and set repository spending alerts. The expensive costs here are artifact storage, multi-arch Docker builds, Playwright video, and local GPU/energy—not just minutes.
- Fast PR lane: policy/static/unit/build on change; cancel superseded SHA. E2E runs after fast lane or for labeled paths. Multi-arch publish remains main/tag only.
- Nightly: on manifest change with a 10-minute debounce plus daily scheduled reconciliation and manual dispatch. Schedule is reconciliation, not eligibility.
- At most 3 active feature entries and one non-cancellable integrator. GPU lane serializes with lock `gpu-preview` and latest approved digest wins only before execution begins; never interrupt an evidence capture midway.
- Retention defaults: logs/traces/video 14d, feature artifact 7d inactive, nightly current+previous 14d, promotion/release/SBOM/attestation 90d or release lifetime. Measure before extending.
- Failure notification: GitHub Check/PR summary contains sanitized class and remediation, not raw private data. After 2 same-class failures require approach change; after 3 or 24h blocked notify Captain/Kanban. No public issue auto-created from raw logs.
- Dependabot or Renovate: weekly grouped npm and GitHub Actions updates as Draft PRs; full immutable action SHA updates; no auto-merge.
- Rollback: preview route atomically returns to previous verified digest; nightly desired manifest removes entry and recomposes; `dev` rollback is a new reviewed revert PR; main/live rollback uses a separately approved release artifact/receipt. Never rewrite protected history.

## 13. Staged rollout and migration

### Stage 0 — make truth explicit (no mutation)

- Captain answers C1–C6 below.
- Repair or seal known lint/type/test baseline with an expiry.
- Inventory private-product deny vocabulary in a private scanner config; public repo stores only non-sensitive generic patterns and a digest of private policy.
- Record current branch tips and Docker publish behavior for rollback.

### Stage 1 — CI only

- Add schemas/verifiers/tests, `ci-core`, feature PR CI, immutable action pins, CODEOWNERS update, Dependabot/Renovate config.
- No branch creation or deployment. Test synthetic manifests and hostile PR fixtures.
- Independent review confirms permissions and public leakage scan.

### Stage 2 — protected branches

- Create `dev` from Captain-selected base; enable rulesets and required checks only after checks have emitted stable names.
- Create nightly pointer/branch per C1. Dry-run composer without remote mutation, then compare result against independent local reproduction.
- Ruleset rollback is export prior JSON, disable new ruleset only under Captain emergency approval; never disable protection merely to merge.

### Stage 3 — artifact previews

- Enable per-feature and nightly GitHub artifact builds. Verify manifests, digests, attestations, expiry, and cleanup.
- Install no local service yet. Manual trusted download/reproduction first.

### Stage 4 — private trusted consumer

- Package and independently review sandboxed outbound-pull deployer. Keel/Mesh remains frozen until separately certified.
- Captain activates one nightly route only; verify listener ownership, full response, desktop/mobile/WebGL, rollback, teardown, and no public route leakage.

### Stage 5 — promotion

- Exercise individual feature and all-approved-set promotion with fixture changes. Captain approves exact manifest; agents cannot merge.
- Main/release/live remain disabled until a separate G3/G4 card.

Rollback at every stage removes only the newly introduced trigger/ruleset/service while preserving immutable receipts and artifacts required for audit.

## 14. Implementation card specification

The pre-created implementation card should consume this report through the private parent handoff. Its coordination ID must never be copied into public repository files.

Acceptance additions/clarifications for that card:

1. Implement Strategy B + immutable tags/receipts, subject to Captain C1. Do not implement cumulative merge Strategy A.
2. Every public file/log/artifact passes product/public-exclusion and redaction scans covering local paths, Tailnet details, device IDs, private projects, prompts, Kanban IDs, Keel/Mesh internals, and credentials.
3. Add hostile fixtures proving the scanners fail closed without printing matched sensitive values.
4. Pin all actions by full SHA; explicit least privilege; no unsafe `pull_request_target`; no untrusted self-hosted/GPU execution.
5. Implement strict schemas and semantic verifiers for nightly, promotion, and preview manifests; exact SHA/PR/API matching; max 3 features; ownership/collision/conflict checks.
6. Reproduce deterministic composition twice from clean clones and compare tree/artifact hashes after documented normalization.
7. Provide dry-run fixtures for removal, stale SHA, conflict, partial approval, all-set promotion, concurrent generation, cache trust separation, artifact substitution, and upstream product exclusion.
8. Create Draft PR(s) only on Kevin's fork where needed. Never mark Ready, merge, deploy, restart services, or contact true upstream with product code.
9. Export proposed ruleset/environment JSON and a Captain runbook; do not assume GitHub API settings were enabled.
10. Handoff exact remote URLs/branch tips/PR URLs/check names/digests privately to the pre-created independent reviewer card.

## 15. Captain decisions (minimal)

- **C1 Nightly pointer:** approve narrow integrator-App replacement of protected `nightly` with immutable old-tip tags (**recommended**), or choose append-only `nightly-ledger` + `current.json` pointer for strict no-force semantics.
- **C2 Baseline:** repair existing lint/type/test defects before enabling required checks (**recommended**) or authorize a time-boxed pinned baseline comparison (maximum 14 days).
- **C3 Merge history:** squash-only for `dev/main` (**recommended**) versus merge commits. Nightly composition itself uses ordered no-ff merge commits for traceability.
- **C4 Preview activation:** artifacts-only first (**recommended**); local Tailnet/GPU consumer requires a later explicit activation gate.
- **C5 Attestations:** enable GitHub artifact attestations for same-repo trusted builds (**recommended**); do not attest untrusted fork PR artifacts.
- **C6 Dependency bot:** weekly grouped Dependabot Draft PRs (**recommended**) or Renovate. Neither auto-merges.

All other choices are safe defaults in this report.

## Sources

Repository/local primary evidence (accessed 2026-08-20): Git remotes/worktrees/tags; GitHub REST/GraphQL metadata for `kvnloo/Hermes3D`; `package.json`, lockfile, Next/Vitest/Playwright configs, `.github/workflows/docker-publish.yml`, `.github/CODEOWNERS`, repository instructions; local Keel critical-path report; Hermes Mesh/Keel README; Pipeline Studio service definition; Boplog README. No Obsidian content, credentials, secret values, or private configuration contents were read into this report.

Official/maintained references (all accessed 2026-08-20):

- GitHub, automatic `GITHUB_TOKEN` and least privilege: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication
- GitHub, reusable workflows: https://docs.github.com/en/actions/sharing-automations/reusing-workflows
- GitHub, workflow concurrency: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- GitHub, rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub, merge queue: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- GitHub, Actions security hardening and self-hosted runner cautions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- GitHub, artifact attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations
- GitHub, OpenID Connect: https://docs.github.com/en/actions/concepts/security/openid-connect
- GitHub, events and `pull_request_target`: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target
- GitHub, dependency caching: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- GitHub, workflow artifacts: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- GitHub, downloading artifacts: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts
- GitHub, self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners
- GitHub, Dependabot configuration: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- GitHub, CodeQL: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- GitHub, dependency graph/SBOM context: https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph
- Tailscale maintained GitHub Action and OIDC/tag guidance: https://github.com/tailscale/github-action
- SLSA provenance model: https://slsa.dev/spec/v1.1/provenance
- Sigstore/Cosign verification model: https://docs.sigstore.dev/cosign/verifying/verify/
- GitHub Actions billing/usage authority: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions
