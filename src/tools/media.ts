import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { AnkiConnectError, type AnkiClient } from '../methods/anki.js';
import type { NoteInfo } from '../types/anki/index.js';
import {
    READ_ONLY,
    ImageResult,
    ToolError,
    additive,
    defineTool,
    destructive,
    limitResults,
    searchLimit,
    type ToolDefinition,
} from './define.js';

const MEDIA_TIMEOUT_MS = 120_000; // AnkiConnect replies only after downloading/reading the file
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // larger images are described, not returned, to protect the agent's context
const IMAGE_MIME: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
};
const MEDIA_EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};

const mediaSource = {
    source: z
        .string()
        .min(1)
        .describe(
            'Where the file comes from: an http(s) URL (Anki downloads it); an absolute path on the computer running Anki (Anki reads it); "clipboard" for the image currently copied on the computer running this server, e.g. a screenshot the user just pasted into the chat; or a base64 data URL ("data:image/png;base64,..."), only for base64 you already have from another tool. Never try to write out the bytes of an image you can only see.',
        ),
    filename: z
        .string()
        .min(1)
        .optional()
        .describe(
            'Name to store the file under in the Anki media folder. Defaults to the last segment of a URL or path, or "pasted-<hash>.<ext>" for clipboard and data URLs. Anki may still rename it; the actual name is what gets used.',
        ),
};

const mediaFilename = z.string().min(1).describe('File name in the media folder.');

const CLIPBOARD_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const CLIPBOARD_TIMEOUT_MS = 5_000;
const CLIPBOARD_MAX_BYTES = 64 * 1024 * 1024;
const NO_CLIPBOARD_IMAGE =
    'The clipboard does not contain an image. Ask the user to copy the screenshot again (e.g. Ctrl+C or PrtSc) and retry.';
const execFileAsync = promisify(execFile);

/** Reads the image on the system clipboard of the machine running this server (Linux: wl-paste on Wayland, xclip on X11). */
async function readClipboardImage(): Promise<{ bytes: Buffer; mime: string }> {
    if (process.platform !== 'linux') {
        throw new ToolError(
            'Reading the clipboard is only supported on Linux. Save the image to a file and pass its absolute path as "source".',
        );
    }
    const wayland = Boolean(process.env.WAYLAND_DISPLAY);
    const [command, pkg] = wayland ? ['wl-paste', 'wl-clipboard'] : ['xclip', 'xclip'];
    const listArgs = wayland ? ['--list-types'] : ['-selection', 'clipboard', '-t', 'TARGETS', '-o'];
    const options = { encoding: 'buffer' as const, timeout: CLIPBOARD_TIMEOUT_MS, maxBuffer: CLIPBOARD_MAX_BYTES };

    let types: string[] = [];
    try {
        const { stdout } = await execFileAsync(command, listArgs, options);
        types = stdout
            .toString('utf8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new ToolError(`Reading the clipboard needs ${pkg}; install it on the computer running this server.`);
        }
        // A non-zero exit (e.g. an empty clipboard) means no types.
    }
    const mime = CLIPBOARD_IMAGE_TYPES.find((type) => types.includes(type));
    if (mime === undefined) throw new ToolError(NO_CLIPBOARD_IMAGE);

    let bytes: Buffer;
    try {
        const readArgs = wayland ? ['--no-newline', '--type', mime] : ['-selection', 'clipboard', '-t', mime, '-o'];
        ({ stdout: bytes } = await execFileAsync(command, readArgs, options));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
            throw new ToolError(`The clipboard image is larger than ${CLIPBOARD_MAX_BYTES / 1024 / 1024} MB.`);
        }
        throw new ToolError(`Could not read the clipboard: ${(error as Error).message}`);
    }
    // Some screenshot tools advertise an image but hand it over lazily; empty output means no image.
    if (bytes.length === 0) throw new ToolError(NO_CLIPBOARD_IMAGE);
    return { bytes, mime };
}

/** Content-addressed name for clipboard and data-URL files, so the same image is stored once. */
function pastedName(bytes: Buffer, mime: string, description: string): string {
    const ext = MEDIA_EXT[mime];
    if (ext === undefined) throw new ToolError(`Cannot derive a file name for ${description}; pass "filename".`);
    return `pasted-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.${ext}`;
}

/**
 * Resolves a media source to storeMediaFile params plus a short description for error messages.
 * Reads the clipboard for "clipboard"; never contacts Anki. Always sends deleteExisting:false so a file other cards use is never replaced.
 */
async function resolveSource({
    source,
    filename,
}: {
    source: string;
    filename?: string;
}): Promise<{ params: Record<string, unknown>; origin: string }> {
    if (source === 'clipboard') {
        const { bytes, mime } = await readClipboardImage();
        const name = filename ?? pastedName(bytes, mime, `clipboard content of type "${mime}"`);
        return { params: { filename: name, data: bytes.toString('base64'), deleteExisting: false }, origin: 'clipboard' };
    }
    if (/^data:/i.test(source)) {
        const match = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/is.exec(source);
        const mime = match?.[1]?.toLowerCase() ?? '';
        const isBase64 = (match?.[2] ?? '').split(';').some((param) => param.toLowerCase() === 'base64');
        if (match === null || !isBase64) throw new ToolError('Data URLs must be base64, e.g. "data:image/png;base64,iVBOR...".');
        const payload = match[3]!.replace(/\s+/g, '');
        // The payload never goes into error text: it can be huge.
        if (payload === '' || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 !== 0) {
            throw new ToolError('The data URL payload is not valid base64.');
        }
        const bytes = Buffer.from(payload, 'base64');
        const name = filename ?? pastedName(bytes, mime, `a data URL of type "${mime || 'unknown'}"`);
        return {
            params: { filename: name, data: payload, deleteExisting: false },
            origin: `data:${mime || 'unknown'};base64 (${bytes.length} bytes)`,
        };
    }
    const isUrl = /^https?:\/\//i.test(source);
    let name = filename;
    if (name === undefined) {
        if (isUrl) {
            let url: URL;
            try {
                url = new URL(source);
            } catch {
                throw new ToolError(`"${source}" is not a valid URL.`);
            }
            const segment = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);
            try {
                name = decodeURIComponent(segment);
            } catch {
                name = segment;
            }
        } else {
            // Windows paths are possible on the Anki host.
            name = source.split(/[/\\]/).pop() ?? '';
        }
        if (name === '') throw new ToolError(`Cannot derive a file name from "${source}"; pass "filename".`);
    }
    const params = isUrl
        ? { filename: name, url: source, deleteExisting: false }
        : { filename: name, path: source, deleteExisting: false };
    return { params, origin: source };
}

/** Returns the name Anki actually stored the file under, which can differ from the requested one. */
function storeFile(anki: AnkiClient, params: Record<string, unknown>): Promise<string> {
    return anki.invoke<string>('storeMediaFile', params, { timeoutMs: MEDIA_TIMEOUT_MS });
}

export const mediaTools: ToolDefinition[] = [
    defineTool({
        name: 'store_media_file',
        title: 'Store media file',
        description:
            'Stores a file in Anki\'s media folder and returns the name Anki stored it under, which can differ from the requested name. ' +
            'Always use the returned NAME: put `<img src="NAME">` (images) or `[sound:NAME]` (audio/video) into a note field. ' +
            'Never overwrites an existing file. ' +
            'To attach media while creating or updating a note, prefer the `picture`/`audio`/`video` params of add_note, add_notes and update_note_fields. ' +
            '`source` may be "clipboard" for the image the user just copied or pasted.',
        inputSchema: { ...mediaSource },
        // Storing identical content again returns the same name.
        annotations: additive(true),
        handler: async (args, anki) => storeFile(anki, (await resolveSource(args)).params),
    }),
    defineTool({
        name: 'get_media_files_names',
        title: 'List media files',
        description:
            'Lists file names in Anki\'s media folder matching `pattern`. ' +
            'Returns {"names": string[], "total": number, "truncated": boolean} with at most `limit` names (default 100). ' +
            'Use it to check whether a file already exists.',
        inputSchema: {
            pattern: z.string().optional().describe('Glob over file names, e.g. "cat*" or "*.png". Default "*".'),
            limit: searchLimit,
        },
        annotations: READ_ONLY,
        handler: async ({ pattern, limit }, anki) =>
            limitResults('names', await anki.invoke<string[]>('getMediaFilesNames', { pattern }), limit),
    }),
    defineTool({
        name: 'retrieve_media_file',
        title: 'Get media file',
        description:
            'Returns a file from Anki\'s media folder. ' +
            'PNG, JPEG, GIF and WebP images up to 5 MB come back as an image you can see; ' +
            'anything else (audio, video, SVG, larger images) returns {"filename", "bytes"}. ' +
            'Fails if the file does not exist.',
        inputSchema: { filename: mediaFilename },
        annotations: READ_ONLY,
        handler: async ({ filename }, anki) => {
            const data = await anki.invoke<string | false>('retrieveMediaFile', { filename }, { timeoutMs: MEDIA_TIMEOUT_MS });
            if (data === false) throw new ToolError(`Media file "${filename}" was not found.`);
            const bytes = Buffer.byteLength(data, 'base64');
            // SVG is excluded on purpose: MCP clients' vision input does not accept it.
            const mime = IMAGE_MIME[filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()];
            return mime && bytes <= MAX_IMAGE_BYTES ? new ImageResult(data, mime) : { filename, bytes };
        },
    }),
    defineTool({
        name: 'delete_media_file',
        title: 'Delete media file',
        description:
            'Moves a file from Anki\'s media folder to the trash. Cards that still reference it show a broken image or play nothing. ' +
            'Confirm with the user before deleting a file that notes may use. Returns null.',
        inputSchema: { filename: mediaFilename },
        annotations: destructive(true),
        handler: async ({ filename }, anki) => anki.invoke('deleteMediaFile', { filename }),
    }),
    defineTool({
        name: 'get_media_dir_path',
        title: 'Get media folder path',
        description: 'Returns the absolute path of Anki\'s media folder (collection.media) on the computer running Anki.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: async (_args, anki) => anki.invoke('getMediaDirPath'),
    }),
];

const mediaItem = z.object({
    ...mediaSource,
    fields: z.array(z.string()).min(1).describe('Names of the note fields to append the file to.'),
});
type MediaItem = z.infer<typeof mediaItem>;
const MEDIA_KINDS = ['picture', 'audio', 'video'] as const;
type MediaKind = (typeof MEDIA_KINDS)[number];
type WithMedia = Partial<Record<MediaKind, MediaItem[]>>;
type NewNote = { modelName: string; fields: Record<string, string> } & WithMedia;
const TAG: Record<MediaKind, (name: string) => string> = {
    picture: (name) => `<img src="${name}">`, // Anki strips quotes and angle brackets from stored names, so no escaping needed
    audio: (name) => `[sound:${name}]`,
    video: (name) => `[sound:${name}]`,
};

/** Input params that let add_note, add_notes and update_note_fields attach media. */
export const mediaAttachments = {
    picture: z.array(mediaItem).optional().describe('Images to store and show in the given fields (appended as <img>).'),
    audio: z.array(mediaItem).optional().describe('Audio files to store and play from the given fields (appended as [sound:...]).'),
    video: z.array(mediaItem).optional().describe('Video files to store and play from the given fields (appended as [sound:...]).'),
};

/** Stores the note's media and returns the note for addNote: media keys removed, tags appended to the target fields. */
export async function prepareNote<T extends NewNote>(anki: AnkiClient, note: T): Promise<Omit<T, MediaKind>> {
    const [prepared] = await prepareNewNotes(anki, [note], () => '');
    return prepared!;
}

/** Same for addNotes. Every note is validated before any file is stored; errors name the note as "notes[i].". */
export async function prepareNotes<T extends NewNote>(anki: AnkiClient, notes: T[]): Promise<Omit<T, MediaKind>[]> {
    return prepareNewNotes(anki, notes, (i) => `notes[${i}].`);
}

/** Stores media for an existing note and returns the payload for updateNoteFields. A target not being overwritten is appended to its current value. */
export async function prepareNoteUpdate(
    anki: AnkiClient,
    update: { id: number; fields?: Record<string, string> } & WithMedia,
): Promise<{ id: number; fields: Record<string, string> }> {
    const { id, fields = {} } = update;
    if (!MEDIA_KINDS.some((kind) => update[kind]?.length)) return { id, fields };
    const [info] = await anki.invoke<Partial<NoteInfo>[]>('notesInfo', { notes: [id] });
    if (info?.modelName === undefined || info.fields === undefined) throw new ToolError(`Note ${id} was not found.`);
    const current = Object.fromEntries(Object.entries(info.fields).map(([name, field]) => [name, field.value]));
    // No canonicalisation: updateNoteFields matches field names exactly.
    const [attached] = await attach(anki, [
        { prefix: '', modelName: info.modelName, allowed: Object.keys(info.fields), fields, current, media: update },
    ]);
    return { id, fields: attached! };
}

interface AttachJob {
    /** Prepended to error labels, e.g. "notes[2].". */
    prefix: string;
    modelName: string;
    /** Field names the targets must match exactly. */
    allowed: string[];
    /** Field values being sent; tags are appended here. */
    fields: Record<string, string>;
    /** Values already in the note, used for targets not in `fields`. */
    current: Record<string, string>;
    media: WithMedia;
}

function withoutMedia<T extends WithMedia>(note: T): Omit<T, MediaKind> {
    const rest: WithMedia = { ...note };
    for (const kind of MEDIA_KINDS) delete rest[kind];
    return rest as Omit<T, MediaKind>;
}

/** addNote matches field names case-insensitively, so "back" plus an appended "Back" would silently lose one value. */
function canonicalise(fields: Record<string, string>, modelFields: string[]): Record<string, string> {
    const byLower = new Map(modelFields.map((name) => [name.toLowerCase(), name]));
    return Object.fromEntries(Object.entries(fields).map(([name, value]) => [byLower.get(name.toLowerCase()) ?? name, value]));
}

async function prepareNewNotes<T extends NewNote>(
    anki: AnkiClient,
    notes: T[],
    prefix: (i: number) => string,
): Promise<Omit<T, MediaKind>[]> {
    const prepared = notes.map(withoutMedia);
    const modelFields = new Map<string, string[]>();
    const jobs: AttachJob[] = [];
    const jobNotes: number[] = [];
    for (const [i, note] of notes.entries()) {
        if (!MEDIA_KINDS.some((kind) => note[kind]?.length)) continue;
        let allowed = modelFields.get(note.modelName);
        if (allowed === undefined) {
            allowed = await anki.invoke<string[]>('modelFieldNames', { modelName: note.modelName });
            modelFields.set(note.modelName, allowed);
        }
        const fields = canonicalise(note.fields, allowed);
        jobs.push({ prefix: prefix(i), modelName: note.modelName, allowed, fields, current: {}, media: note });
        jobNotes.push(i);
    }
    const attached = await attach(anki, jobs);
    jobNotes.forEach((noteIndex, j) => {
        prepared[noteIndex] = { ...prepared[noteIndex]!, fields: attached[j]! };
    });
    return prepared;
}

/** One media item, validated and resolved in phase 1, ready to store in phase 2. */
interface PlannedItem {
    kind: MediaKind;
    label: string;
    /** Short description of the source for error messages; never the base64 payload. */
    origin: string;
    targets: string[];
    params: Record<string, unknown>;
}

/** Validates every job, then stores the files and returns each job's fields with the tags appended. */
async function attach(anki: AnkiClient, jobs: AttachJob[]): Promise<Record<string, string>[]> {
    // Phase 1: validate everything before storing anything. Reading the clipboard here is safe: it has no Anki side effects.
    const plans: PlannedItem[][] = [];
    for (const job of jobs) {
        const plan: PlannedItem[] = [];
        for (const kind of MEDIA_KINDS) {
            for (const [j, item] of (job.media[kind] ?? []).entries()) {
                const label = `${job.prefix}${kind}[${j}]`;
                const targets = [...new Set(item.fields)];
                for (const target of targets) {
                    if (!job.allowed.includes(target)) {
                        throw new ToolError(
                            `${label}: "${target}" is not a field of model "${job.modelName}". Fields: ${job.allowed.join(', ')}.`,
                        );
                    }
                }
                try {
                    const { origin, params } = await resolveSource(item);
                    plan.push({ kind, label, origin, targets, params });
                } catch (error) {
                    if (error instanceof ToolError) throw new ToolError(`${label}: ${error.message}`);
                    throw error;
                }
            }
        }
        plans.push(plan);
    }

    // Phase 2: store sequentially and append. Files already stored stay when a later step fails:
    // the stored name may be a pre-existing identical file other cards use, and Anki's Check Media removes unused files.
    const results: Record<string, string>[] = [];
    for (const [i, job] of jobs.entries()) {
        const out = { ...job.fields };
        for (const { kind, label, origin, targets, params } of plans[i]!) {
            let name: string;
            try {
                name = await storeFile(anki, params);
            } catch (error) {
                if (error instanceof AnkiConnectError) throw new AnkiConnectError(`${label} (${origin}): ${error.message}`);
                throw error;
            }
            const tag = TAG[kind](name);
            for (const target of targets) {
                const prev = out[target] ?? job.current[target] ?? '';
                out[target] = prev ? `${prev}<br>${tag}` : tag;
            }
        }
        results.push(out);
    }
    return results;
}
