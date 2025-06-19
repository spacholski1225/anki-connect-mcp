import { AnkiConnectResponse } from './base';

/**
 * Audio attachment for notes
 */
export interface NoteAudio {
    url: string;
    filename: string;
    skipHash?: string;
    fields: string;
}

/**
 * Note structure for creating notes
 */
export interface Note {
    deckName: string;
    modelName: string;
    fields: Record<string, string>;
    tags?: string[];
    audio?: NoteAudio;
}

/**
 * Note information structure
 */
export interface NoteInfo {
    noteId: number;
    modelName: string;
    tags: string[];
    fields: Record<string, {
        value: string;
        order: number;
    }>;
}

/**
 * Note update structure
 */
export interface NoteUpdate {
    id: number;
    fields: Record<string, string>;
}

/**
 * Response for adding a single note
 */
export interface AddNoteResponse extends AnkiConnectResponse<number | null> {
    result: number | null; // note ID if successful, null if failed
}

/**
 * Response for adding multiple notes
 */
export interface AddNotesResponse extends AnkiConnectResponse<(number | null)[]> {
    result: (number | null)[]; // array of note IDs, null for failed notes
}

/**
 * Response for checking if notes can be added
 */
export interface CanAddNotesResponse extends AnkiConnectResponse<boolean[]> {
    result: boolean[];
}

/**
 * Response for updating note fields
 */
export interface UpdateNoteFieldsResponse extends AnkiConnectResponse<null> {
    result: null;
}

/**
 * Response for adding tags to notes
 */
export interface AddTagsResponse extends AnkiConnectResponse<null> {
    result: null;
}

/**
 * Response for removing tags from notes
 */
export interface RemoveTagsResponse extends AnkiConnectResponse<null> {
    result: null;
}


/**
 * Response for finding notes
 */
export interface FindNotesResponse extends AnkiConnectResponse<number[]> {
    result: number[]; // array of note IDs
}

/**
 * Response for getting notes information
 */
export interface NotesInfoResponse extends AnkiConnectResponse<NoteInfo[]> {
    result: NoteInfo[];
}