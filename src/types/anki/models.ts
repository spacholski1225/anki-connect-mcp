import { AnkiConnectResponse } from './base';

/**
 * Response for getting model names
 */
export interface ModelNamesResponse extends AnkiConnectResponse<string[]> {
    result: string[];
}

/**
 * Response for getting model names and IDs
 */
export interface ModelNamesAndIdsResponse extends AnkiConnectResponse<Record<string, number>> {
    result: Record<string, number>;
}

/**
 * Response for getting model field names
 */
export interface ModelFieldNamesResponse extends AnkiConnectResponse<string[]> {
    result: string[];
}

/**
 * Response for getting model fields on templates
 */
export interface ModelFieldsOnTemplatesResponse extends AnkiConnectResponse<Record<string, string[][]>> {
    result: Record<string, string[][]>;
}