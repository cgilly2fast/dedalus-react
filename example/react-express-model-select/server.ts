/**
 * Example Express server for model selector demo
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import Dedalus, { DedalusRunner } from "dedalus-labs";

const app = express();
const port = 3001;

const client = new Dedalus();
const runner = new DedalusRunner(client);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const result = await runner.run({
      messages,
      model: model || "openai/gpt-4o",
      stream: true,
    });

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
});
