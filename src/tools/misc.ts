import { z } from 'zod';
import { READ_ONLY, defineTool, destructive, type ToolDefinition } from './define.js';

export const miscTools: ToolDefinition[] = [
    defineTool({
        name: 'version',
        title: 'AnkiConnect version',
        description: 'Returns the AnkiConnect API version number (e.g. 6). Cheap way to check that Anki is running and reachable.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('version'),
    }),
    defineTool({
        name: 'get_tags',
        title: 'List tags',
        description: 'Returns every tag used in the collection, as an array of strings.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('getTags'),
    }),
];

/** Raw or risky AnkiConnect operations; opt-in only. */
export const miscAdvancedTools: ToolDefinition[] = [
    defineTool({
        name: 'multi',
        title: 'Run raw AnkiConnect actions',
        description:
            'Runs several raw AnkiConnect actions in one request and returns an array with one {result, error} object per action. ' +
            'Bypasses the safety of the dedicated tools: any action, including deleting notes, can be sent. Prefer the specific tools.',
        inputSchema: {
            actions: z
                .array(z.object({
                    action: z.string().describe('AnkiConnect action name, e.g. "deckNames".'),
                    version: z.number().describe('API version, normally 6.'),
                    params: z.record(z.string(), z.any()).optional().describe('Action parameters.'),
                }))
                .describe('AnkiConnect requests to execute in order.'),
        },
        annotations: destructive(false),
        handler: ({ actions }, anki) => anki.invoke('multi', { actions }),
    }),
    defineTool({
        name: 'upgrade',
        title: 'Upgrade AnkiConnect',
        description: 'Asks AnkiConnect to upgrade itself to the latest version, which shows a dialog in Anki and may need a restart. Returns true if the upgrade succeeded.',
        inputSchema: {},
        annotations: destructive(false),
        handler: (_args, anki) => anki.invoke('upgrade'),
    }),
];
