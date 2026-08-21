import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/features/living-museum/exhibits/obsidian-vault/tests/**/*.test.ts"],
  },
});
