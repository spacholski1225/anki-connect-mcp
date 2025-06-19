import { AnkiConnectResponse } from './base';

/**
 * Response for getting deck names
 */
export interface DeckNamesResponse extends AnkiConnectResponse<string[]> {
    result: string[];
}

/**
 * Response for getting deck names and IDs
 */
export interface DeckNamesAndIdsResponse extends AnkiConnectResponse<Record<string, number>> {
    result: Record<string, number>;
}

/**
 * Response for getting decks by card IDs
 */
export interface GetDecksResponse extends AnkiConnectResponse<Record<string, number[]>> {
    result: Record<string, number[]>;
}

/**
 * Deck configuration structure
 */
export interface DeckConfig {
    lapse: {
        leechFails: number;
        delays: number[];
        minInt: number;
        leechAction: number;
        mult: number;
    };
    dyn: boolean;
    autoplay: boolean;
    mod: number;
    id: number;
    maxTaken: number;
    new: {
        bury: boolean;
        order: number;
        initialFactor: number;
        perDay: number;
        delays: number[];
        separate: boolean;
        ints: number[];
    };
    name: string;
    rev: {
        bury: boolean;
        ivlFct: number;
        ease4: number;
        maxIvl: number;
        perDay: number;
        minSpace: number;
        fuzz: number;
    };
    timer: number;
    replayq: boolean;
    usn: number;
}

/**
 * Response for getting deck configuration
 */
export interface GetDeckConfigResponse extends AnkiConnectResponse<DeckConfig> {
    result: DeckConfig;
}

/**
 * Response for saving deck configuration
 */
export interface SaveDeckConfigResponse extends AnkiConnectResponse<boolean> {
    result: boolean;
}

/**
 * Response for setting deck configuration ID
 */
export interface SetDeckConfigIdResponse extends AnkiConnectResponse<boolean> {
    result: boolean;
}

/**
 * Response for cloning deck configuration
 */
export interface CloneDeckConfigIdResponse extends AnkiConnectResponse<number | false> {
    result: number | false;
}

/**
 * Response for removing deck configuration
 */
export interface RemoveDeckConfigIdResponse extends AnkiConnectResponse<boolean> {
    result: boolean;
}