/**
 * Example Next.js API route for model selector demo
 *
 * Requires DEDALUS_API_KEY environment variable
 */
import { NextRequest } from "next/server";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { streamToWebResponse } from "../../../../../src/server";

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
    const stream = await runner.run({
      messages,
      model: model || "openai/gpt-4o",
      stream: true,
    });

    return streamToWebResponse(stream);
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
