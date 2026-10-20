import { z } from 'zod';
import {
    READ_ONLY,
    additive,
    defineTool,
    destructive,
    limitIds,
    noteIds,
    searchLimit,
    searchQuery,
    type ToolDefinition,
} from './define.js';

const fields = z
    .record(z.string(), z.string())
    .describe('Field values keyed by field name, e.g. {"Front": "...", "Back": "..."}. Names must match the model exactly (see model_field_names). Values may contain HTML.');

const audio = z
    .object({
        url: z.string().describe('URL to download the audio file from.'),
        filename: z.string().describe('File name to store it under in the Anki media folder.'),
        skipHash: z.string().optional().describe('MD5 hash; if the downloaded file has this hash it is skipped.'),
        fields: z.string().describe('Field name to append the [sound:...] tag to.'),
    })
    .optional()
    .describe('Optional audio file to download and attach to the note.');

const noteBase = {
    deckName: z.string().describe('Exact name of an existing deck (see deck_names). Use "Parent::Child" for subdecks.'),
    modelName: z.string().describe('Exact name of the note type/model, e.g. "Basic" (see model_names).'),
    fields,
    tags: z.array(z.string()).optional().describe('Tags to put on the note, one tag per array item (no spaces inside a tag).'),
};

const note = z.object({ ...noteBase, audio });

export const noteTools: ToolDefinition[] = [
    defineTool({
        name: 'add_note',
        title: 'Add note',
        description:
            'Creates one note in the given deck using the given model (note type) and field values. Anki then generates one or more cards from it. ' +
            'Returns the new note ID. Fails (tool error) if the deck or model does not exist, a field name is wrong, the first field is empty, or the note is a duplicate. ' +
            'Tip: check with can_add_notes first; for several notes prefer add_notes.',
        inputSchema: { ...noteBase, audio },
        annotations: additive(false),
        handler: ({ deckName, modelName, fields, tags, audio }, anki) =>
            anki.invoke('addNote', { note: { deckName, modelName, fields, tags, audio } }),
    }),
    defineTool({
        name: 'add_notes',
        title: 'Add notes (batch)',
        description:
            'Creates several notes in one call. Returns an array of new note IDs in the same order as the input; an entry is null if that note could not be created (e.g. duplicate or empty first field). ' +
            'Run can_add_notes first to find out which notes will fail.',
        inputSchema: { notes: z.array(note).describe('Notes to create.') },
        annotations: additive(false),
        handler: ({ notes }, anki) => anki.invoke('addNotes', { notes }),
    }),
    defineTool({
        name: 'can_add_notes',
        title: 'Check notes can be added',
        description:
            'Dry run for add_notes: returns an array of booleans (same order as input) telling whether each note could be created. ' +
            'false usually means a duplicate, an empty first field, or an unknown deck/model. Does not change anything.',
        inputSchema: { notes: z.array(z.object(noteBase)).describe('Candidate notes to check.') },
        annotations: READ_ONLY,
        handler: ({ notes }, anki) => anki.invoke('canAddNotes', { notes }),
    }),
    defineTool({
        name: 'update_note_fields',
        title: 'Update note fields',
        description:
            'Overwrites the given fields of an existing note (takes a note ID, not a card ID). Fields not listed are left unchanged. ' +
            'The previous values are lost, so read the note with notes_info first if you need them. Returns null on success.',
        inputSchema: {
            id: z.number().int().describe('Note ID to update (a note ID, not a card ID).'),
            fields: z.record(z.string(), z.string()).describe('New field values keyed by field name.'),
        },
        annotations: destructive(true),
        handler: ({ id, fields }, anki) => anki.invoke('updateNoteFields', { note: { id, fields } }),
    }),
    defineTool({
        name: 'add_tags',
        title: 'Add tags to notes',
        description:
            'Adds tags to notes (takes note IDs, not card IDs). `tags` is a single space-separated string, e.g. "verbs chapter1". Returns null on success.',
        inputSchema: {
            notes: noteIds('to tag'),
            tags: z.string().describe('Space-separated tags to add, e.g. "verbs chapter1".'),
        },
        annotations: additive(true),
        handler: ({ notes, tags }, anki) => anki.invoke('addTags', { notes, tags }),
    }),
    defineTool({
        name: 'remove_tags',
        title: 'Remove tags from notes',
        description:
            'Removes tags from notes (takes note IDs, not card IDs). `tags` is a single space-separated string. Returns null on success.',
        inputSchema: {
            notes: noteIds('to remove tags from'),
            tags: z.string().describe('Space-separated tags to remove, e.g. "verbs chapter1".'),
        },
        annotations: destructive(true),
        handler: ({ notes, tags }, anki) => anki.invoke('removeTags', { notes, tags }),
    }),
    defineTool({
        name: 'find_notes',
        title: 'Find notes',
        description:
            'Searches notes with Anki search syntax and returns NOTE IDs (use find_cards for card IDs). ' +
            'Returns {"ids": number[], "total": number, "truncated": boolean}: at most `limit` IDs (default 100), the total number of matches, and whether the list was cut. ' +
            'Narrow the query instead of raising the limit when possible. Pass the IDs to notes_info for details.',
        inputSchema: { query: searchQuery, limit: searchLimit },
        annotations: READ_ONLY,
        handler: async ({ query, limit }, anki) => limitIds(await anki.invoke<number[]>('findNotes', { query }), limit),
    }),
    defineTool({
        name: 'notes_info',
        title: 'Get note details',
        description:
            'Returns details for the given note IDs: noteId, modelName, tags, fields (value and order per field) and `cards` (the card IDs generated from each note). ' +
            'Unknown IDs yield empty objects.',
        inputSchema: { notes: noteIds('to look up') },
        annotations: READ_ONLY,
        handler: ({ notes }, anki) => anki.invoke('notesInfo', { notes }),
    }),
];
