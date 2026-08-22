export type FixtureTaskStatus = "queued" | "running" | "review";

type FixtureTask = {
  id: string;
  title: string;
  status: FixtureTaskStatus;
  assigneeId: string | null;
  provenance: string;
};

const COMMAND_ID = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const allowedTransitions: Record<FixtureTaskStatus, FixtureTaskStatus[]> = {
  queued: ["running"],
  running: ["review"],
  review: [],
};

export function createFixtureTruthAdapter() {
  const handled = new Set<string>();
  const evidence = new Set<string>();
  const tasks: FixtureTask[] = [{
    id: "task-mobile-shell",
    title: "Prototype the mobile settlement shell",
    status: "queued",
    assigneeId: null,
    provenance: "Synthetic fixture · no live mutation",
  }];

  return {
    issue(value: unknown): { status: "applied" | "duplicate" | "rejected" } {
      if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "rejected" };
      const command = value as Record<string, unknown>;
      if (command.version !== 1 || command.action !== "assign" || typeof command.commandId !== "string" || !COMMAND_ID.test(command.commandId) || typeof command.taskId !== "string" || typeof command.agentId !== "string" || Object.keys(command).length !== 5) return { status: "rejected" };
      if (handled.has(command.commandId)) return { status: "duplicate" };
      const task = tasks.find((item) => item.id === command.taskId);
      if (!task || task.status !== "queued") return { status: "rejected" };
      handled.add(command.commandId);
      task.assigneeId = command.agentId;
      return { status: "applied" };
    },
    applyEvidence(value: unknown): boolean {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const next = value as Record<string, unknown>;
      if (next.version !== 1 || typeof next.evidenceId !== "string" || !COMMAND_ID.test(next.evidenceId) || typeof next.taskId !== "string" || !["running", "review"].includes(String(next.status)) || Object.keys(next).length !== 4 || evidence.has(next.evidenceId)) return false;
      const task = tasks.find((item) => item.id === next.taskId);
      const status = next.status as FixtureTaskStatus;
      if (!task || !allowedTransitions[task.status].includes(status)) return false;
      evidence.add(next.evidenceId);
      task.status = status;
      return true;
    },
    snapshot: () => ({
      version: 1 as const,
      mode: "synthetic-evidence" as const,
      stale: false,
      observedAt: "2026-08-22T18:00:00Z",
      tasks: tasks.map((task) => ({ ...task })),
      handledCommandIds: [...handled],
    }),
  };
}
