import { defineConfig } from "vitest/config";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../../../..");

export default defineConfig({
  root,
  resolve: { alias: { "@": path.resolve(root, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: path.resolve(root, "tests/setup.ts"),
    include: ["src/features/living-museum/exhibits/star-wars-game/tests/manifest.test.ts"],
  },
});
