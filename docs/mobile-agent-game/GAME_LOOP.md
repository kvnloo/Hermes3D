# Truthful game loop

| Authoritative fact | Settlement projection | Never imply |
|---|---|---|
| agent ready/running/waiting/offline | crew pose + label + icon | effort/productivity score |
| task todo/running/review/blocked | work order / worksite / gate / hazard | unsupported percent complete |
| accepted revision/artifact | delivered crate or structural stage | business/humanitarian impact |
| stale snapshot | desaturated world + timestamp | live activity |

The shortest session is 15–45 seconds: open World, inspect the exceptional state, act or leave. No daily streak. Assignment creates an intent receipt; only authority evidence changes construction. Rejection retains history.

Prototype: “Assign Atlas locally” records `cmd-mobile-001`; fixture `ev-running-001` moves queued → running. A second action attaches `ev-review-001` and moves running → review. Replay is idempotent. “Synthetic evidence · private” stays visible.

Disconnected mode retains the last valid snapshot, marks it stale/read-only, and shows observation time. Invalid snapshots are rejected wholesale. Command failure retains prior projection and shows the error inline.
