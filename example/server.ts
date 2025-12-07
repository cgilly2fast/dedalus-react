/**
 * Example Express server using dedalus-react
 *
 * Run with: pnpm run server
 * Requires DEDALUS_API_KEY environment variable
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import Dedalus, { DedalusRunner } from "dedalus-labs";

const app = express();
const port = 3001;

// Initialize Dedalus client and runner
console.log("Initializing Dedalus client...", process.env.DEDALUS_API_KEY);
const client = new Dedalus();
const runner = new DedalusRunner(client);

app.use(cors());
app.use(express.json());

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    console.log("Received messages:", messages);

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Run with streaming
    const result = await runner.run({
      messages,
      model: "openai/gpt-5",
      stream: true,
    });

    // Stream the response
    for await (const chunk of result as AsyncIterableIterator<any>) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("POST /api/chat - Send chat messages");
});
