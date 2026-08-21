# Nightly to dev operations

This repository uses `dev` as approved development truth and `nightly` only as disposable combined-preview state. Feature PRs target `dev` from `feature/hermes3d/<slug>`. No workflow merges into `dev`, `main`, a release branch, or a live environment.

## Enablement order

1. The Captain-selected defaults are alias replacement with `nightly/<UTC>-<digest>` receipts, immediate baseline repair plus a 14-day comparison report, squash-only protected merges, artifacts-only preview, trusted-build attestations, and grouped Dependabot with no automerge.
2. Import the disabled JSON templates in `.github/rulesets/`, add required checks after their first successful run, and independently inspect the resulting rules. Protect `dev` and `main` before enabling nightly mutation.
3. Create `dev` and `nightly` from the reviewed base. Require CODEOWNER review and one Captain approval on `dev`; never grant Actions bypass there.
4. Protect `nightly` against deletion and human updates. If the Captain approves the alias model, grant only the nightly composer the narrow ability to replace `nightly`; every old tip is tagged before compare-and-swap replacement.
5. Set repository variable `NIGHTLY_AUTOMATION_ENABLED=true` only after steps 1–4. Until then, manual dispatch is dry-run-only and creates a 90-day receipt artifact.
6. Create a `dev-promotion` environment with Captain as required reviewer if the plan supports it. Environment approval supplements, never replaces, PR approval.

## Eligibility and promotion

An entry in `.gitops/nightly-manifest.json` is authoritative; a label alone is not. It pins a same-repository Draft PR, exact SHA, order, ownership, opaque public receipt, and expiry. The PR must target `dev`, use `feature/hermes3d/*`, carry `nightly-eligible`, and have no failed check runs. Maximum active features is three.

The manifest's `base.sha` is the `dev` parent onto which the manifest change is applied. This avoids an impossible self-hash while binding each generation to its exact pre-change development baseline. A push composition starts from the resulting `dev` commit (including the reviewed manifest); manual reconciliation requires the manifest to pin current `dev` and therefore normally follows a no-op planning dispatch rather than mutating the file.

Individual promotion is the original feature PR after exact-revision Captain approval. Set promotion is a new Draft `promotion/<digest>` PR replayed onto current `dev` with `.gitops/promotion-manifest.json`. Captain approval is invalid after any head/base/manifest/artifact change. Agents and Actions never mark Ready, approve, or merge.

## Failure and rollback

Conflict, stale base, metadata mismatch, collision, scan finding, or failed CI stops before ref mutation. Findings report only class/path, never the matched value. Remove a rejected feature from the desired manifest, increment generation, pin current `dev`, and recompose. Preview rollback selects the prior verified artifact in the separately authorized private consumer. `dev` rollback is a reviewed revert PR; protected history is never rewritten.

The private preview consumer is not installed by these workflows. It may later download one exact run/attempt artifact outbound, verify digest/manifest/expiry, safely extract without executing artifact code, smoke-test on loopback, and atomically switch a private route. Public workflows contain no private network details or credentials.

## Required checks

Start with `policy / public-safety`, `quality / node-matrix`, `provenance / preview-artifact`, `integration / conflict-and-order`, `promotion / exact-manifest`, and `policy / upstream-exclusion`. Split quality checks only after baseline defects are repaired and stable names have emitted. The generic outbound lane is Draft-only `upstream-candidate/perf-*`; its exclusion workflow rejects product GitOps content.
