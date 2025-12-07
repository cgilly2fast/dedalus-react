# dedalus-react

React hooks for building chat interfaces with [Dedalus](https://dedaluslabs.ai).

## Installation

```bash
pnpm add dedalus-react dedalus-labs
```

## Quick Start

### Client (React)

```tsx
import { useChat } from "dedalus-react/react";

function Chat() {
  const { messages, sendMessage, status, stop } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}

      <button onClick={() => sendMessage("Hello!")}>Send</button>

      {status === "streaming" && <button onClick={stop}>Stop</button>}
    </div>
  );
}
```

### Server (Express)

```ts
import express from "express";
import Dedalus, { DedalusRunner } from "dedalus-labs";

const app = express();
const client = new Dedalus();
const runner = new DedalusRunner(client);

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const result = await runner.run({
    messages,
    model: "openai/gpt-4o-mini",
    stream: true,
  });

  for await (const chunk of result as AsyncIterableIterator<any>) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write(`data: [DONE]\n\n`);
  res.end();
});
```

### Server (Next.js App Router)

```ts
import Dedalus, { DedalusRunner } from "dedalus-labs";

const client = new Dedalus();
const runner = new DedalusRunner(client);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await runner.run({
    messages,
    model: "openai/gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of result as AsyncIterableIterator<any>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
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
```

## API

### `useChat(options)`

| Option      | Type       | Description                        |
| ----------- | ---------- | ---------------------------------- |
| `api`       | `string`   | **Required.** API endpoint         |
| `id`        | `string`   | Chat session ID                    |
| `messages`  | `Message[]`| Initial messages                   |
| `headers`   | `object`   | Additional request headers         |
| `onError`   | `function` | Error callback                     |
| `onFinish`  | `function` | Completion callback                |

**Returns:**

| Property      | Type       | Description                        |
| ------------- | ---------- | ---------------------------------- |
| `messages`    | `Message[]`| Current messages                   |
| `status`      | `string`   | `ready`, `submitted`, `streaming`, or `error` |
| `error`       | `Error`    | Current error (if any)             |
| `sendMessage` | `function` | Send a message                     |
| `setMessages` | `function` | Update messages                    |
| `stop`        | `function` | Stop streaming                     |

## Examples

The `example/` directory contains working examples for different setups:

| Example | Description |
| ------- | ----------- |
| [next-simple](./example/next-simple) | Minimal Next.js App Router example |
| [next-model-select](./example/next-model-select) | Next.js with dynamic model selection |
| [react-express-simple](./example/react-express-simple) | Minimal React + Express example |
| [react-express-model-select](./example/react-express-model-select) | React + Express with model selection |

### Running an Example

```bash
cd example/next-simple  # or any other example
pnpm install
cp .env.example .env.local  # use .env for Express examples
# Add your DEDALUS_API_KEY to the env file
pnpm dev  # or pnpm start for Express examples
```

## License

MIT
