import { z } from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { AnkiClient } from '../methods/anki.js';

/** A declarative tool: everything the server needs to register it. */
export interface ToolDefinition {
    name: string;
    title: string;
    description: string;
    inputSchema: z.ZodRawShape;
    annotations: ToolAnnotations;
    /** Returns the value sent to the agent: an ImageResult becomes image content, anything else is JSON-serialised. Throws on failure. */
    handler: (args: any, anki: AnkiClient) => Promise<unknown>;
}

/** A problem with the agent's request; runTool returns its message verbatim as the tool error. */
export class ToolError extends Error {
    override name = 'ToolError';
}

/** Returned by a handler to send an image the agent can see instead of JSON text. */
export class ImageResult {
    constructor(readonly data: string, readonly mimeType: string) {}
}

export function defineTool<S extends z.ZodRawShape>(tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: S;
    annotations: ToolAnnotations;
    handler: (args: z.infer<z.ZodObject<S>>, anki: AnkiClient) => Promise<unknown>;
}): ToolDefinition {
    return tool;
}

/** Only reads data from Anki. */
export const READ_ONLY: ToolAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
};

/** Changes data or UI state, but does not remove or overwrite anything. */
export function additive(idempotent: boolean): ToolAnnotations {
    return { readOnlyHint: false, destructiveHint: false, idempotentHint: idempotent, openWorldHint: false };
}

/** Removes or overwrites data, or otherwise has effects that are hard to undo. */
export function destructive(idempotent: boolean): ToolAnnotations {
    return { readOnlyHint: false, destructiveHint: true, idempotentHint: idempotent, openWorldHint: false };
}

export const DEFAULT_SEARCH_LIMIT = 100;

export const searchQuery = z
    .string()
    .describe('Anki search query, same syntax as the Anki browser, e.g. `deck:"My Deck" tag:verbs is:due`. Use `deck:*` to match everything.');

export const searchLimit = z
    .number()
    .int()
    .positive()
    .optional()
    .describe(`Maximum number of results to return (default ${DEFAULT_SEARCH_LIMIT}).`);

/** Caps a list result so it does not flood the agent's context. */
export function limitResults<K extends string, T>(key: K, items: T[], limit: number = DEFAULT_SEARCH_LIMIT) {
    return { [key]: items.slice(0, limit), total: items.length, truncated: items.length > limit } as Record<K, T[]> & {
        total: number;
        truncated: boolean;
    };
}

export const cardIds =(what: string) =>
    z.array(z.number().int()).describe(`Card IDs ${what} (card IDs, not note IDs; get them from find_cards or notes_info).`);

export const noteIds = (what: string) =>
    z.array(z.number().int()).describe(`Note IDs ${what} (note IDs, not card IDs; get them from find_notes or cards_to_notes).`);
