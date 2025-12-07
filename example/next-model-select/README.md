# Next.js Model Selector Example

A Next.js example demonstrating dynamic model selection with the `useChat` hook.

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

## Features

- Dropdown to select between GPT-4o, GPT-4o Mini, and Claude Sonnet 4.5
- Uses `transport.body` to dynamically send the selected model with each request

## Project Structure

```
next-model-select/
├── app/
│   ├── api/chat/route.ts  # API route with model parameter support
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Chat UI with model selector
├── .env.example
├── next.config.js
├── package.json
└── tsconfig.json
```
