# Next.js Simple Chat Example

A minimal Next.js example showing how to use the `useChat` hook with dedalus-react.

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

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
next-simple/
├── app/
│   ├── api/chat/route.ts  # API route for chat streaming
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Chat UI component
├── .env.example
├── next.config.js
├── package.json
└── tsconfig.json
```
