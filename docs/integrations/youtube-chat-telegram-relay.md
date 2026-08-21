# YouTube live chat → Captain Telegram relay

This disabled-by-default Node service reads the current `@kvnloo` broadcast through the official YouTube Data API and delivers sanitized text through Hermes' existing `hermes send` transport. It never posts to YouTube, accepts chat commands, or exposes an HTTP listener.

## Fixed identity and privacy contract

- Source identity: the OAuth owner's active broadcast. Discovery uses the official low-cost `liveBroadcasts.list(mine=true,broadcastStatus=active)` call, never `search.list`. Video/live-chat identity and cursor are cached durably and cleared only on API lifecycle/end signals.
- Destination: exactly `telegram:1083429746`; any other destination is refused.
- Credential: an OAuth bearer credential with only `https://www.googleapis.com/auth/youtube.readonly`, supplied at runtime as `YOUTUBE_ACCESS_TOKEN`. Never commit it or pass it in chat. Google must enable the YouTube Data API for the OAuth client.
- State: `$HERMES_HOME/youtube-chat-telegram-relay/`, mode `0600`; atomic replace + file/directory fsync covers pending continuous/summary records, cursor, mode generation, both rate windows, quota and live identity. Invalid JSON is quarantined and startup fails closed. An ambiguous crash between external send and acknowledgement also fails closed for operator reconciliation rather than replaying or discarding the retained record.
- First activation defaults to `summary`. The first API page primes the cursor and is never delivered.

The official authorization flow is Google's installed-app OAuth flow in the system browser. Until the Captain consents to the scope above and the runtime injects a valid access token, `run` fails closed. The service does not implement or store refresh tokens.

## Modes

`continuous` sends bounded micro-batches, `summary` emits a deterministic privacy-safe interval digest, `hybrid` immediately sends deterministic question/mention/moderator triggers and summarizes the rest, and `off` advances the cursor without delivery. Summaries exclude display names and direct quotes; “energy” is explicitly an approximation based only on volume.

All modes share `queueLimit` and `maxPendingBytes`; overflow drops oldest records and emits one aggregate bounded notice. YouTube deletion events retract pending records by source ID from either queue. Content already delivered cannot be recalled; only a deletion counter is retained. `messagesPerMinute` counts source records (ten records in one batch consume ten units), while `telegramSendsPerMinute` independently caps transport calls.

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