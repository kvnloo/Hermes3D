# YouTube live chat → Captain Telegram relay

This disabled-by-default Node service reads the current `@kvnloo` broadcast through the official YouTube Data API and delivers sanitized text through Hermes' existing `hermes send` transport. It never posts to YouTube, accepts chat commands, or exposes an HTTP listener.

## Fixed identity and privacy contract

- Source identity: the OAuth owner's active broadcast. Discovery uses the official low-cost `liveBroadcasts.list(mine=true,broadcastStatus=active)` call, never `search.list`. Video/live-chat identity and cursor are cached durably and cleared only on API lifecycle/end signals.
- Destination: exactly `telegram:1083429746`; any other destination is refused.
- Credential: an OAuth bearer credential with only `https://www.googleapis.com/auth/youtube.readonly`, supplied at runtime as `YOUTUBE_ACCESS_TOKEN`. Never commit it or pass it in chat. Google must enable the YouTube Data API for the OAuth client.
- State: `$HERMES_HOME/youtube-chat-telegram-relay/state.json`, mode `0600`, is the one canonical atomic transaction for effective validated config, mode generation, pending continuous/summary records, cursor, both rate windows, quota and live identity. Missing state is atomically created and parent-directory-synced as `enabled=false`, mode `off`, with a fresh nonzero generation, empty queues/in-flight state, and reason `absent_state_bootstrap`; static config can suggest bounds but can never activate an absent runtime. Creation failure sends nothing. Canonical state and its parent are checked with `lstat`, realpath validation, and no-follow opens; symlinks, directories, FIFOs, other non-regular leaves, and substitution races fail closed without target mutation. If any object wins the exclusive canonical create after the initial absent read, that bootstrap attempt returns `bootstrap_race` and retains only effective safe-off memory; it never reloads or adopts the winner. Only a fresh process/init may read that object under the normal established-state schema and path checks after independent validation. Invalid/incomplete state bytes are first copied byte-for-byte to a unique, synced mode-`0600` quarantine file, then a synced canonical `off` sentinel atomically replaces the state path; before replacement failures retain the original bytes for restart retry, while failures after replacement leave a valid canonical `off` state. Real-filesystem fixtures interrupt every bootstrap, quarantine, and safe-temp durability boundary and cover malformed, truncated, schema-invalid, unwritable, collision, symlink, FIFO, and path-substitution cases. A legacy v2 state is migrated once using its persisted mode/generation while purging all pending content. An ambiguous crash or transport failure is counted without retaining a message body, advances to a new `off` generation on restart, and purges pending content, so it cannot replay.
- First activation requires an explicit authenticated owner-local `mode` command after the safe-off state exists. The first API page primes the cursor and is never delivered.

The official authorization flow is Google's installed-app OAuth flow in the system browser. Until the Captain consents to the scope above and the runtime injects a valid access token, `run` fails closed. The service does not implement or store refresh tokens.

## Modes

`continuous` sends bounded micro-batches, `summary` emits a deterministic privacy-safe interval digest, `hybrid` immediately sends deterministic question/mention/moderator triggers and summarizes the rest, and `off` advances the cursor without delivery. Every explicit transition, including same-mode transitions, increments `modeGeneration` and atomically discards all content-bearing pending records; only bounded aggregate dropped count/bytes remain. One async linearization mutex covers canonical generation validation, durable in-flight reservation, transport, acknowledgement and mode transition. A transition is not acknowledged while a prior transport owns that mutex; its bounded wait fails pending rather than falsely claiming the new mode. Stale generations are rejected at acceptance, dequeue, summary, pre-send and acknowledgement boundaries. Summaries exclude display names and direct quotes; “energy” is explicitly an approximation based only on volume.

All modes share `queueLimit` and `maxPendingBytes`; overflow drops oldest records and emits one aggregate bounded notice. YouTube deletion events retract pending records by source ID from either queue. A bounded seven-day/5,000-entry body-free delivered-source-ID ring distinguishes `deletedAfterDelivery` from `unknownDeletion`; content already delivered cannot be recalled. `messagesPerMinute` counts source records (ten records in one batch consume ten units), while `telegramSendsPerMinute` independently caps transport calls. Deterministic deferred-transport fixtures prove success, rejection, bounded transition timeout, two concurrent sends, concurrent mode commands, and crash/restart no-replay state at each durable boundary; recorded ordering proves an old-generation transport completion cannot occur after an `off` acknowledgment.

## Quota and transport safety

The default daily budget is 9,000 units and exhaustion fails closed. Active discovery is at most once per 15 minutes (96 × 1 = 96 units/day). Chat polling is clamped to at least 60 seconds (1,440 × 5 = 7,200 units/day). Thus the configured worst case is 7,296 units/day, 1,704 below budget; API-request debits are persisted before each call. Lifecycle 403/404 clears the cached stream and triggers bounded backoff plus the next low-cost discovery.

`hermes send` currently offers no explicit parse-mode-off flag. The relay therefore sends one positional argument without a shell and makes untrusted text inert for both Telegram Markdown and HTML interpretation: formatting metacharacters are escaped/replaced, mentions are full-width, bidi/control characters are removed, and all URLs are deactivated (`hxxps`); credential-bearing URLs are removed first. The fixed destination remains the only accepted target.

Owner-local atomic mode switch (takes effect on the next poll without restart):

```sh
node scripts/youtube-chat-telegram-relay.mjs mode summary
node scripts/youtube-chat-telegram-relay.mjs status
```

Hermes currently provides an authenticated Telegram delivery path but this repository does not expose an owner-only extension point for custom Telegram buttons/commands. Consequently mode control remains local rather than adding a competing or unauthenticated chat-command surface.

## Run, disable, and rollback

Run only after OAuth consent and explicit approval for always-on delivery:

```sh
YOUTUBE_ACCESS_TOKEN='runtime-secret' npm run relay:youtube-chat
```

Disable immediately:

```sh
node scripts/youtube-chat-telegram-relay.mjs mode off
```

No service unit is installed or enabled by this change. If supervised later, inject the token from an approved secret source, set the working directory to this repository, use the command above, and leave restart backoff to the supervisor. Rollback is stopping that supervisor and deleting `$HERMES_HOME/youtube-chat-telegram-relay/` only if loss of the cursor/audit is intended.

Code rollback is `git revert <repair-commit>`; preserve the rejected commit and its review evidence. Do not enable a service, perform OAuth consent, run a live canary, push, merge, or mark Ready until independent code approval.