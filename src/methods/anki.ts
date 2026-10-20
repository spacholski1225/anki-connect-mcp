import type { AnkiConnectRequest, AnkiConnectResponse } from '../types/anki/index.js';

const DEFAULT_URL = 'http://localhost:8765';
const REQUEST_TIMEOUT_MS = 15_000;
const API_VERSION = 6;

export interface AnkiConnectConfig {
    url: string;
    apiKey?: string;
}

/** AnkiConnect answered, but with a non-null `error`. */
export class AnkiConnectError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AnkiConnectError';
    }
}

/** AnkiConnect could not be reached or did not answer with a valid response. */
export class AnkiConnectUnreachableError extends Error {
    constructor(url: string, detail: string) {
        super(
            `Could not reach AnkiConnect at ${url}. ` +
            `Is Anki running with the AnkiConnect add-on installed? (${detail})`
        );
        this.name = 'AnkiConnectUnreachableError';
    }
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): AnkiConnectConfig {
    return {
        url: env.ANKI_CONNECT_URL || DEFAULT_URL,
        apiKey: env.ANKI_CONNECT_API_KEY || undefined,
    };
}

export interface AnkiClient {
    /** Sends one action and returns its `result`; throws on AnkiConnect or transport errors. */
    invoke<T = unknown>(action: string, params?: Record<string, unknown>): Promise<T>;
    /** Sends one raw request and returns the `{result, error}` envelope; throws only on transport errors. */
    send<T = unknown>(request: AnkiConnectRequest): Promise<AnkiConnectResponse<T>>;
}

export function createAnkiClient(config: AnkiConnectConfig): AnkiClient {
    const { url, apiKey } = config;

    async function send<T>(request: AnkiConnectRequest): Promise<AnkiConnectResponse<T>> {
        const body = apiKey === undefined ? request : { ...request, key: apiKey };
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
        } catch (error) {
            throw new AnkiConnectUnreachableError(url, describeFetchError(error));
        }
        if (!response.ok) {
            throw new AnkiConnectUnreachableError(url, `HTTP ${response.status} ${response.statusText}`.trim());
        }
        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new AnkiConnectUnreachableError(url, 'response was not valid JSON');
        }
        if (typeof data !== 'object' || data === null || !('result' in data) || !('error' in data)) {
            throw new AnkiConnectUnreachableError(url, 'unexpected response shape (expected {result, error})');
        }
        return data as AnkiConnectResponse<T>;
    }

    async function invoke<T>(action: string, params?: Record<string, unknown>): Promise<T> {
        const request: AnkiConnectRequest = { action, version: API_VERSION };
        if (params !== undefined) request.params = params;
        const { result, error } = await send<T>(request);
        if (error !== null && error !== undefined) {
            throw new AnkiConnectError(String(error));
        }
        return result;
    }

    return { invoke, send };
}

function describeFetchError(error: unknown): string {
    if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return `request timed out after ${REQUEST_TIMEOUT_MS} ms`;
        }
        const cause = (error as { cause?: unknown }).cause;
        if (cause instanceof Error) {
            const code = (cause as { code?: string }).code;
            return code ? `${code}: ${cause.message}` : cause.message;
        }
        return error.message;
    }
    return String(error);
}

/**
 * Sends a raw request using configuration from the environment and returns the
 * `{result, error}` envelope. Kept for the (currently unregistered) media helpers.
 */
export async function callAnkiConnect<T = any>(request: AnkiConnectRequest): Promise<AnkiConnectResponse<T>> {
    return createAnkiClient(configFromEnv()).send<T>(request);
}
