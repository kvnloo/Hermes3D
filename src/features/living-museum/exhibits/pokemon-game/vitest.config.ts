import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "src/features/living-museum/exhibits/pokemon-game/tests/**/*.test.ts",
    ],
  },
});
