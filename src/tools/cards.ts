import { callAnkiConnect } from '../methods/anki.js';
import {
    CardInfo,
    FindCardsResponse,
    CardsInfoResponse,
    CardsToNotesResponse,
    SuspendResponse,
    AreSuspendedResponse,
    AreDueResponse,
    GetIntervalsResponse,
    AnkiConnectRequest
} from '../types/anki';

/**
 * Suspend cards by card ID; returns true if successful (at least one card wasn't already suspended) or false otherwise.
 * @param cards - Array of card IDs to suspend
 */
export async function suspend(cards: number[]): Promise<SuspendResponse> {
    const request: AnkiConnectRequest = {
        action: 'suspend',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Unsuspend cards by card ID; returns true if successful (at least one card was previously suspended) or false otherwise.
 * @param cards - Array of card IDs to unsuspend
 */
export async function unsuspend(cards: number[]): Promise<SuspendResponse> {
    const request: AnkiConnectRequest = {
        action: 'unsuspend',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Returns an array indicating whether each of the given cards is suspended (in the same order).
 * @param cards - Array of card IDs to check
 */
export async function areSuspended(cards: number[]): Promise<AreSuspendedResponse> {
    const request: AnkiConnectRequest = {
        action: 'areSuspended',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<boolean[]>(request);
}

/**
 * Returns an array indicating whether each of the given cards is due (in the same order).
 * Note: cards in the learning queue with a large interval (over 20 minutes) are treated as not due 
 * until the time of their interval has passed, to match the way Anki treats them when reviewing.
 * @param cards - Array of card IDs to check
 */
export async function areDue(cards: number[]): Promise<AreDueResponse> {
    const request: AnkiConnectRequest = {
        action: 'areDue',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<boolean[]>(request);
}

/**
 * Returns an array of the most recent intervals for each given card ID, or a 2-dimensional array 
 * of all the intervals for each given card ID when complete is true. 
 * Negative intervals are in seconds and positive intervals in days.
 * @param cards - Array of card IDs to get intervals for
 * @param complete - If true, returns all intervals; if false, returns only the most recent interval
 */
export async function getIntervals(cards: number[], complete?: boolean): Promise<GetIntervalsResponse> {
    const request: AnkiConnectRequest = {
        action: 'getIntervals',
        version: 6,
        params: {
            cards,
            ...(complete !== undefined && { complete })
        }
    };

    return await callAnkiConnect<number[] | number[][]>(request);
}

/**
 * Returns an array of card IDs for a given query. Functionally identical to guiBrowse but doesn't use the GUI for better performance.
 * @param query - Search query string
 */
export async function findCards(query: string): Promise<FindCardsResponse> {
    const request: AnkiConnectRequest = {
        action: 'findCards',
        version: 6,
        params: {
            query
        }
    };

    return await callAnkiConnect<number[]>(request);
}

/**
 * Returns an unordered array of note IDs for the given card IDs. 
 * For cards with the same note, the ID is only given once in the array.
 * @param cards - Array of card IDs to convert to note IDs
 */
export async function cardsToNotes(cards: number[]): Promise<CardsToNotesResponse> {
    const request: AnkiConnectRequest = {
        action: 'cardsToNotes',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<number[]>(request);
}

/**
 * Returns a list of objects containing for each card ID the card fields, front and back sides including CSS, 
 * note type, the note that the card belongs to, and deck name, as well as ease and interval.
 * @param cards - Array of card IDs to get information for
 */
export async function cardsInfo(cards: number[]): Promise<CardsInfoResponse> {
    const request: AnkiConnectRequest = {
        action: 'cardsInfo',
        version: 6,
        params: {
            cards
        }
    };

    return await callAnkiConnect<CardInfo[]>(request);
}