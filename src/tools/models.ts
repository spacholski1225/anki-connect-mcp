import { callAnkiConnect } from '../methods/anki.js';
import {
    ModelNamesResponse,
    ModelNamesAndIdsResponse,
    ModelFieldNamesResponse,
    ModelFieldsOnTemplatesResponse,
    AnkiConnectRequest
} from '../types/anki';

/**
 * Get the complete list of model names for the current user
 */
export async function modelNames(): Promise<ModelNamesResponse> {
    const request: AnkiConnectRequest = {
        action: 'modelNames',
        version: 6
    };

    return await callAnkiConnect<string[]>(request);
}

/**
 * Get the complete list of model names and their corresponding IDs for the current user
 */
export async function modelNamesAndIds(): Promise<ModelNamesAndIdsResponse> {
    const request: AnkiConnectRequest = {
        action: 'modelNamesAndIds',
        version: 6
    };

    return await callAnkiConnect<Record<string, number>>(request);
}

/**
 * Get the complete list of field names for the provided model name
 * @param modelName - Name of the model to get field names for
 */
export async function modelFieldNames(modelName: string): Promise<ModelFieldNamesResponse> {
    const request: AnkiConnectRequest = {
        action: 'modelFieldNames',
        version: 6,
        params: {
            modelName
        }
    };

    return await callAnkiConnect<string[]>(request);
}

/**
 * Returns an object indicating the fields on the question and answer side of each card template for the given model name.
 * The question side is given first in each array.
 * @param modelName - Name of the model to get template fields for
 */
export async function modelFieldsOnTemplates(modelName: string): Promise<ModelFieldsOnTemplatesResponse> {
    const request: AnkiConnectRequest = {
        action: 'modelFieldsOnTemplates',
        version: 6,
        params: {
            modelName
        }
    };

    return await callAnkiConnect<Record<string, string[][]>>(request);
}