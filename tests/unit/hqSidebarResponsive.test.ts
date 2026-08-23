import { describe, expect, it } from "vitest";
import { shouldOpenHQSidebar } from "@/features/office/components/HQSidebar";

describe("HQ sidebar responsive default", () => {
  it("keeps the office readable at the required phone viewport", () => {
    expect(shouldOpenHQSidebar(390)).toBe(false);
  });

  it("preserves the desktop headquarters presentation", () => {
    expect(shouldOpenHQSidebar(1920)).toBe(true);
  });
});