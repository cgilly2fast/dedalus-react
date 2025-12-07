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
 * Create an SSE streaming response from a Dedalus stream.
 * Compatible with the useChat hook on the client.
 *
 * @example Express
 * ```ts
 * import { createStreamResponse } from '../../../src/server'
 * import Dedalus from 'dedalus-labs'
 *
 * const client = new Dedalus({ apiKey: process.env.DEDALUS_API_KEY })
 *
 * app.post('/api/chat', async (req, res) => {
 *   const { messages } = req.body
 *
 *   const stream = await client.chat.completions.create({
 *     model: 'openai/gpt-4o-mini',
 *     messages,
 *     stream: true,
 *   })
 *
 *   const response = createStreamResponse(stream)
 *
 *   res.writeHead(200, Object.fromEntries(response.headers.entries()))
 *   const reader = response.body!.getReader()
 *   while (true) {
 *     const { done, value } = await reader.read()
 *     if (done) break
 *     res.write(value)
 *   }
 *   res.end()
 * })
 * ```
 *
 * @example Next.js App Router
 * ```ts
 * import { createStreamResponse } from '../../../src/server'
 * import Dedalus from 'dedalus-labs'
 *
 * const client = new Dedalus({ apiKey: process.env.DEDALUS_API_KEY })
 *
 * export async function POST(req: Request) {
 *   const { messages } = await req.json()
 *
 *   const stream = await client.chat.completions.create({
 *     model: 'openai/gpt-4o-mini',
 *     messages,
 *     stream: true,
 *   })
 *
 *   return createStreamResponse(stream)
 * }
 * ```
 */
export function createStreamResponse(
  result: DedalusRunnerResult,
  options: StreamResponseOptions = {},
): Response {
  if (!isAsyncIterable(result)) {
    throw new Error(
      "createStreamResponse requires a streaming result. Make sure to pass stream: true to runner.run()",
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
 * Pipe a Dedalus stream to an Express/Node response object.
 * Handles SSE formatting automatically.
 *
 * @example
 * ```ts
 * import { pipeStreamToResponse } from '../../../src/server'
 * import Dedalus from 'dedalus-labs'
 *
 * const client = new Dedalus({ apiKey: process.env.DEDALUS_API_KEY })
 *
 * app.post('/api/chat', async (req, res) => {
 *   const { messages } = req.body
 *
 *   const stream = await client.chat.completions.create({
 *     model: 'openai/gpt-4o-mini',
 *     messages,
 *     stream: true,
 *   })
 *
 *   await pipeStreamToResponse(stream, res)
 * })
 * ```
 */
export async function pipeStreamToResponse(
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
      "pipeStreamToResponse requires a streaming result. Make sure to pass stream: true to runner.run()",
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
