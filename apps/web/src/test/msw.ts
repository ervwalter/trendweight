import { HttpResponse, type JsonBodyType } from "msw";
import { onTestFinished } from "vitest";
import { server } from "./mocks/server";

export interface Recorded {
  method: string;
  // Pathname only, e.g. "/api/profile/abc%20d" (percent-encoding preserved)
  path: string;
  // Query string including the leading "?", or "" when absent
  search: string;
  // Header names are lower-cased by the Fetch API, e.g. headers.authorization
  headers: Record<string, string>;
  // Parsed JSON when the request carried a JSON content-type, the raw text for other bodies,
  // undefined when there was no body
  body: unknown;
}

export interface RequestRecorder {
  // Every request MSW has seen since recordRequests() was called, in arrival order
  calls: Recorded[];
  // Waits for in-flight body parsing and returns calls
  settled: () => Promise<Recorded[]>;
  byPath: (path: string) => Recorded[];
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text === "") return undefined;
  const contentType = request.headers.get("content-type") ?? "";
  return /json/i.test(contentType) ? JSON.parse(text) : text;
}

// Records requests passing through the shared MSW server so tests assert method, path, headers
// and body after the fact instead of putting expect() inside handlers. The listener is removed
// when the current test finishes.
export function recordRequests(): RequestRecorder {
  const calls: Recorded[] = [];
  const pending: Promise<void>[] = [];

  const listener = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const recorded: Recorded = {
      method: request.method,
      path: url.pathname,
      search: url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body: undefined,
    };
    calls.push(recorded);
    pending.push(
      readBody(request.clone()).then((body) => {
        recorded.body = body;
      }),
    );
  };

  server.events.on("request:start", listener);
  onTestFinished(() => {
    server.events.removeListener("request:start", listener);
  });

  return {
    calls,
    settled: async () => {
      await Promise.all(pending);
      return calls;
    },
    byPath: (path) => calls.filter((call) => call.path === path),
  };
}

// Shorthand for JSON responses in handlers: http.get(path, () => json(200, body))
export function json<T extends JsonBodyType>(status: number, body: T) {
  return HttpResponse.json(body, { status });
}

// A 204 No Content response
export function noContent() {
  return new HttpResponse(null, { status: 204 });
}
