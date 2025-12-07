/**
 * Example Next.js API route for model selector demo
 *
 * Requires DEDALUS_API_KEY environment variable
 */
import { NextRequest } from "next/server";
import Dedalus, { DedalusRunner } from "dedalus-labs";

// Ensure api key is set by copying .env.example to .env and adding your API key
const client = new Dedalus();
const runner = new DedalusRunner(client);


export async function POST(req: NextRequest) {
  try {

    const { messages, model } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received messages:", messages, "Model:", model);

    // Run with streaming, using the selected model or default
    const result = await runner.run({
      messages,
      model: model || "openai/gpt-4o",
      stream: true,
    });

    // Check if result is an async iterator (streaming)
    if (Symbol.asyncIterator in result) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result as AsyncIterable<any>) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "Streaming not supported" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Chat API Error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
