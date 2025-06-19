import { callAnkiConnect } from '../methods/anki.js';
import {
    AnkiConnectRequest,
    AnkiConnectResponse
} from '../types/anki';

/**
 * GUI Browse Response - returns array of card IDs
 */
export interface GuiBrowseResponse extends AnkiConnectResponse<number[]> {
    result: number[];
}

/**
 * GUI Current Card Response - returns current card info or null
 */
export interface GuiCurrentCardResponse extends AnkiConnectResponse<{
    answer: string;
    question: string;
    deckName: string;
    modelName: string;
    fieldOrder: number;
    fields: Record<string, { value: string; order: number }>;
    cardId: number;
    buttons: number[];
} | null> {
    result: {
        answer: string;
        question: string;
        deckName: string;
        modelName: string;
        fieldOrder: number;
        fields: Record<string, { value: string; order: number }>;
        cardId: number;
        buttons: number[];
    } | null;
}

/**
 * Invokes the Card Browser dialog and searches for a given query.
 * Returns an array of identifiers of the cards that were found.
 * @param query - Search query for browsing cards
 */
export async function guiBrowse(query: string): Promise<GuiBrowseResponse> {
    const request: AnkiConnectRequest = {
        action: 'guiBrowse',
        version: 5,
        params: {
            query
        }
    };

    return await callAnkiConnect<number[]>(request);
}

/**
 * Invokes the Add Cards dialog.
 */
export async function guiAddCards(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiAddCards',
        version: 5
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Returns information about the current card or null if not in review mode.
 */
export async function guiCurrentCard(): Promise<GuiCurrentCardResponse> {
    const request: AnkiConnectRequest = {
        action: 'guiCurrentCard',
        version: 5
    };

    return await callAnkiConnect(request);
}

/**
 * Starts or resets the timerStarted value for the current card.
 * This is useful for deferring the start time to when it is displayed via the API,
 * allowing the recorded time taken to answer the card to be more accurate when calling guiAnswerCard.
 */
export async function guiStartCardTimer(): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiStartCardTimer',
        version: 5
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Shows question text for the current card; returns true if in review mode or false otherwise.
 */
export async function guiShowQuestion(): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiShowQuestion',
        version: 5
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Shows answer text for the current card; returns true if in review mode or false otherwise.
 */
export async function guiShowAnswer(): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiShowAnswer',
        version: 5
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Answers the current card; returns true if succeeded or false otherwise.
 * Note that the answer for the current card must be displayed before any answer can be accepted by Anki.
 * @param ease - Answer ease (1-4: Again, Hard, Good, Easy)
 */
export async function guiAnswerCard(ease: number): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiAnswerCard',
        version: 5,
        params: {
            ease
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Opens the Deck Overview dialog for the deck with the given name;
 * returns true if succeeded or false otherwise.
 * @param name - Name of the deck to open overview for
 */
export async function guiDeckOverview(name: string): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckOverview',
        version: 5,
        params: {
            name
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Opens the Deck Browser dialog.
 */
export async function guiDeckBrowser(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckBrowser',
        version: 5
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Starts review for the deck with the given name; returns true if succeeded or false otherwise.
 * @param name - Name of the deck to start review for
 */
export async function guiDeckReview(name: string): Promise<AnkiConnectResponse<boolean>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckReview',
        version: 5,
        params: {
            name
        }
    };

    return await callAnkiConnect<boolean>(request);
}

/**
 * Schedules a request to gracefully close Anki.
 * This operation is asynchronous, so it will return immediately and won't wait until the Anki process actually terminates.
 */
export async function guiExitAnki(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiExitAnki',
        version: 5
    };

    return await callAnkiConnect<null>(request);
}