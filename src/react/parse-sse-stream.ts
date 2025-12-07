import type { StreamChunk } from "./types";

/**
 * Parse an SSE stream into StreamChunk objects.
 * Handles the OpenAI-style SSE format with `data: {...}` lines.
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<StreamChunk> {
  // Use type assertion to work around TypeScript DOM lib inconsistencies
  const textStream = stream.pipeThrough(
    new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>,
  );
  const reader = textStream.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            yield JSON.parse(data) as StreamChunk;
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      const data = buffer.trim().slice(6);
      if (data !== "[DONE]") {
        try {
          yield JSON.parse(data) as StreamChunk;
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
