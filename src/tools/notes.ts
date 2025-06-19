import { callAnkiConnect } from '../methods/anki.js';
import {
    Note,
    NoteInfo,
    NoteUpdate,
    AddNoteResponse,
    AddNotesResponse,
    CanAddNotesResponse,
    UpdateNoteFieldsResponse,
    AddTagsResponse,
    RemoveTagsResponse,
    FindNotesResponse,
    NotesInfoResponse,
    AnkiConnectRequest
} from '../types/anki';

/**
 * Creates a note using the given deck and model, with the provided field values and tags.
 * Returns the identifier of the created note on success, and null on failure.
 * @param note - Note object containing deck name, model name, fields, tags, and optional audio
 */
export async function addNote(note: Note): Promise<AddNoteResponse> {
    const request: AnkiConnectRequest = {
        action: 'addNote',
        version: 6,
        params: {
            note
        }
    };

    return await callAnkiConnect<number | null>(request);
}

/**
 * Creates multiple notes using the given deck and model, with the provided field values and tags.
 * Returns an array of identifiers of the created notes (notes that could not be created will have a null identifier).
 * @param notes - Array of note objects to create
 */
export async function addNotes(notes: Note[]): Promise<AddNotesResponse> {
    const request: AnkiConnectRequest = {
        action: 'addNotes',
        version: 6,
        params: {
            notes
        }
    };

    return await callAnkiConnect<(number | null)[]>(request);
}

/**
 * Accepts an array of objects which define parameters for candidate notes and returns an array of booleans
 * indicating whether or not the parameters at the corresponding index could be used to create a new note.
 * @param notes - Array of note objects to check
 */
export async function canAddNotes(notes: Note[]): Promise<CanAddNotesResponse> {
    const request: AnkiConnectRequest = {
        action: 'canAddNotes',
        version: 6,
        params: {
            notes
        }
    };

    return await callAnkiConnect<boolean[]>(request);
}

/**
 * Modify the fields of an existing note.
 * @param noteUpdate - Object containing note ID and fields to update
 */
export async function updateNoteFields(noteUpdate: NoteUpdate): Promise<UpdateNoteFieldsResponse> {
    const request: AnkiConnectRequest = {
        action: 'updateNoteFields',
        version: 6,
        params: {
            note: noteUpdate
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Adds tags to notes by note ID.
 * @param notes - Array of note IDs
 * @param tags - Space-separated string of tags to add
 */
export async function addTags(notes: number[], tags: string): Promise<AddTagsResponse> {
    const request: AnkiConnectRequest = {
        action: 'addTags',
        version: 6,
        params: {
            notes,
            tags
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Remove tags from notes by note ID.
 * @param notes - Array of note IDs
 * @param tags - Space-separated string of tags to remove
 */
export async function removeTags(notes: number[], tags: string): Promise<RemoveTagsResponse> {
    const request: AnkiConnectRequest = {
        action: 'removeTags',
        version: 6,
        params: {
            notes,
            tags
        }
    };

    return await callAnkiConnect<null>(request);
}


/**
 * Returns an array of note IDs for a given query. Same query syntax as guiBrowse.
 * @param query - Search query string
 */
export async function findNotes(query: string): Promise<FindNotesResponse> {
    const request: AnkiConnectRequest = {
        action: 'findNotes',
        version: 6,
        params: {
            query
        }
    };

    return await callAnkiConnect<number[]>(request);
}

/**
 * Returns a list of objects containing for each note ID the note fields, tags, note type and the cards belonging to the note.
 * @param notes - Array of note IDs to get information for
 */
export async function notesInfo(notes: number[]): Promise<NotesInfoResponse> {
    const request: AnkiConnectRequest = {
        action: 'notesInfo',
        version: 6,
        params: {
            notes
        }
    };

    return await callAnkiConnect<NoteInfo[]>(request);
}