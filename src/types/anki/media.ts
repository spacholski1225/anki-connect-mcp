import { AnkiConnectResponse } from './base';

/**
 * Response for storing media file
 */
export interface StoreMediaFileResponse extends AnkiConnectResponse<null> {
    result: null;
}

/**
 * Response for retrieving media file
 */
export interface RetrieveMediaFileResponse extends AnkiConnectResponse<string | false> {
    result: string | false; // base64 data or false if not found
}

/**
 * Response for deleting media file
 */
export interface DeleteMediaFileResponse extends AnkiConnectResponse<null> {
    result: null;
}