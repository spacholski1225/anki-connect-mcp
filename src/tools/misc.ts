import { callAnkiConnect } from '../methods/anki.js';
import {
    VersionResponse,
    GetTagsResponse,
    GuiCurrentCardResponse,
    MultiResponse,
    AnkiConnectRequest,
    AnkiConnectResponse
} from '../types/anki';

/**
 * Get Anki Connect API version
 */
export async function getVersion(): Promise<VersionResponse> {
    const request: AnkiConnectRequest = {
        action: 'version',
        version: 6
    };

    return await callAnkiConnect<number>(request);
}

/**
 * Get all tags from Anki
 */
export async function getTags(): Promise<GetTagsResponse> {
    const request: AnkiConnectRequest = {
        action: 'getTags',
        version: 6
    };

    return await callAnkiConnect<string[]>(request);
}

/**
 * Get current card information from GUI
 */
export async function guiCurrentCard(): Promise<GuiCurrentCardResponse> {
    const request: AnkiConnectRequest = {
        action: 'guiCurrentCard',
        version: 6
    };

    return await callAnkiConnect(request);
}

/**
 * Start card timer in GUI
 */
export async function guiStartCardTimer(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiStartCardTimer',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Show question in GUI
 */
export async function guiShowQuestion(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiShowQuestion',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Show answer in GUI
 */
export async function guiShowAnswer(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiShowAnswer',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Answer card in GUI
 * @param ease - Answer ease (1-4: Again, Hard, Good, Easy)
 */
export async function guiAnswerCard(ease: number): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiAnswerCard',
        version: 6,
        params: {
            ease
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Open deck overview in GUI
 * @param deckName - Name of the deck to open
 */
export async function guiDeckOverview(deckName: string): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckOverview',
        version: 6,
        params: {
            name: deckName
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Open deck browser in GUI
 */
export async function guiDeckBrowser(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckBrowser',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Start deck review in GUI
 * @param deckName - Name of the deck to review
 */
export async function guiDeckReview(deckName: string): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiDeckReview',
        version: 6,
        params: {
            name: deckName
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Open browse window with query
 * @param query - Search query for browsing
 */
export async function guiBrowse(query: string): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiBrowse',
        version: 6,
        params: {
            query
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Open add cards dialog in GUI
 */
export async function guiAddCards(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiAddCards',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Exit Anki application
 */
export async function guiExitAnki(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'guiExitAnki',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Execute multiple actions in a single request
 * @param actions - Array of AnkiConnect requests to execute
 */
export async function multi(actions: AnkiConnectRequest[]): Promise<MultiResponse> {
    const request: AnkiConnectRequest = {
        action: 'multi',
        version: 6,
        params: {
            actions
        }
    };

    return await callAnkiConnect<AnkiConnectResponse[]>(request);
}

/**
 * Upgrade Anki Connect (if available)
 */
export async function upgrade(): Promise<AnkiConnectResponse<null>> {
    const request: AnkiConnectRequest = {
        action: 'upgrade',
        version: 6
    };

    return await callAnkiConnect<null>(request);
}