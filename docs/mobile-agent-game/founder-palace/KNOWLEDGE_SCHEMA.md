# Founder knowledge schema

## `FounderKnowledgeItem` v1

Conceptual contract; no production code is introduced by this task.

```ts
type FounderKnowledgeItemV1 = {
  schemaVersion: 1;
  id: string;
  revision: number;
  semanticType: "first_principle" | "mental_model" | "tradeoff" | "hypothesis" | "strategy" | "experiment" | "action" | "leading_signal" | "outcome" | "lesson";
  truthClass: "sourced_company_fact" | "inferred_hypothesis" | "recommendation" | "user_commitment" | "authoritative_outcome";
  title: string;
  statement: string;
  founderIntentId: string;
  objectiveId: string;
  guardrailIds: string[];
  parentIds: string[];
  relatedIds: string[];
  tradeoffIds: string[];
  provenance: ProvenanceRef[];
  confidence: { value: number; basis: string; calibratedAt: string };
  freshness: { observedAt: string; staleAfter?: string; status: "fresh" | "stale" | "offline_unknown" };
  locus: { landmark: Landmark; cue: string; accessibleLabel: string };
  retrieval: {
    dueAt?: string;
    desiredHorizon?: string;
    history: RetrievalAttempt[];
  };
  applicationLinks: { decisionIds: string[]; actionIds: string[]; experimentIds: string[] };
  evidenceLinks: { leadingSignalIds: string[]; outcomeIds: string[]; confoundIds: string[] };
  state: "active" | "stale" | "superseded";
  supersedesId?: string;
  supersededById?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Supporting constraints

- IDs are bounded opaque identifiers; no secrets or human-readable PII.
- Unknown fields, incompatible versions, malformed dates, out-of-range confidence, invalid landmark/type combinations, cycles in supersession, and missing provenance for fact/outcome classes fail closed.
- Canonical copies are immutable to callers. State transitions append a revision; they do not overwrite history.
- `cue` and `accessibleLabel` must exclude credentials, secrets, raw PII, private customer quotations, protected health information, and sensitive personnel data.
- `sourced_company_fact` and `authoritative_outcome` require at least one accepted provenance reference and observed time.
- `inferred_hypothesis` requires assumptions and evidence-for/evidence-against in provenance metadata.
- `recommendation` requires objective, tradeoffs, uncertainty, alternatives and approval requirement.
- `user_commitment` requires an explicit approval receipt and exact trigger/action wording.
- Stale items remain retrievable as historical knowledge but cannot support claims of current company truth.

## Retrieval attempt

```ts
type RetrievalAttempt = {
  attemptId: string;
  promptedAt: string;
  completedAt?: string;
  mode: "spatial" | "list" | "text";
  hintLevel: 0 | 1 | 2;
  responseSummary?: string;
  success: "unanswered" | "incorrect" | "partial" | "correct";
  confidenceBeforeFeedback?: number;
  feedbackEvidenceIds: string[];
};
```

## Mastery projection

Mastery is a read-only projection with four fields: `knowledge`, `scenario`, `application`, `outcomeReflection`. No aggregate may report `mastered` unless all four meet policy. This projection never becomes company truth and never drives consequential action automatically.
