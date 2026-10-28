# Research: AnkiConnect media support for image flashcards

- **Slug:** `2026-10-28-ankiconnect-media-support`
- **Date:** 2026-10-28
- **Status:** complete
- **Triggered by:** request to let agents create Anki flashcards with images through this MCP server
- **Informed:** [Media attachments spec](../specs/media-attachments.md)

## Question

Which AnkiConnect actions and parameters let a client put images on notes, how do they behave (sources, precedence, returned filename, collisions, errors), and what constraints apply when the MCP server and Anki may not share a filesystem?

## Sources

### [AnkiConnect README, archived FooSoft copy](https://github.com/FooSoft/anki-connect/blob/820300cc5ccfb84b20d8cb18a23e79877ba40084/README.md)
- **Authors / Org:** Alex Yatskov (FooSoft) and AnkiConnect contributors
- **Type:** vendor doc
- **Published:** ongoing (archived commit `820300cc`)
- **Accessed:** 2026-10-28
- **Relevance:** high
- **What this contributed:** Request and response examples for `storeMediaFile`, `retrieveMediaFile`, `getMediaFilesNames`, `getMediaDirPath`, `deleteMediaFile`, and the `picture` / `audio` / `video` arrays on `addNote`. Establishes that `path` is an absolute path on the Anki host and that leading `_` exempts a file from the unused-media check.
- **Quoted:**
  > "If more than one of `data`, `path` and `url` are provided, the `data` field will be used first, then `path`, and finally `url`."

### [AnkiConnect plugin source, `plugin/__init__.py`](https://github.com/FooSoft/anki-connect/blob/master/plugin/__init__.py)
- **Authors / Org:** Alex Yatskov (FooSoft) and AnkiConnect contributors
- **Type:** open-source project
- **Published:** ongoing
- **Accessed:** 2026-10-28
- **Relevance:** high
- **What this contributed:** Actual behaviour the README leaves implicit. `storeMediaFile` returns the stored filename, which can differ from the requested one, and defaults `deleteExisting=True`. Note attachments (`addMedia`) pass `deleteExisting=None`, so collisions are preserved there. Empty `fields` on an attachment means no upload. A media failure during `addNote` is HTML-escaped into the target fields instead of being raised. `updateNoteFields` accepts attachments, and `updateNote` accepts them only when `note.fields` is present.

### [AnkiConnect on context7 (`/git_git_sr_ht/~foosoft_anki-connect`)](https://git.sr.ht/~foosoft/anki-connect)
- **Authors / Org:** FooSoft upstream, indexed by context7 (Upstash)
- **Type:** vendor doc (secondary index of the SourceHut README and `_autodocs`)
- **Published:** ongoing
- **Accessed:** 2026-10-28
- **Relevance:** medium
- **What this contributed:** Independent confirmation of the source precedence, the error messages (`You must provide a "data", "path", or "url" field.`, `<url> download failed with return code <n>`), and that a failed media item ends up inside the note fields. It also flagged that `/amikey/anki-connect` on context7 is a stale v5 fork whose `addNote` has no `picture`, so it must not be used as a reference. The canonical SourceHut README returned HTTP 418 to direct fetches.

### [Anki media filename handling, `rslib/src/media/files.rs`](https://github.com/ankitects/anki/blob/aeba725d3ea9628c73300648f748140db3fdd5ed/rslib/src/media/files.rs#L169-L219)
- **Authors / Org:** Ankitects (Damien Elmes and contributors)
- **Type:** open-source project
- **Published:** ongoing
- **Accessed:** 2026-10-28
- **Relevance:** medium
- **What this contributed:** Anki normalises filenames and, when not replacing, keeps the name for identical content or adds a hash suffix for different content. This is why callers must use the returned filename, never the requested one.

### [Anki manual: Media](https://docs.ankiweb.net/manual/media) and [AnkiWeb file size FAQ](https://docs.ankiweb.net/faqs/are-there-limits-on-file-sizes-on-ankiweb)
- **Authors / Org:** Ankitects
- **Type:** vendor doc
- **Published:** ongoing
- **Accessed:** 2026-10-28
- **Relevance:** low
- **What this contributed:** Individual synced media files are limited to 100 MB. JPG and PNG are the documented image formats; the sources do not establish that GIF, SVG or WebP work on every client.

## Synthesis

AnkiConnect (API version 6) offers two ways to get an image onto a card.

1. **Store, then reference.** `storeMediaFile` takes `filename` plus one of `data` (base64), `path` (absolute, read by the Anki host) or `url` (downloaded by the Anki host). It returns the filename Anki actually stored, which can differ from the requested one. The caller then writes `<img src="RETURNED_NAME">` into a field. With the default `deleteExisting=true` it silently replaces a file of the same name.
2. **Attach on create or update.** `addNote`, each `addNotes` item, `updateNoteFields`, and `updateNote` (only together with `fields`) take `picture`, `audio` and `video` arrays. Each item has `filename`, one of `data` / `path` / `url`, optional `skipHash` / `deleteExisting`, and `fields`. AnkiConnect appends `<img src="...">` for pictures and `[sound:...]` for audio and video to each named field. Collisions are preserved here, unlike direct `storeMediaFile`.

Constraints that matter for this server:

- `path` and `url` are resolved by the **Anki host**, not by the MCP server. In Docker mode the two do not share a filesystem.
- If an attachment fails, the error text is inserted into the note field and `addNote` still succeeds. This conflicts with this project's rule that every failure surfaces as a tool error (`docs/specs/agent-ready-tools.md`).
- Empty `fields` on an attachment uploads nothing. Unknown field names receive nothing, and no error is raised.
- `retrieveMediaFile` returns base64 or `false`, `getMediaFilesNames` takes a glob `pattern`, `getMediaDirPath` takes no params, and `deleteMediaFile` returns `null`.

## Downstream uses

- Intake brief for image flashcards (this session).
- [Media attachments spec](../specs/media-attachments.md): the server stores files itself with `deleteExisting:false` and never forwards attachments to AnkiConnect.
