import { describe, expect, it } from "vitest";
import sourceDirectory from "../../config/public-company-directory.v1.json";
import { parseCompanyDirectoryV1 } from "@/lib/public-directory/companyDirectoryV1";

const cloneSource = (): Record<string, unknown> => structuredClone(sourceDirectory);

describe("CompanyDirectoryV1", () => {
  it("accepts the allowlisted public projection", () => {
    const parsed = parseCompanyDirectoryV1(sourceDirectory);
    expect(parsed?.company).toEqual({ publicId: "company_zer0", displayName: "zer0" });
    expect(parsed?.agents.map((agent) => agent.displayName)).toEqual([
      "Captain",
      "First Mate",
      "Second Mates",
      "Crewmates",
      "Verifiers",
    ]);
    expect(parsed?.meshEntities.map((entity) => entity.displayName)).toEqual([
      "0",
      "mbp",
      "Telegram Gateway",
    ]);
  });

  it.each([
    "logs",
    "status",
    "messages",
    "task",
    "path",
    "ip",
    "model",
    "prompt",
    "presence",
    "hostname",
    "provider",
    "credentials",
  ])("rejects prohibited or unknown root field %s", (field) => {
    const candidate = cloneSource();
    candidate[field] = "private";
    expect(parseCompanyDirectoryV1(candidate)).toBeNull();
  });

  it.each(["logs", "status", "messages", "task", "path", "ip", "model", "prompt"])(
    "rejects prohibited nested agent field %s",
    (field) => {
      const candidate = cloneSource();
      const agents = candidate.agents as Array<Record<string, unknown>>;
      agents[0][field] = "private";
      expect(parseCompanyDirectoryV1(candidate)).toBeNull();
    },
  );

  it.each(["status", "ip", "hostname", "latency", "health", "routes", "port", "tailscaleId"])(
    "rejects prohibited mesh telemetry field %s",
    (field) => {
      const candidate = cloneSource();
      const entities = candidate.meshEntities as Array<Record<string, unknown>>;
      entities[0][field] = "private";
      expect(parseCompanyDirectoryV1(candidate)).toBeNull();
    },
  );

  it("rejects schema and field type mutations", () => {
    const wrongVersion = cloneSource();
    wrongVersion.schemaVersion = 2;
    expect(parseCompanyDirectoryV1(wrongVersion)).toBeNull();

    const wrongType = cloneSource();
    (wrongType.company as Record<string, unknown>).displayName = 3;
    expect(parseCompanyDirectoryV1(wrongType)).toBeNull();
  });

  it("rejects XSS-like and overlong display text", () => {
    const xss = cloneSource();
    (xss.company as Record<string, unknown>).displayName = "<img src=x onerror=alert(1)>";
    expect(parseCompanyDirectoryV1(xss)).toBeNull();

    const longName = cloneSource();
    (longName.company as Record<string, unknown>).displayName = "x".repeat(65);
    expect(parseCompanyDirectoryV1(longName)).toBeNull();
  });

  it("rejects duplicate IDs across collections", () => {
    const duplicate = cloneSource();
    const agents = duplicate.agents as Array<Record<string, unknown>>;
    const entities = duplicate.meshEntities as Array<Record<string, unknown>>;
    entities[0].publicId = agents[0].publicId;
    expect(parseCompanyDirectoryV1(duplicate)).toBeNull();
  });

  it("rejects duplicate, missing, or unsorted order values", () => {
    const duplicateOrder = cloneSource();
    const duplicateAgents = duplicateOrder.agents as Array<Record<string, unknown>>;
    duplicateAgents[1].order = duplicateAgents[0].order;
    expect(parseCompanyDirectoryV1(duplicateOrder)).toBeNull();

    const unsorted = cloneSource();
    const unsortedAgents = unsorted.agents as Array<Record<string, unknown>>;
    [unsortedAgents[0], unsortedAgents[1]] = [unsortedAgents[1], unsortedAgents[0]];
    expect(parseCompanyDirectoryV1(unsorted)).toBeNull();
  });
});
