# React + Express Simple Chat Example

A minimal React + Express example showing how to use the `useChat` hook with dedalus-react.

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

## Project Structure

```
react-express-simple/
├── App.tsx          # Chat UI component
├── main.tsx         # React entry point
├── index.html       # HTML template
├── server.ts        # Express server with chat endpoint
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```
