# YouTube live chat → Captain Telegram relay

This disabled-by-default Node service reads the current `@kvnloo` broadcast through the official YouTube Data API and delivers sanitized text through Hermes' existing `hermes send` transport. It never posts to YouTube, accepts chat commands, or exposes an HTTP listener.

## Fixed identity and privacy contract

- Source handle: `@kvnloo`; active video and chat IDs are resolved on every poll with official `channels.list`, `search.list`, and `videos.list` calls. No video ID is hardcoded.
- Destination: exactly `telegram:1083429746`; any other destination is refused.
- Credential: an OAuth bearer credential with only `https://www.googleapis.com/auth/youtube.readonly`, supplied at runtime as `YOUTUBE_ACCESS_TOKEN`. Never commit it or pass it in chat. Google must enable the YouTube Data API for the OAuth client.
- State: `$HERMES_HOME/youtube-chat-telegram-relay/`, mode `0600`; the bounded dedupe cursor contains IDs only. Logs contain counters/status codes, not message bodies or API payloads.
- First activation defaults to `summary`. The first API page primes the cursor and is never delivered.

The official authorization flow is Google's installed-app OAuth flow in the system browser. Until the Captain consents to the scope above and the runtime injects a valid access token, `run` fails closed. The service does not implement or store refresh tokens.

## Modes

`continuous` sends bounded micro-batches, `summary` emits a deterministic privacy-safe interval digest, `hybrid` immediately sends deterministic question/mention/moderator triggers and summarizes the rest, and `off` advances the cursor without delivery. Summaries exclude display names and direct quotes; “energy” is explicitly an approximation based only on volume.

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