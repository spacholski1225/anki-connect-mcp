import { AnkiConnectResponse } from './base';

/**
 * Card information structure
 */
export interface CardInfo {
    cardId: number;
    fields: Record<string, {
        value: string;
        order: number;
    }>;
    fieldOrder: number;
    question: string;
    answer: string;
    modelName: string;
    ord: number;
    deckName: string;
    css: string;
    factor: number;
    interval: number;
    note: number;
    type: number;
    queue: number;
    due: number;
    reps: number;
    lapses: number;
    left: number;
}

/**
 * Response for finding cards
 */
export interface FindCardsResponse extends AnkiConnectResponse<number[]> {
    result: number[]; // array of card IDs
}

/**
 * Response for getting cards information
 */
export interface CardsInfoResponse extends AnkiConnectResponse<CardInfo[]> {
    result: CardInfo[];
}

/**
 * Response for converting cards to notes
 */
export interface CardsToNotesResponse extends AnkiConnectResponse<number[]> {
    result: number[]; // array of note IDs
}

/**
 * Response for suspend/unsuspend operations
 */
export interface SuspendResponse extends AnkiConnectResponse<boolean> {
    result: boolean;
}

/**
 * Response for areSuspended operation
 */
export interface AreSuspendedResponse extends AnkiConnectResponse<boolean[]> {
    result: boolean[];
}

/**
 * Response for areDue operation
 */
export interface AreDueResponse extends AnkiConnectResponse<boolean[]> {
    result: boolean[];
}

/**
 * Response for getIntervals operation
 */
export interface GetIntervalsResponse extends AnkiConnectResponse<number[] | number[][]> {
    result: number[] | number[][];
}