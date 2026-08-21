import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const sources = [
  ["camera-modes", "hotfix/t_37772021-camera-modes", "c96f2da3ff4e82952ba0a54c4baaf5a142bbfa43", "implemented", [], "/office"],
  ["company-directory-agents", "feature/t_d1b3961e-public-directory", "3aa99773171969357f26b5afd7aa6dfe4b193d9d", "candidate-unreviewed", ["camera-modes", "official-thinking-orbs"], "/office"],
  ["public-boplog-kanban", "feature/t_6eb40393-public-boplog", "eff0e1a5504801efab2bd6782066ced684a626a1", "candidate-unreviewed", ["company-directory-agents"], "/office"],
  ["official-thinking-orbs", "preview/official-thinking-orbs-t_27cc13cf", "1f68e1c6b4e9ae9660042d61c384080e70fe54a5", "candidate-unreviewed", [], "/office"],
  ["nightly-gitops", "origin/gitops/nightly-implementation", "a16a58bddc06013148b8ea720b58db1b24a84fa9", "candidate-unreviewed", [], "artifact-only"],
  ["adaptive-mobile-rendering", "origin/perf/adaptive-mobile-t_24f370d9", "9a4373458342666f6f5837a536ef8725a86f6391", "candidate-unreviewed", [], "/office"],
  ["stream-orbit", "preview/t_37b076b4-orbit", "5b9e4be02abb1478381ec81a8057535ff4b84277", "candidate-unreviewed", ["camera-modes", "adaptive-mobile-rendering"], "/office"],
  ["living-museum-shell", "repair/museum-shell-provenance", "44a8811e82cdf87e77d1c733ec9393de9493bdf6", "candidate-unreviewed", [], "/museum"],
  ["pokemon-cards", "wt/t_3ed518a3", "bc3b60c2c69864b1d170e4304fc173cfb514442e", "candidate-unreviewed", ["living-museum-shell"], "/museum?exhibit=pokemon-cards"],
  ["star-wars-game", "wt/t_21f9e55e", "b6af997044002d3614ca8df8b26c33ccfb23c5fc", "candidate-unreviewed", ["living-museum-shell"], "/museum?exhibit=star-wars-game"],
  ["call-of-duty", "wt/t_8ca73d2e", "fb78a9887f6739eeb29127bfa444a8de8ece1ed8", "candidate-unreviewed", ["living-museum-shell"], "/museum?exhibit=call-of-duty"],
  ["halo", "wt/t_e57e52d6", "12e3e921622acf5f4f2885030d76a31c8966a1ba", "candidate-unreviewed", ["living-museum-shell"], "/museum?exhibit=halo"],
  ["obsidian-disabled-placeholder", "wt/t_9de0deb4", "058c55f3db5d902680545d9787cae8f393015975", "candidate-unreviewed-disabled", ["living-museum-shell"], "/museum?exhibit=obsidian-vault"],
  ["pokemon-game", "wt/t_3bc090e3", "1e96e9b6de1a4d269f27c85d4b5443797a556e6f", "candidate-unreviewed", ["living-museum-shell"], "/museum?exhibit=pokemon-game"],
  ["youtube-chat-telegram-relay", "wt/t_407da0ef", "8f0e0f1588da62bd2c50f4078cc3cb0110094b14", "candidate-unreviewed-disabled-by-default", [], "artifact-only"]
];
const patchId = sha => {
  const patch = execFileSync("git", ["show", "--pretty=format:", "--patch", sha]);
  return execFileSync("git", ["patch-id", "--stable"], { input: patch, encoding: "utf8" }).trim().split(/\s+/)[0];
};
const features = sources.map(([slug, branch, commit, status, dependencies, visual_route]) => ({
  slug, source_branch: branch, source_commit: commit, source_tree: git("rev-parse", `${commit}^{tree}`), patch_id: patchId(commit), status, dependencies,
  included_files: git("diff-tree", "--no-commit-id", "--name-only", "-r", commit).split("\n").filter(Boolean),
  conflict_resolution: slug === "stream-orbit" ? "repaired successor semantics selected; one camera arbiter; delta timing plus hidden-tab suspension retained" : slug.includes("museum") || ["pokemon-cards","star-wars-game","call-of-duty","halo","obsidian-disabled-placeholder","pokemon-game"].includes(slug) ? "canonical shell registry owns search/deep-link/camera; generated adapters preserve leaf LOD and inactive suspension" : "central composition; no duplicate route/source introduced",
  visual_route
}));
const manifest = {
  schema_version: "hermes3d-full-nightly-candidate/v1",
  label: "UNAPPROVED NIGHTLY CANDIDATE",
  task_id: "t_407da0ef",
  branch: "wt/t_407da0ef",
  base: { nightly_commit: git("rev-parse", "origin/nightly"), nightly_tree: git("rev-parse", "origin/nightly^{tree}"), dev_commit: git("rev-parse", "origin/dev"), dev_tree: git("rev-parse", "origin/dev^{tree}") },
  all_feature_branches_accounted_for: true,
  exclusions: [],
  privacy_constraints: { obsidian: "STATIC_DISABLED_PLACEHOLDER_ONLY; no filesystem or network access", boplog: "AGGREGATE_ONLY_FAIL_CLOSED", private_evidence_committed: false },
  superseded_evidence: [{ refs: ["nightly-preview/24d0b276d0d0", "nightly-preview/ae445a082ac5", "wt/t_ea527d2f"], disposition: "SUPERSEDED_INCOMPLETE_FEATURE_SET; preserved refs; not deleted or rewritten" }],
  features
};
const output = resolve(process.argv[2] ?? "artifacts/full-nightly/feature-manifest.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(output);
