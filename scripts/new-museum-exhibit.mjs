import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const slug = process.argv[2];
const allowed = new Set(["call-of-duty", "halo", "obsidian-vault", "pokemon-cards", "pokemon-game", "star-wars-game"]);
if (!slug || !allowed.has(slug)) throw new Error("Provide one allowlisted museum exhibit slug");
const root = path.join(process.cwd(), "src/features/living-museum/exhibits", slug);
if (existsSync(root)) throw new Error(`Refusing to overwrite existing exhibit: ${slug}`);
await mkdir(path.join(root, "assets"), { recursive: true });
await mkdir(path.join(root, "tests"), { recursive: true });
const title = slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
await writeFile(path.join(root, "assets/.gitkeep"), "");
await writeFile(path.join(root, "manifest.ts"), `import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";\n\n// Replace authored copy, anchors and budgets before registry integration.\nexport const manifest = {\n  schemaVersion: "museum-exhibit/v1", id: "museum:${slug}", slug: "${slug}", title: "${title}",\n} as unknown as MuseumExhibitV1;\n`);
await writeFile(path.join(root, "ExhibitScene.tsx"), `"use client";\n\nexport function ExhibitScene({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {\n  void active; void reducedMotion;\n  return null;\n}\n`);
await writeFile(path.join(root, "tests/manifest.test.ts"), `import { describe, expect, it } from "vitest";\nimport { validateMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";\nimport { manifest } from "../manifest";\n\ndescribe("${slug} manifest", () => {\n  it("passes the strict public exhibit contract", () => expect(() => validateMuseumExhibitV1(manifest)).not.toThrow());\n});\n`);
console.log(`Created isolated exhibit scaffold at ${path.relative(process.cwd(), root)}`);
