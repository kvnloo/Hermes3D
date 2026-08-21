# Global Search v1 contract

Search is a public-safe navigation mode, not a database explorer.

## Corpus

The generated client index contains only allowlisted records of type `exhibit`, `product`, `project`, or `command`. Exhibit records come from validated `MuseumExhibitV1.search` fields. Product/project records require the same explicit public projection gate. Commands are static allowlisted navigation actions.

Forbidden sources include the filesystem, path-suggestion API, raw Kanban or Boplog databases, gateway transcripts/events, logs, Studio settings, environment variables, Obsidian metadata and network discovery. There is no fallback to a broader source when the corpus is empty or an adapter fails.

## Result schema

A result is exactly: `id`, `type`, `title`, `summary`, `keywords`, `filters`, `href`, and optional `exhibitSlug` plus `destinationAnchor: "approach"`. Unknown fields reject. Text is rendered as text, never injected HTML. URLs are same-origin paths or validated public `https:` URLs.

## Interaction

- Shortcut: `/` when focus is not in an editable control; `Ctrl+K` or `Meta+K` may also open it if not already claimed by the host shell.
- Escape closes and restores focus. Arrow Up/Down changes the active descendant. Enter navigates. Tab remains normal focus navigation.
- Query normalization uses Unicode NFKC, lowercase and whitespace collapse. The maximum query is 120 code points.
- Fuzzy ranking is deterministic: exact title, title prefix, token prefix, keyword, then bounded edit-distance. Tie-break by normalized title then ID.
- Filters are multi-select allowlisted enums. An empty query shows curated destinations, never recent private activity.
- The URL deep-link is `/museum?exhibit=<slug>&anchor=approach`. Invalid slug/anchor fails to museum arrival without reflecting raw input.
- Mobile uses the same corpus and keyboard-independent result list with 44 px minimum targets.

## Tests

Reject unknown result fields, HTML/script payloads, control characters, disallowed schemes/origins, overlong query, invalid slug/anchor, private-key names and source adapters outside the allowlist. Verify deterministic ranking, keyboard focus restoration, screen-reader active descendant, filters, empty/no-result states, deep-link approach framing and zero network calls while searching the local index.
