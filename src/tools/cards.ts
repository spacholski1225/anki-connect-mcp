import { z } from 'zod';
import {
    READ_ONLY,
    additive,
    cardIds,
    defineTool,
    limitResults,
    searchLimit,
    searchQuery,
    type ToolDefinition,
} from './define.js';

const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;

function stripStyles(html: unknown): unknown {
    return typeof html === 'string' ? html.replace(STYLE_BLOCK, '') : html;
}

/** Drops the model CSS from card info: it is identical for every card and only fills the context. */
function slimCardInfo(card: unknown): unknown {
    if (typeof card !== 'object' || card === null) return card;
    const { css: _css, ...rest } = card as Record<string, unknown>;
    return { ...rest, question: stripStyles(rest.question), answer: stripStyles(rest.answer) };
}

export const cardTools: ToolDefinition[] = [
    defineTool({
        name: 'find_cards',
        title: 'Find cards',
        description:
            'Searches cards with Anki search syntax and returns CARD IDs (use find_notes for note IDs). ' +
            'Returns {"ids": number[], "total": number, "truncated": boolean}: at most `limit` IDs (default 100), the total number of matches, and whether the list was cut. ' +
            'Narrow the query instead of raising the limit when possible. Pass the IDs to cards_info for details.',
        inputSchema: { query: searchQuery, limit: searchLimit },
        annotations: READ_ONLY,
        handler: async ({ query, limit }, anki) => limitResults('ids', await anki.invoke<number[]>('findCards', { query }), limit),
    }),
    defineTool({
        name: 'cards_info',
        title: 'Get card details',
        description:
            'Returns details for the given card IDs: cardId, note (note ID), deckName, modelName, fields, rendered question and answer HTML (CSS removed), ' +
            'interval, due, queue, type, reps, lapses and more. Unknown IDs yield empty objects. Keep the ID list short; the output is large.',
        inputSchema: { cards: cardIds('to look up') },
        annotations: READ_ONLY,
        handler: async ({ cards }, anki) => {
            const result = await anki.invoke<unknown[]>('cardsInfo', { cards });
            return Array.isArray(result) ? result.map(slimCardInfo) : result;
        },
    }),
    defineTool({
        name: 'cards_to_notes',
        title: 'Convert card IDs to note IDs',
        description:
            'Returns the unique note IDs that the given cards belong to (one note can have several cards). Use it before note tools such as add_tags or update_note_fields when you only have card IDs.',
        inputSchema: { cards: cardIds('to convert') },
        annotations: READ_ONLY,
        handler: ({ cards }, anki) => anki.invoke('cardsToNotes', { cards }),
    }),
    defineTool({
        name: 'suspend',
        title: 'Suspend cards',
        description:
            'Suspends cards so they are not shown in reviews (reversible with unsuspend). Returns true if at least one card was not already suspended, false otherwise.',
        inputSchema: { cards: cardIds('to suspend') },
        annotations: additive(true),
        handler: ({ cards }, anki) => anki.invoke('suspend', { cards }),
    }),
    defineTool({
        name: 'unsuspend',
        title: 'Unsuspend cards',
        description:
            'Unsuspends cards so they return to reviews. Returns true if at least one card was suspended before, false otherwise.',
        inputSchema: { cards: cardIds('to unsuspend') },
        annotations: additive(true),
        handler: ({ cards }, anki) => anki.invoke('unsuspend', { cards }),
    }),
    defineTool({
        name: 'are_suspended',
        title: 'Check whether cards are suspended',
        description:
            'Returns an array of booleans (same order as input) telling whether each card is suspended; null for unknown card IDs.',
        inputSchema: { cards: cardIds('to check') },
        annotations: READ_ONLY,
        handler: ({ cards }, anki) => anki.invoke('areSuspended', { cards }),
    }),
    defineTool({
        name: 'are_due',
        title: 'Check whether cards are due',
        description:
            'Returns an array of booleans (same order as input) telling whether each card is due for review now. ' +
            'Learning cards with an interval over 20 minutes count as not due until that time has passed.',
        inputSchema: { cards: cardIds('to check') },
        annotations: READ_ONLY,
        handler: ({ cards }, anki) => anki.invoke('areDue', { cards }),
    }),
    defineTool({
        name: 'get_intervals',
        title: 'Get card intervals',
        description:
            'Returns review intervals per card (same order as input). Negative values are in seconds, positive values in days. ' +
            'With complete=true returns the full interval history per card as arrays; otherwise only the most recent interval.',
        inputSchema: {
            cards: cardIds('to get intervals for'),
            complete: z.boolean().optional().describe('true: full history per card; false/omitted: only the latest interval.'),
        },
        annotations: READ_ONLY,
        handler: ({ cards, complete }, anki) => anki.invoke('getIntervals', { cards, complete }),
    }),
];
