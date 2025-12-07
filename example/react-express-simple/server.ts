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
import { pipeStreamToResponse } from "../../src/server";

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

    // Run with streaming
    const stream = await runner.run({
      messages,
      model: "openai/gpt-4o-mini",
      stream: true,
    });

    await pipeStreamToResponse(stream, res);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("POST /api/chat - Send chat messages");
});
