import { callAnkiConnect } from '../methods/anki.js';
import {
    StoreMediaFileResponse,
    RetrieveMediaFileResponse,
    DeleteMediaFileResponse,
    AnkiConnectRequest
} from '../types/anki';

/**
 * Store a file with the specified base64-encoded contents inside the media folder.
 * To prevent Anki from removing files not used by any cards (e.g. for configuration files),
 * prefix the filename with an underscore. These files are still synchronized to AnkiWeb.
 * @param filename - Name of the file to store
 * @param data - Base64-encoded file contents
 */
export async function storeMediaFile(filename: string, data: string): Promise<StoreMediaFileResponse> {
    const request: AnkiConnectRequest = {
        action: 'storeMediaFile',
        version: 6,
        params: {
            filename,
            data
        }
    };

    return await callAnkiConnect<null>(request);
}

/**
 * Retrieve the base64-encoded contents of the specified file.
 * Returns false if the file does not exist.
 * @param filename - Name of the file to retrieve
 */
export async function retrieveMediaFile(filename: string): Promise<RetrieveMediaFileResponse> {
    const request: AnkiConnectRequest = {
        action: 'retrieveMediaFile',
        version: 6,
        params: {
            filename
        }
    };

    return await callAnkiConnect<string | false>(request);
}

/**
 * Delete the specified file inside the media folder.
 * @param filename - Name of the file to delete
 */
export async function deleteMediaFile(filename: string): Promise<DeleteMediaFileResponse> {
    const request: AnkiConnectRequest = {
        action: 'deleteMediaFile',
        version: 6,
        params: {
            filename
        }
    };

    return await callAnkiConnect<null>(request);
}