// Re-export message types from dedalus-labs SDK
// Using `import type` ensures no runtime code is bundled
export type {
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionDeveloperMessageParam,
  ChatCompletionFunctionMessageParam,
  StreamChunk,
  ChoiceDelta,
  ChoiceDeltaToolCall,
} from "dedalus-labs/resources/chat/completions";

import type {
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
} from "dedalus-labs/resources/chat/completions";

/**
 * Union type for all supported message types in a chat conversation.
 * Compatible with OpenAI Chat Completions API message format.
 */
export type Message =
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionSystemMessageParam
  | ChatCompletionToolMessageParam;

export type DedalusChatStatus = "submitted" | "streaming" | "ready" | "error";

export type IdGenerator = () => string;

export interface ChatRequestOptions {
  headers?: Record<string, string> | Headers;
  body?: object;
}

export interface UseDedalusChatOptions {
  /**
   * The API endpoint to send messages to.
   */
  api: string;

  /**
   * A unique identifier for the chat session.
   * If not provided, a random one will be generated.
   */
  id?: string;

  /**
   * Initial messages to populate the chat.
   */
  messages?: Message[];

  /**
   * Function to generate unique IDs for messages.
   * Defaults to crypto.randomUUID.
   */
  generateId?: IdGenerator;

  /**
   * Additional headers to send with requests.
   */
  headers?: Record<string, string> | Headers;

  /**
   * Credentials mode for fetch requests.
   */
  credentials?: RequestCredentials;

  /**
   * Custom fetch function to use for requests.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Function to prepare the request body before sending.
   * Allows customization of the request payload.
   */
  prepareRequestBody?: (opts: {
    id: string;
    messages: Message[];
    body?: object;
  }) => object;

  /**
   * Callback when an error occurs during streaming.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the assistant finishes responding.
   */
  onFinish?: (opts: { message: Message; messages: Message[] }) => void;
}

export interface UseDedalusChatReturn {
  /**
   * The unique identifier for the chat session.
   */
  id: string;

  /**
   * The current list of messages in the chat.
   */
  messages: Message[];

  /**
   * The current status of the chat.
   */
  status: DedalusChatStatus;

  /**
   * The current error, if any.
   */
  error: Error | undefined;

  /**
   * Send a message to the chat.
   * Can be a string (creates a user message) or a full Message object.
   */
  sendMessage: (
    message: Message | string,
    options?: ChatRequestOptions,
  ) => Promise<void>;

  /**
   * Update the messages array directly.
   */
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[]),
  ) => void;

  /**
   * Stop the current streaming response.
   */
  stop: () => void;
}
