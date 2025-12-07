// Generic stream chunk - accepts any object with SSE-compatible structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericStreamChunk = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DedalusRunnerResult = AsyncIterable<GenericStreamChunk> | Record<string, any>;

export interface StreamResponseOptions {
  /**
   * Additional headers to include in the response
   */
  headers?: Record<string, string>;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<GenericStreamChunk> {
  return value != null && typeof value === "object" && Symbol.asyncIterator in value;
}

/**
 * Stream a Dedalus response to a Web standard Response.
 *
 * Use this for environments that use the Web Fetch API:
 * - Next.js App Router
 * - Cloudflare Workers
 * - Deno
 * - Bun
 *
 * For Node.js frameworks like Express or Fastify, use `streamToNodeResponse` instead.
 *
 * @example Next.js App Router
 * ```ts
 * import { streamToWebResponse } from 'dedalus-react/server'
 * import Dedalus, { DedalusRunner } from 'dedalus-labs'
 *
 * const client = new Dedalus()
 * const runner = new DedalusRunner(client)
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json()
 *
 *   const stream = await runner.run({
 *     model: 'openai/gpt-4o-mini',
 *     messages,
 *     stream: true,
 *   })
 *
 *   return streamToWebResponse(stream)
 * }
 * ```
 */
export function streamToWebResponse(
  result: DedalusRunnerResult,
  options: StreamResponseOptions = {},
): Response {
  if (!isAsyncIterable(result)) {
    throw new Error(
      "streamToWebResponse requires a streaming result. Make sure to pass stream: true to runner.run()",
    );
  }

  const stream = result;
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...options.headers,
    },
  });
}

/**
 * Stream a Dedalus response to a Node.js response object.
 *
 * Use this for Node.js HTTP frameworks:
 * - Express
 * - Fastify
 * - Node.js built-in `http` module
 *
 * For Next.js App Router, Cloudflare Workers, Deno, or Bun, use `streamToWebResponse` instead.
 *
 * @example Express
 * ```ts
 * import { streamToNodeResponse } from 'dedalus-react/server'
 * import Dedalus, { DedalusRunner } from 'dedalus-labs'
 *
 * const client = new Dedalus()
 * const runner = new DedalusRunner(client)
 *
 * app.post('/api/chat', async (req, res) => {
 *   const { messages } = req.body
 *
 *   const stream = await runner.run({
 *     model: 'openai/gpt-4o-mini',
 *     messages,
 *     stream: true,
 *   })
 *
 *   await streamToNodeResponse(stream, res)
 * })
 * ```
 */
export async function streamToNodeResponse(
  result: DedalusRunnerResult,
  res: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    write: (chunk: string) => void;
    end: () => void;
  },
  options: StreamResponseOptions = {},
): Promise<void> {
  if (!isAsyncIterable(result)) {
    throw new Error(
      "streamToNodeResponse requires a streaming result. Make sure to pass stream: true to runner.run()",
    );
  }

  const stream = result;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...options.headers,
  });

  try {
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write(`data: [DONE]\n\n`);
  } finally {
    res.end();
  }
}
