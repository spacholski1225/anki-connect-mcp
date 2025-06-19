import { callAnkiConnect } from '../methods/anki.js';
import {
    DeckNamesResponse,
    DeckNamesAndIdsResponse,
    GetDecksResponse,
    GetDeckConfigResponse,
    SaveDeckConfigResponse,
    SetDeckConfigIdResponse,
    CloneDeckConfigIdResponse,
    RemoveDeckConfigIdResponse,
    DeckConfig,
    AnkiConnectRequest,
    AnkiConnectResponse
} from '../types/anki';

/**
 * Get the complete list of deck names for the current user
 */
export async function deckNames(): Promise<DeckNamesResponse> {
    const request: AnkiConnectRequest = {
        action: 'deckNames',
        version: 6
    };

    return await callAnkiConnect<string[]>(request);
}

/**
 * Get the complete list of deck names and their respective IDs for the current user
 */
export async function deckNamesAndIds(): Promise<DeckNamesAndIdsResponse> {
    const request: AnkiConnectRequest = {
        action: 'deckNamesAndIds',
        version: 6
    };

    return await callAnkiConnect<Record<string, number>>(request);
}

/**
 * Accept an array of card IDs and return an object with each deck name as a key,
 * and its value an array of the given cards which belong to it
 * @param cards - Array of card IDs
 */
export async function getDecks(cards: number[]): Promise<GetDecksResponse> {
    const request: AnkiConnectRequest = {
        action: 'getDecks',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<Record<string, number[]>>(request);
}

/**
 * Move cards with the given IDs to a different deck, creating the deck if it doesn't exist yet
 * @param cards - Array of card IDs to move
 * @param deck - Name of the target deck
 */
export async function changeDeck(cards: number[], deck: string): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'changeDeck',
        version: 6,
        params: {
            cards,
            deck
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Delete decks with the given names
 * @param decks - Array of deck names to delete
 * @param cardsToo - If true, cards within deleted decks will also be deleted; otherwise moved to default deck
 */
export async function deleteDecks(decks: string[], cardsToo: boolean = false): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'deleteDecks',
        version: 6,
        params: {
            decks,
            cardsToo
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Get the configuration group object for the given deck
 * @param deck - Name of the deck
 */
export async function getDeckConfig(deck: string): Promise<GetDeckConfigResponse> {
    const request: AnkiConnectRequest = {
        action: 'getDeckConfig',
        version: 6,
        params: {
            deck
        }
    };

    return await callAnkiConnect<DeckConfig>(request);
}

/**
 * Save the given configuration group, returning true on success or false if the ID is invalid
 * @param config - Deck configuration object
 */
export async function saveDeckConfig(config: DeckConfig): Promise<SaveDeckConfigResponse> {
    const request: AnkiConnectRequest = {
        action: 'saveDeckConfig',
        version: 6,
        params: {
            config
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Change the configuration group for the given decks to the one with the given ID
 * @param decks - Array of deck names
 * @param configId - Configuration group ID
 */
export async function setDeckConfigId(decks: string[], configId: number): Promise<SetDeckConfigIdResponse> {
    const request: AnkiConnectRequest = {
        action: 'setDeckConfigId',
        version: 6,
        params: {
            decks,
            configId
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Create a new configuration group with the given name, cloning from the group with the given ID
 * @param name - Name for the new configuration group
 * @param cloneFrom - ID of the configuration group to clone from (optional, defaults to default group)
 */
export async function cloneDeckConfigId(name: string, cloneFrom?: number): Promise<CloneDeckConfigIdResponse> {
    const request: AnkiConnectRequest = {
        action: 'cloneDeckConfigId',
        version: 6,
        params: {
            name,
            ...(cloneFrom !== undefined && { cloneFrom })
        }
    };

    return await callAnkiConnect<number | false>(request);
}

/**
 * Remove the configuration group with the given ID
 * @param configId - ID of the configuration group to remove
 */
export async function removeDeckConfigId(configId: number): Promise<RemoveDeckConfigIdResponse> {
    const request: AnkiConnectRequest = {
        action: 'removeDeckConfigId',
        version: 6,
        params: {
            configId
        }
    };

    return await callAnkiConnect<boolean>(request);
}