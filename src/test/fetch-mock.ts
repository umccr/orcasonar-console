/**
 * The API as tests see it. The API client keeps the `fetch` it was made with, so setup installs one fetch that hands
 * each request to whatever `answer` a test set, and records it.
 */
export type Answer = (request: Request) => Response | Promise<Response>;

let current: Answer = (request) => {
  throw new Error(`No answer set for ${request.method} ${request.url}`);
};

/** Every request made since the last `answer`. */
export const requests: Request[] = [];

export const answer = (handler: Answer): void => {
  current = handler;
  requests.length = 0;
};

export const mockFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const request = input instanceof Request ? input : new Request(input, init);
  requests.push(request.clone());
  return Promise.resolve(current(request));
};

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

/** A stream of server-sent events, as `POST /chat` sends them, split across chunks as a network might. */
export const sse = (events: readonly { event: string; data: unknown }[]): Response => {
  const text = events
    .map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('');
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let at = 0; at < bytes.length; at += 37) {
        controller.enqueue(bytes.slice(at, at + 37));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
};

/** The path and query of a request, as `/audit/usage?from=…`. */
export const pathOf = (request: Request): string => {
  const url = new URL(request.url);
  return `${url.pathname.replace(/^\/api\/v1/, '')}${url.search}`;
};
