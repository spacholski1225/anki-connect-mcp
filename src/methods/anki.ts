import axios from 'axios';
import { AnkiConnectResponse, AnkiConnectRequest } from '../types/anki';

// Use environment variable with fallback to default
const BASE_URL = process.env.ANKI_CONNECT_URL || 'http://localhost:8765';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
})

export async function callAnkiConnect<T = any>(request: AnkiConnectRequest): Promise<AnkiConnectResponse<T>> {
    try {
        const response = await api.post<AnkiConnectResponse<T>>('/', request);
        return response.data;
    }
    catch(error) {
        throw error;
    }
}