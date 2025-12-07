# React + Express Model Selector Example

A React + Express example demonstrating dynamic model selection with the `useChat` hook.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Add your Dedalus API key to `.env`:
   ```
   DEDALUS_API_KEY=your-api-key-here
   ```

4. Run both the server and client:
   ```bash
   pnpm start
   ```

   Or run them separately:
   ```bash
   # Terminal 1 - Express server
   pnpm run server

   # Terminal 2 - Vite dev server
   pnpm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- Dropdown to select between GPT-4o, GPT-4o Mini, and Claude Sonnet 4.5
- Uses `transport.body` to dynamically send the selected model with each request

## Project Structure

```
react-express-model-select/
├── App.tsx          # Chat UI with model selector
├── main.tsx         # React entry point
├── index.html       # HTML template
├── server.ts        # Express server with model parameter support
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```
