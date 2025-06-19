/**
 * Base Anki Connect API response structure
 */
export interface AnkiConnectResponse<T = any> {
    result: T;
    error: string | null;
}

/**
 * Interface for Anki Connect request structure
 */
export interface AnkiConnectRequest {
    action: string;
    version: number;
    params?: Record<string, any>;
}

/**
 * Generic success response (for operations that don't return specific data)
 */
export interface SuccessResponse extends AnkiConnectResponse<null> {
    result: null;
}

/**
 * Type guard to check if response has error
 */
export function hasError<T>(response: AnkiConnectResponse<T>): response is AnkiConnectResponse<T> & { error: string } {
    return response.error !== null;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccess<T>(response: AnkiConnectResponse<T>): response is AnkiConnectResponse<T> & { error: null } {
    return response.error === null;
}