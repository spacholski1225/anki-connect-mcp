# Media attachments: flashcards with images, audio and video

## Problem

Agents using this server can only create text notes.

- The `audio` parameter of `add_note` / `add_notes` was a stale AnkiConnect v5 shape: one object, URL only.
- The media helpers in `src/tools/media.ts` were never registered. Their `storeMediaFile` result was typed `null`, but AnkiConnect returns the name it stored the file under.
- AnkiConnect's own `picture` / `audio` / `video` note parameters hide failures: when an attachment cannot be stored, AnkiConnect writes the error text *into the note field* and still reports success. That breaks this project's rule that every failure surfaces as a tool error ([agent-ready-tools.md](./agent-ready-tools.md)).

Background research: [AnkiConnect media support](../research/2026-10-28-ankiconnect-media-support.md).

## Solution

`add_note`, `add_notes` and `update_note_fields` accept `picture`, `audio` and `video` arrays of `{ source, filename?, fields }`. The server stores every file itself through `storeMediaFile`, then appends the tag for the name Anki actually chose to each listed field. Attachments are never forwarded to AnkiConnect. Five media tools join the default group. The package moves to 3.0.0 because `audio` changes shape.

## Required behaviour

- When a note carries media, each file is stored with `deleteExisting: false`, and the returned name (not the requested one) is appended to every target field: `<img src="NAME">` for pictures, `[sound:NAME]` for audio and video, separated from existing content by `<br>`.
- When `filename` is omitted, it is the last segment of `source`: the URL path segment, percent-decoded (`cat%20photo.jpg` → `cat photo.jpg`), or the last segment of a POSIX or Windows path.
- When a target field is not a field of the note's model, or no file name can be derived, or a URL is invalid, the tool returns an error naming the item (`picture[0]: ...`, `notes[1].picture[0]: ...`), and nothing is stored or created.
- When storing a file fails, the tool returns an error naming the item and the source, and no note is created or updated.
- When `add_notes` has a bad item in any note, no file is stored and no note is created.
- When the caller writes field keys in a different case than the model (`back` instead of `Back`), the note is sent with the model's spelling, so the appended tag and the caller's value end up in the same field.
- When `update_note_fields` attaches media to a field it is not overwriting, the tag is appended to the field's current value. When `fields` is omitted, only media is attached.
- When `update_note_fields` targets a note that does not exist and carries media, the tool returns `Note <id> was not found.`
- When a note carries no media, the request to AnkiConnect is the same as before and no extra request is made.
- `retrieve_media_file` returns PNG, JPEG, GIF and WebP files up to 5 MB as MCP image content; anything else returns `{ filename, bytes }`; a missing file is a tool error.
- `store_media_file` returns the stored name. `get_media_files_names` returns `{ names, total, truncated }` capped by `limit`.

## Implementation decisions

- **One deep module.** `src/tools/media.ts` owns source detection, filename derivation, the never-overwrite policy, tag formats, target validation, field-name canonicalisation, error labels and media timeouts. `src/tools/notes.ts` only spreads `mediaAttachments` into its input schemas and makes one call per handler (`prepareNote`, `prepareNotes`, `prepareNoteUpdate`). Each entry point returns exactly the AnkiConnect payload, with the media keys removed.
- **The server stores files itself** instead of forwarding `picture` / `audio` / `video` to AnkiConnect, so every failure becomes a tool error rather than text inside a field.
- **One `source` string** instead of separate `url` / `path`: an `http(s)://` prefix means URL, anything else is a path on the computer running Anki. There is no "neither / both" case to handle. Base64 sources are out of scope.
- **`deleteExisting: false` always.** A file other cards use is never replaced; Anki keeps the name for identical content and picks a new one for different content. Anki also normalises names (it strips `" < > [ ]` and other characters it does not allow; case is kept, as the real-Anki smoke run showed), so the server never assumes the requested name and the `<img>` tag needs no HTML escaping. `skipHash` is not supported, because on a hash match AnkiConnect returns `null` instead of a name.
- **Validate everything, then store.** Phase 1 checks every item of every note (targets, derived filename, URL). Phase 2 stores files sequentially. Files stored before a later failure stay in the media folder: the stored name may be a pre-existing identical file other cards use, and Anki's Check Media removes unused files.
- **Field names.** `addNote` matches field names case-insensitively, so keys of `fields` are renamed to the model's spelling before tags are appended; targets must match the model's spelling exactly. `updateNoteFields` matches exactly, so no renaming happens there; current values come from `notesInfo`. `modelFieldNames` is fetched once per distinct model.
- **Errors.** Argument problems throw `ToolError`, which the tool wrapper returns verbatim. AnkiConnect failures while storing are rethrown as `AnkiConnectError` prefixed with the item label and source. An unreachable AnkiConnect propagates unchanged. The server instructions now tell the agent that any message other than the two AnkiConnect prefixes describes its arguments.
- **Timeouts.** `AnkiClient.invoke` takes an optional per-call `timeoutMs`. Media calls use 120 s, because AnkiConnect answers only after the download or read finishes; other calls keep 15 s.
- **Images the agent can see.** Handlers may return `ImageResult`, which the wrapper turns into MCP image content. SVG is excluded because MCP clients' vision input does not accept it. Images over 5 MB are described, not returned, to protect the agent's context.
- **Annotations.** All media tools are in the default group. `delete_media_file` is destructive. `update_note_fields` is no longer idempotent, because each retry appends another tag.
- **Generic list cap.** `limitIds` became `limitResults(key, items, limit)`, shared by `find_notes`, `find_cards` and `get_media_files_names`.
- **Legacy removed.** The unregistered media helpers, `callAnkiConnect`, `AnkiClient.send`, `src/types/anki/media.ts` and the `NoteAudio` type are gone.
- **Version 3.0.0**, because `audio` changes shape. README documents the upgrade.

## Testing

- **Seam:** the MCP protocol, as in [agent-ready-tools.md](./agent-ready-tools.md). An in-memory SDK client talks to the real server; a fake AnkiConnect HTTP server is the only mock. Assertions cover the tool result the agent sees and the requests that reach Anki.
- **Behaviours verified** (`test/tools.test.ts`, `describe("media")`):
  - media lands in the note under the name Anki chose, for URL, POSIX-path and Windows-path sources, and no media keys reach `addNote`;
  - field composition: several items on one field, duplicate targets, a target missing from `fields`, lowercase field keys;
  - failures create nothing and name the item: unknown target, underivable filename, invalid URL, empty target list, a bad note in a batch (nothing stored), a failed download in a batch;
  - `update_note_fields` appends to the current or new value, works without `fields`, makes no extra request without media, and reports an unknown note;
  - media tools: image content for a small PNG, `{ filename, bytes }` for large images and audio, an error for a missing file, the stored name from `store_media_file`;
  - tool listing: media tools in the default group with the right annotations; `update_note_fields` not idempotent.
- **End-to-end:** a throwaway script against a real Anki with AnkiConnect v6 adds a note with a local picture, reads it back as an image, adds one from a URL, checks a bad target creates nothing, and cleans up.

## Out of scope

- Base64 sources (`data`). Files come from a URL or a path on the Anki host.
- Uploading files from the MCP server's own filesystem when it does not share one with Anki (e.g. Docker).
- `skipHash` and overwriting existing media files.
- `updateNote` (combined fields and tags update).
- Removing media tags from fields, or deleting files a failed batch already stored.
