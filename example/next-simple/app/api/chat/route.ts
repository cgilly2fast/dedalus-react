/**
 * Example Next.js API route using dedalus-react
 *
 * Requires DEDALUS_API_KEY environment variable
 */
import { NextRequest } from "next/server";
import Dedalus, { DedalusRunner } from "dedalus-labs";
import { createStreamResponse } from "../../../../../src/server";

// Ensure api key is set by copying .env.example to .env and adding your API key
const client = new Dedalus();
const runner = new DedalusRunner(client);

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Received messages:", messages);

    // Run with streaming
    const stream = await runner.run({
      messages,
      model: "openai/gpt-4o-mini",
      stream: true,
    });

    return createStreamResponse(stream);
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
