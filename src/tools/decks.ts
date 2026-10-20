import { z } from 'zod';
import { READ_ONLY, additive, cardIds, defineTool, destructive, type ToolDefinition } from './define.js';

export const deckTools: ToolDefinition[] = [
    defineTool({
        name: 'deck_names',
        title: 'List decks',
        description: 'Returns the names of all decks, including subdecks written as "Parent::Child". Use it to get exact deck names before adding notes or searching with deck:.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('deckNames'),
    }),
    defineTool({
        name: 'deck_names_and_ids',
        title: 'List decks with IDs',
        description: 'Returns an object mapping every deck name to its deck ID.',
        inputSchema: {},
        annotations: READ_ONLY,
        handler: (_args, anki) => anki.invoke('deckNamesAndIds'),
    }),
    defineTool({
        name: 'get_decks',
        title: 'Get decks of cards',
        description: 'Takes card IDs (not note IDs) and returns an object mapping each deck name to the given card IDs that are in it.',
        inputSchema: { cards: cardIds('to look up') },
        annotations: READ_ONLY,
        handler: ({ cards }, anki) => anki.invoke('getDecks', { cards }),
    }),
    defineTool({
        name: 'change_deck',
        title: 'Move cards to deck',
        description:
            'Moves cards (card IDs, not note IDs) to the given deck; the deck is created if it does not exist. ' +
            'The cards leave their current decks, so the previous placement is lost. Returns null on success.',
        inputSchema: {
            cards: cardIds('to move'),
            deck: z.string().describe('Name of the target deck ("Parent::Child" for subdecks).'),
        },
        annotations: destructive(true),
        handler: ({ cards, deck }, anki) => anki.invoke('changeDeck', { cards, deck }),
    }),
    defineTool({
        name: 'delete_decks',
        title: 'Delete decks',
        description:
            'Deletes decks by name. WARNING: with cardsToo=true every card in those decks is permanently deleted as well; recent AnkiConnect versions require cardsToo=true and refuse otherwise. ' +
            'Cannot be undone through this API. Confirm with the user before calling. Returns null on success.',
        inputSchema: {
            decks: z.array(z.string()).describe('Names of the decks to delete.'),
            cardsToo: z.boolean().optional().describe('true deletes the cards in those decks as well.'),
        },
        annotations: destructive(true),
        handler: ({ decks, cardsToo }, anki) => anki.invoke('deleteDecks', { decks, cardsToo }),
    }),
    defineTool({
        name: 'get_deck_config',
        title: 'Get deck options',
        description: 'Returns the options group (configuration) used by the given deck: new card and review limits, learning steps, lapse settings and its config `id`.',
        inputSchema: { deck: z.string().describe('Deck name.') },
        annotations: READ_ONLY,
        handler: ({ deck }, anki) => anki.invoke('getDeckConfig', { deck }),
    }),
];

const deckConfig = z
    .object({
        lapse: z.object({
            leechFails: z.number(),
            delays: z.array(z.number()),
            minInt: z.number(),
            leechAction: z.number(),
            mult: z.number(),
        }).loose(),
        dyn: z.boolean(),
        autoplay: z.boolean(),
        mod: z.number(),
        id: z.number(),
        maxTaken: z.number(),
        new: z.object({
            bury: z.boolean(),
            order: z.number(),
            initialFactor: z.number(),
            perDay: z.number(),
            delays: z.array(z.number()),
            separate: z.boolean(),
            ints: z.array(z.number()),
        }).loose(),
        name: z.string(),
        rev: z.object({
            bury: z.boolean(),
            ivlFct: z.number(),
            ease4: z.number(),
            maxIvl: z.number(),
            perDay: z.number(),
            minSpace: z.number(),
            fuzz: z.number(),
        }).loose(),
        timer: z.number(),
        replayq: z.boolean(),
        usn: z.number(),
    })
    .loose()
    .describe('Full options group object as returned by get_deck_config, with your changes applied. Extra fields are passed through unchanged.');

/** Editing deck option groups affects scheduling of every deck that uses them, so it is opt-in. */
export const deckConfigTools: ToolDefinition[] = [
    defineTool({
        name: 'save_deck_config',
        title: 'Save deck options',
        description:
            'Overwrites an existing options group (matched by config.id) with the given object. Affects every deck using that group. ' +
            'Start from get_deck_config and change only what you need. Returns true on success, false if the config ID is invalid.',
        inputSchema: { config: deckConfig },
        annotations: destructive(true),
        handler: ({ config }, anki) => anki.invoke('saveDeckConfig', { config }),
    }),
    defineTool({
        name: 'set_deck_config_id',
        title: 'Assign deck options group',
        description: 'Makes the given decks use the options group with the given ID. Returns true on success, false if a deck or the config ID does not exist.',
        inputSchema: {
            decks: z.array(z.string()).describe('Deck names.'),
            configId: z.number().int().describe('Options group ID (the `id` from get_deck_config).'),
        },
        annotations: additive(true),
        handler: ({ decks, configId }, anki) => anki.invoke('setDeckConfigId', { decks, configId }),
    }),
    defineTool({
        name: 'clone_deck_config_id',
        title: 'Clone deck options group',
        description: 'Creates a new options group with the given name, copied from cloneFrom (or from the default group). Returns the new group ID, or false if cloneFrom does not exist.',
        inputSchema: {
            name: z.string().describe('Name of the new options group.'),
            cloneFrom: z.number().int().optional().describe('ID of the options group to copy; defaults to the default group.'),
        },
        annotations: additive(false),
        handler: ({ name, cloneFrom }, anki) => anki.invoke('cloneDeckConfigId', { name, cloneFrom }),
    }),
    defineTool({
        name: 'remove_deck_config_id',
        title: 'Delete deck options group',
        description: 'Deletes the options group with the given ID; decks using it fall back to the default group. Returns true on success, false if the ID does not exist.',
        inputSchema: { configId: z.number().int().describe('ID of the options group to delete.') },
        annotations: destructive(true),
        handler: ({ configId }, anki) => anki.invoke('removeDeckConfigId', { configId }),
    }),
];
