import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
    AnkiConnectError,
    AnkiConnectUnreachableError,
    configFromEnv,
    createAnkiClient,
    type AnkiClient,
} from './methods/anki.js';
import { ImageResult, ToolError, type ToolDefinition } from './tools/define.js';
import { noteTools } from './tools/notes.js';
import { mediaTools } from './tools/media.js';
import { cardTools } from './tools/cards.js';
import { deckConfigTools, deckTools } from './tools/decks.js';
import { modelTools } from './tools/models.js';
import { miscAdvancedTools, miscTools } from './tools/misc.js';
import { guiTools } from './tools/gui.js';

const SERVER_NAME = 'anki-connect-mcp';

const INSTRUCTIONS = `This server controls the user's local Anki collection through the AnkiConnect add-on. Anki must be running.

Search syntax (find_notes, find_cards, gui_browse) is the Anki browser syntax:
- deck:French (includes subdecks), deck:"My Deck" (quote names with spaces), deck:Parent::Child, deck:*
- tag:verbs, tag:lang::* ; plain words search all fields; front:dog searches one field
- is:due, is:new, is:review, is:suspended, added:1 (added today), added:7, rated:1, prop:ivl>=10
- combine with spaces (AND), "or", "-" for negation, parentheses for grouping, e.g. deck:French (tag:verbs or tag:nouns) -is:suspended
Searches return at most \`limit\` IDs (default 100) plus the total count and a truncated flag; narrow the query rather than raising the limit.

Note IDs vs card IDs: a note holds the field contents; Anki generates one or more cards from each note (e.g. "Basic (and reversed card)" gives two).
- Note tools take note IDs: notes_info, update_note_fields, add_tags, remove_tags. Get them from find_notes.
- Card tools take card IDs: cards_info, suspend, unsuspend, are_due, are_suspended, get_intervals, change_deck, get_decks. Get them from find_cards.
- Convert card IDs to note IDs with cards_to_notes; notes_info returns the card IDs of each note in its "cards" field.

Recommended flow for adding cards:
1. deck_names to get the exact deck name.
2. model_names, then model_field_names for the chosen model to get the exact field names.
3. can_add_notes to check the notes (false means duplicate, empty first field, or unknown deck/model).
4. add_notes (or add_note for a single note). Entries that come back null were not created.

Images, audio and video: add_note, add_notes and update_note_fields take \`picture\`, \`audio\` and \`video\` arrays of {source, filename?, fields}. \`source\` is an http(s) URL or an absolute path on the computer running Anki. Anki itself downloads or reads it, so a path must exist on that machine. The file is stored and appended to each listed field. To place an image inside text instead, call store_media_file and write \`<img src="NAME">\` with the returned NAME; Anki may rename files, so never assume the requested name. When the user pastes or attaches an image in the chat, you only see it; you cannot pass its bytes. Use source "clipboard": it reads the image currently copied on the user's computer, which is the screenshot they just pasted. If the result says the clipboard has no image, ask the user to copy it again. Use a data URL source only for base64 you received from another tool.

Tool errors: if a result is marked as an error, read its message. "AnkiConnect error: ..." means Anki rejected the request; "Could not reach AnkiConnect ..." means Anki is not running or the add-on is missing, so ask the user to start Anki instead of retrying in a loop; any other message describes a problem with your arguments (e.g. an unknown field name), so fix them and retry.`;

function readPackageVersion(): string {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    return pkg.version;
}

function isEnabled(value: string | undefined): boolean {
    return value !== undefined && ['1', 'true'].includes(value.trim().toLowerCase());
}

function textResult(text: string, isError = false): CallToolResult {
    return isError ? { isError: true, content: [{ type: 'text', text }] } : { content: [{ type: 'text', text }] };
}

/** The single place where tool output and failures are turned into MCP results. */
async function runTool(tool: ToolDefinition, args: unknown, anki: AnkiClient): Promise<CallToolResult> {
    try {
        const result = await tool.handler(args, anki);
        if (result instanceof ImageResult) {
            return { content: [{ type: 'image', data: result.data, mimeType: result.mimeType }] };
        }
        return textResult(JSON.stringify(result ?? null));
    } catch (error) {
        if (error instanceof AnkiConnectError) {
            return textResult(`AnkiConnect error: ${error.message}`, true);
        }
        if (error instanceof AnkiConnectUnreachableError) {
            return textResult(error.message, true);
        }
        if (error instanceof ToolError) {
            return textResult(error.message, true);
        }
        const message = error instanceof Error ? error.message : String(error);
        return textResult(`Unexpected error in ${tool.name}: ${message}`, true);
    }
}

export function createServer(): McpServer {
    const env = process.env;
    const anki = createAnkiClient(configFromEnv(env));

    const tools: ToolDefinition[] = [...miscTools, ...deckTools, ...modelTools, ...noteTools, ...mediaTools, ...cardTools];
    if (isEnabled(env.ANKI_MCP_ENABLE_GUI)) tools.push(...guiTools);
    if (isEnabled(env.ANKI_MCP_ENABLE_ADVANCED)) tools.push(...miscAdvancedTools, ...deckConfigTools);

    const server = new McpServer(
        { name: SERVER_NAME, version: readPackageVersion() },
        { instructions: INSTRUCTIONS },
    );

    for (const tool of tools) {
        server.registerTool(
            tool.name,
            {
                title: tool.title,
                description: tool.description,
                inputSchema: tool.inputSchema,
                annotations: { title: tool.title, ...tool.annotations },
            },
            (args: unknown) => runTool(tool, args, anki),
        );
    }

    return server;
}
