import path from "node:path";
import { defineConfig } from "vitest/config";

const root = path.resolve(import.meta.dirname, "../../../../..");

export default defineConfig({
  root,
  resolve: { alias: { "@": path.resolve(root, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: path.resolve(root, "tests/setup.ts"),
    include: ["src/features/living-museum/exhibits/halo/tests/manifest.test.ts"],
  },
});
