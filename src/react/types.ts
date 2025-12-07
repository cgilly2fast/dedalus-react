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

/**
 * A value that can be either static or a function that returns the value.
 * Functions are called at request time and automatically see fresh state.
 *
 * @example
 * ```tsx
 * // Static value
 * headers: { 'X-API-Key': 'abc123' }
 *
 * // Dynamic value - function called at request time
 * headers: () => ({ Authorization: `Bearer ${authToken}` })
 * ```
 */
export type Resolvable<T> = T | (() => T);

/**
 * Options for preparing the request body.
 */
export interface PrepareRequestBodyOptions {
  /** The chat session ID */
  id: string;
  /** Current messages in the conversation */
  messages: Message[];
  /** Additional body from ChatRequestOptions */
  body?: object;
}

/**
 * Transport configuration for chat requests.
 * All properties can be static values or functions that return values.
 * Functions are called fresh at request time and automatically see
 * the latest values from your component's scope - no refs needed.
 *
 * @example
 * ```tsx
 * useChat({
 *   transport: {
 *     api: '/api/chat',
 *     // Static headers
 *     headers: { 'X-API-Key': 'abc123' },
 *     // Dynamic headers - always gets fresh token
 *     headers: () => ({
 *       Authorization: `Bearer ${getAuthToken()}`,
 *       'X-User-ID': currentUserId,
 *     }),
 *     // Dynamic body additions
 *     body: () => ({
 *       sessionId: getCurrentSessionId(),
 *       preferences: userPreferences,
 *     }),
 *     credentials: 'include',
 *   },
 * })
 * ```
 */
export interface TransportConfig {
  /**
   * The API endpoint to send messages to.
   * Can be a static string or a function returning the URL.
   */
  api: Resolvable<string>;

  /**
   * Additional headers to send with requests.
   * Can be static or a function returning headers.
   * Functions are called at request time with fresh state.
   */
  headers?: Resolvable<Record<string, string> | Headers>;

  /**
   * Credentials mode for fetch requests.
   * Can be static or a function returning the credentials mode.
   */
  credentials?: Resolvable<RequestCredentials>;

  /**
   * Additional body properties to merge into every request.
   * Can be static or a function returning the body object.
   * This is merged with the default body (id, messages) before prepareRequestBody is called.
   */
  body?: Resolvable<object>;

  /**
   * Custom fetch function to use for requests.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Function to prepare the final request body before sending.
   * Called after resolving and merging all other body sources.
   *
   * This callback automatically sees the latest values from your component's
   * scope - no refs needed.
   */
  prepareRequestBody?: (opts: PrepareRequestBodyOptions) => object;
}

/**
 * Represents a tool call from the assistant.
 * Compatible with OpenAI Chat Completions API tool call format.
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** The type of tool call (always "function" for now) */
  type: "function";
  /** The function being called */
  function: {
    /** Name of the function to call */
    name: string;
    /** JSON-encoded arguments for the function */
    arguments: string;
  };
}

export interface ChatRequestOptions {
  headers?: Record<string, string> | Headers;
  body?: object;
}

/**
 * Options for the onFinish callback.
 */
export interface OnFinishOptions {
  /** The final assistant message */
  message: Message;
  /** All messages in the conversation including the final assistant message */
  messages: Message[];
  /** True if the request was aborted by the user */
  isAbort: boolean;
  /** True if a network error caused disconnection */
  isDisconnect: boolean;
  /** True if an error occurred during streaming */
  isError: boolean;
}

/**
 * Options for the onToolCall callback.
 */
export interface OnToolCallOptions {
  /** The tool call received from the assistant */
  toolCall: ToolCall;
}

/**
 * Options passed to sendAutomaticallyWhen callback.
 */
export interface SendAutomaticallyWhenOptions {
  /** Current messages in the conversation */
  messages: Message[];
}

/**
 * Options for adding a tool result.
 */
export interface AddToolResultOptions {
  /** The ID of the tool call this result is for */
  toolCallId: string;
  /** The result of the tool execution */
  result: unknown;
}

export interface UseDedalusChatOptions {
  /**
   * Transport configuration for chat requests.
   * All properties can be static values or functions that return values.
   * Functions are called fresh at request time and automatically see
   * the latest values from your component's scope - no refs needed.
   *
   * @example
   * ```tsx
   * useChat({
   *   transport: {
   *     api: '/api/chat',
   *     headers: () => ({
   *       Authorization: `Bearer ${authToken}`,
   *       'X-User-ID': currentUserId,
   *     }),
   *     body: () => ({
   *       modelId: selectedModelId,
   *       config: agentConfig,
   *     }),
   *     credentials: 'include',
   *   },
   * })
   * ```
   */
  transport: TransportConfig;

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
   * Callback when an error occurs during streaming.
   *
   * This callback automatically sees the latest values from your component's
   * scope - no refs needed.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the assistant finishes responding.
   *
   * This callback automatically sees the latest values from your component's
   * scope - no refs needed.
   */
  onFinish?: (opts: OnFinishOptions) => void;

  /**
   * Called when a tool call is received from the assistant.
   * Use `addToolResult` to provide the tool's output.
   *
   * This callback automatically sees the latest values from your component's
   * scope - no refs needed.
   *
   * @example
   * ```tsx
   * useChat({
   *   onToolCall: async ({ toolCall }) => {
   *     if (toolCall.function.name === 'getWeather') {
   *       const args = JSON.parse(toolCall.function.arguments)
   *       const result = await getWeather(args.location)
   *       addToolResult({ toolCallId: toolCall.id, result })
   *     }
   *   }
   * })
   * ```
   */
  onToolCall?: (opts: OnToolCallOptions) => void | Promise<void>;

  /**
   * When provided, this function is called after the stream finishes or after
   * a tool result is added. If it returns true, the conversation is
   * automatically resubmitted to get another response.
   *
   * This is useful for agentic flows where tool calls should be automatically
   * executed and the results sent back to the model.
   *
   * This callback automatically sees the latest values from your component's
   * scope - no refs needed.
   *
   * @example
   * ```tsx
   * useChat({
   *   sendAutomaticallyWhen: ({ messages }) => {
   *     const lastMessage = messages[messages.length - 1]
   *     // Auto-send if the last message has tool results
   *     return lastMessage?.role === 'tool'
   *   }
   * })
   * ```
   */
  sendAutomaticallyWhen?: (
    opts: SendAutomaticallyWhenOptions
  ) => boolean | Promise<boolean>;
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

  /**
   * Add a tool result to the conversation.
   *
   * This adds a tool message with the result and, if `sendAutomaticallyWhen`
   * is configured and returns true, automatically resubmits the conversation.
   *
   * @example
   * ```tsx
   * const { addToolResult } = useChat({
   *   onToolCall: async ({ toolCall }) => {
   *     const result = await executeToolCall(toolCall)
   *     addToolResult({ toolCallId: toolCall.id, result })
   *   }
   * })
   * ```
   */
  addToolResult: (opts: AddToolResultOptions) => void;
}
