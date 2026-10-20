import http from "node:http";
import type { AddressInfo } from "node:net";

export interface RecordedRequest {
  action: string;
  version?: number;
  key?: string;
  params?: any;
  [k: string]: unknown;
}

export interface FakeResponse {
  result: unknown;
  error: string | null;
}

type Responder = FakeResponse | ((req: RecordedRequest) => FakeResponse);

/**
 * Local stand-in for AnkiConnect. Records every request body (parsed JSON)
 * and answers with programmable responses per `action`.
 * Default response: `{ result: null, error: null }`.
 */
export class FakeAnki {
  readonly requests: RecordedRequest[] = [];
  private responders = new Map<string, Responder>();
  private server: http.Server;
  url = "";

  private constructor() {
    this.server = http.createServer((req, res) => {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let parsed: RecordedRequest;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.writeHead(400).end();
          return;
        }
        this.requests.push(parsed);
        const responder = this.responders.get(parsed.action);
        const response =
          typeof responder === "function"
            ? responder(parsed)
            : responder ?? { result: null, error: null };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      });
    });
  }

  /** Starts the fake on `port` (0 = any free port). */
  static async start(port = 0): Promise<FakeAnki> {
    const fake = new FakeAnki();
    await new Promise<void>((resolve, reject) => {
      fake.server.once("error", reject);
      fake.server.listen(port, "127.0.0.1", resolve);
    });
    const address = fake.server.address() as AddressInfo;
    fake.url = `http://127.0.0.1:${address.port}`;
    return fake;
  }

  /** Respond to `action` with a successful `result`. */
  respond(action: string, result: unknown): this {
    this.responders.set(action, { result, error: null });
    return this;
  }

  /** Respond to `action` with an AnkiConnect error. */
  fail(action: string, error: string): this {
    this.responders.set(action, { result: null, error });
    return this;
  }

  /** Respond to `action` with a custom function. */
  on(action: string, responder: Responder): this {
    this.responders.set(action, responder);
    return this;
  }

  lastRequest(): RecordedRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  async close(): Promise<void> {
    this.server.closeAllConnections?.();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

/** Returns a URL on 127.0.0.1 where nothing is listening. */
export async function unusedUrl(): Promise<string> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}
