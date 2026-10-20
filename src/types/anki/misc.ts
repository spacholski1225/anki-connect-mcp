import { AnkiConnectResponse } from './base.js';
import { CardInfo } from './cards.js';

/**
 * Response for version check
 */
export interface VersionResponse extends AnkiConnectResponse<number> {
    result: number;
}

/**
 * Response for tag operations
 */
export interface GetTagsResponse extends AnkiConnectResponse<string[]> {
    result: string[];
}

/**
 * Response for GUI operations
 */
export interface GuiCurrentCardResponse extends AnkiConnectResponse<CardInfo | false> {
    result: CardInfo | false;
}

/**
 * Response for multi-action requests
 */
export interface MultiResponse extends AnkiConnectResponse<AnkiConnectResponse[]> {
    result: AnkiConnectResponse[];
}