"use client";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { DedalusChatState } from "./chat-state";
import { parseSSEStream } from "./parse-sse-stream";
import { useStableCallback } from "./use-stable-callback";
import type {
  Message,
  StreamChunk,
  UseDedalusChatOptions,
  UseDedalusChatReturn,
  ChatRequestOptions,
  ChatCompletionAssistantMessageParam,
  ChatCompletionToolMessageParam,
  ChoiceDeltaToolCall,
  ToolCall,
  AddToolResultOptions,
  Resolvable,
  TransportConfig,
} from "./types";

/**
 * Default ID generator using crypto.randomUUID
 */
const defaultGenerateId = (): string => crypto.randomUUID();

/**
 * Check if a tool call accumulator has all required fields
 */
function isCompleteToolCall(tc: ToolCall): tc is ToolCall {
  return Boolean(tc.id && tc.function.name && tc.function.arguments);
}

/**
 * Resolve a value that can be either static or a function.
 * If it's a function, call it to get the value.
 */
function resolve<T>(value: Resolvable<T>): T {
  return typeof value === "function" ? (value as () => T)() : value;
}

/**
 * Normalize headers to a plain object
 */
function normalizeHeaders(
  headers: Record<string, string> | Headers | undefined
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return headers;
}

/**
 * A simple chat hook that works with Dedalus's Message types and StreamChunk format.
 * Compatible with OpenAI Chat Completions API message format.
 *
 * All transport properties and callbacks automatically see the latest values
 * from your component's scope - no refs needed.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, status, addToolResult } = useChat({
 *   transport: {
 *     api: '/api/chat',
 *     // Dynamic headers - always gets fresh token
 *     headers: () => ({
 *       Authorization: `Bearer ${authToken}`,
 *       'X-User-ID': currentUserId,
 *     }),
 *     // Dynamic body additions
 *     body: () => ({
 *       modelId: selectedModelId,
 *       config: agentConfig,
 *     }),
 *     credentials: 'include',
 *   },
 *   onToolCall: async ({ toolCall }) => {
 *     const result = await executeToolCall(toolCall)
 *     addToolResult({ toolCallId: toolCall.id, result })
 *   },
 *   sendAutomaticallyWhen: ({ messages }) => {
 *     return messages[messages.length - 1]?.role === 'tool'
 *   },
 * })
 *
 * // Send a simple text message
 * await sendMessage('Hello!')
 *
 * // Send with per-request overrides
 * await sendMessage('Hello!', { body: { temperature: 0.5 } })
 * ```
 */
export function useChat(options: UseDedalusChatOptions): UseDedalusChatReturn {
  const {
    transport,
    id: providedId,
    messages: initialMessages,
    generateId = defaultGenerateId,
  } = options;

  // Create stable versions of all callbacks
  // These always invoke the latest version, so they see current state values
  const stableOnError = useStableCallback(options.onError);
  const stableOnFinish = useStableCallback(options.onFinish);
  const stableOnToolCall = useStableCallback(options.onToolCall);
  const stableSendAutomaticallyWhen = useStableCallback(
    options.sendAutomaticallyWhen
  );

  // Create stable versions of transport functions
  // For Resolvable values, we wrap the function form to always call the latest
  const stableTransportApi = useStableCallback(
    typeof transport.api === "function"
      ? (transport.api as () => string)
      : undefined
  );
  const stableTransportHeaders = useStableCallback(
    typeof transport.headers === "function"
      ? (transport.headers as () => Record<string, string> | Headers)
      : undefined
  );
  const stableTransportCredentials = useStableCallback(
    typeof transport.credentials === "function"
      ? (transport.credentials as () => RequestCredentials)
      : undefined
  );
  const stableTransportBody = useStableCallback(
    typeof transport.body === "function"
      ? (transport.body as () => object)
      : undefined
  );
  const stablePrepareRequestBody = useStableCallback(
    transport.prepareRequestBody
  );

  // Store static values for transport (non-function values)
  // Must be memoized so resolveTransport callback captures stable reference
  const staticTransport = useMemo(
    () => ({
      api: typeof transport.api === "function" ? undefined : transport.api,
      headers:
        typeof transport.headers === "function" ? undefined : transport.headers,
      credentials:
        typeof transport.credentials === "function"
          ? undefined
          : transport.credentials,
      body: typeof transport.body === "function" ? undefined : transport.body,
      fetch: transport.fetch,
    }),
    [
      transport.api,
      transport.headers,
      transport.credentials,
      transport.body,
      transport.fetch,
    ]
  );

  const idRef = useRef<string>(providedId ?? generateId());
  const stateRef = useRef<DedalusChatState>(
    new DedalusChatState(initialMessages)
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track which tool calls have been notified to avoid duplicate onToolCall invocations
  const notifiedToolCallsRef = useRef<Set<string>>(new Set());

  // Handle id changes
  if (providedId && providedId !== idRef.current) {
    idRef.current = providedId;
    stateRef.current = new DedalusChatState(initialMessages);
    notifiedToolCallsRef.current = new Set();
  }

  const state = stateRef.current;

  // Subscribe to state with useSyncExternalStore
  const messages = useSyncExternalStore(
    state.subscribeMessages,
    state.getMessagesSnapshot,
    state.getMessagesSnapshot
  );

  const status = useSyncExternalStore(
    state.subscribeStatus,
    state.getStatusSnapshot,
    state.getStatusSnapshot
  );

  const error = useSyncExternalStore(
    state.subscribeError,
    state.getErrorSnapshot,
    state.getErrorSnapshot
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    state.status = "ready";
  }, [state]);

  const setMessages = useCallback(
    (messagesOrUpdater: Message[] | ((messages: Message[]) => Message[])) => {
      if (typeof messagesOrUpdater === "function") {
        state.messages = messagesOrUpdater(state.messages);
      } else {
        state.messages = messagesOrUpdater;
      }
    },
    [state]
  );

  /**
   * Resolve all transport values at request time.
   * This ensures dynamic values (functions) are called fresh each request.
   */
  const resolveTransport = useCallback(() => {
    // Resolve API - use stable callback only if transport.api was a function
    const api = typeof transport.api === "function" && stableTransportApi
      ? stableTransportApi() 
      : staticTransport.api!;

    // Resolve headers - use stable callback only if transport.headers was a function
    const transportHeaders = typeof transport.headers === "function" && stableTransportHeaders
      ? stableTransportHeaders()
      : staticTransport.headers;

    // Resolve credentials - use stable callback only if transport.credentials was a function
    const credentials = typeof transport.credentials === "function" && stableTransportCredentials
      ? stableTransportCredentials()
      : staticTransport.credentials;

    // Resolve body - use stable callback only if transport.body was a function
    const transportBody = typeof transport.body === "function" && stableTransportBody
      ? stableTransportBody()
      : staticTransport.body;

    return {
      api,
      headers: transportHeaders,
      credentials,
      body: transportBody,
      fetch: staticTransport.fetch ?? globalThis.fetch.bind(globalThis),
    };
  }, [
    transport.api,
    transport.headers,
    transport.credentials,
    transport.body,
    stableTransportApi,
    stableTransportHeaders,
    stableTransportCredentials,
    stableTransportBody,
    staticTransport,
  ]);

  /**
   * Internal function to perform the API request.
   * Separated from sendMessage so it can be reused for auto-send flows.
   */
  const performRequest = useCallback(
    async (requestOptions?: ChatRequestOptions): Promise<void> => {
      state.status = "submitted";
      state.error = undefined;

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Reset notified tool calls for new request
      notifiedToolCallsRef.current = new Set();

      let isAbort = false;
      let isDisconnect = false;
      let isError = false;

      try {
        // Resolve transport values fresh for this request
        const resolvedTransport = resolveTransport();

        // Build request body
        const currentMessages = state.messages;

        // Merge transport body with request options body
        const mergedBodyAdditions = {
          ...resolvedTransport.body,
          ...requestOptions?.body,
        };

        const defaultBody = {
          id: idRef.current,
          messages: currentMessages,
          ...mergedBodyAdditions,
        };

        // Use prepareRequestBody if provided, otherwise use default
        const body = transport.prepareRequestBody && stablePrepareRequestBody
          ? stablePrepareRequestBody({
              id: idRef.current,
              messages: currentMessages,
              body: mergedBodyAdditions,
            })
          : defaultBody;

        // Merge headers: transport headers + request options headers
        const mergedHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...normalizeHeaders(resolvedTransport.headers),
          ...normalizeHeaders(requestOptions?.headers),
        };

        // Make request
        const response = await resolvedTransport.fetch(resolvedTransport.api, {
          method: "POST",
          headers: mergedHeaders,
          body: JSON.stringify(body),
          credentials: resolvedTransport.credentials,
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Create placeholder assistant message
        const assistantMessage: ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: "",
        };
        state.pushMessage(assistantMessage);
        state.status = "streaming";

        // Process stream
        let accumulatedContent = "";
        const toolCalls: ToolCall[] = [];

        for await (const chunk of parseSSEStream(response.body)) {
          if (abortController.signal.aborted) {
            isAbort = true;
            break;
          }

          const delta = (chunk as StreamChunk).choices?.[0]?.delta;
          if (!delta) continue;

          // Accumulate content
          if (delta.content) {
            accumulatedContent += delta.content;
          }

          // Accumulate tool calls (index-based merging per OpenAI spec)
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls as ChoiceDeltaToolCall[]) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || "",
                  type: "function",
                  function: {
                    name: "",
                    arguments: "",
                  },
                };
              }

              if (tc.id) {
                toolCalls[tc.index].id = tc.id;
              }
              if (tc.function?.name) {
                toolCalls[tc.index].function.name += tc.function.name;
              }
              if (tc.function?.arguments) {
                toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          }

          // Update assistant message in state
          const updatedAssistant: ChatCompletionAssistantMessageParam = {
            role: "assistant",
            content: accumulatedContent || null,
            ...(toolCalls.length > 0 && {
              tool_calls: toolCalls.filter(Boolean),
            }),
          };
          state.replaceLastMessage(updatedAssistant);
        }

        // Finalize
        state.status = "ready";
        abortControllerRef.current = null;

        // Invoke onToolCall for each complete tool call (after stream ends)
        // This ensures we have the complete tool call with all arguments
        if (options.onToolCall) {
          for (const toolCall of toolCalls) {
            if (
              isCompleteToolCall(toolCall) &&
              !notifiedToolCallsRef.current.has(toolCall.id)
            ) {
              notifiedToolCallsRef.current.add(toolCall.id);
              // Fire and forget - don't await to allow parallel tool execution
              Promise.resolve(stableOnToolCall!({ toolCall })).catch((err) => {
                console.error("Error in onToolCall:", err);
              });
            }
          }
        }

        // Call onFinish callback
        stableOnFinish?.({
          message: state.messages[state.messages.length - 1],
          messages: state.messages,
          isAbort,
          isDisconnect,
          isError,
        });

        // Check for auto-send after stream completes
        if (!isAbort && !isError) {
          const shouldAutoSend = await stableSendAutomaticallyWhen?.({
            messages: state.messages,
          });
          if (shouldAutoSend) {
            // Auto-send without adding a new user message
            await performRequest(requestOptions);
          }
        }
      } catch (err) {
        // Handle abort errors
        if (err instanceof Error && err.name === "AbortError") {
          isAbort = true;
          state.status = "ready";
          abortControllerRef.current = null;

          stableOnFinish?.({
            message: state.messages[state.messages.length - 1],
            messages: state.messages,
            isAbort: true,
            isDisconnect: false,
            isError: false,
          });
          return;
        }

        isError = true;

        // Detect network/disconnect errors
        if (
          err instanceof TypeError &&
          (err.message.toLowerCase().includes("fetch") ||
            err.message.toLowerCase().includes("network"))
        ) {
          isDisconnect = true;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        state.error = error;
        state.status = "error";
        abortControllerRef.current = null;

        stableOnError?.(error);

        stableOnFinish?.({
          message: state.messages[state.messages.length - 1],
          messages: state.messages,
          isAbort,
          isDisconnect,
          isError,
        });
      }
    },
    [
      state,
      resolveTransport,
      stablePrepareRequestBody,
      stableOnError,
      stableOnFinish,
      stableOnToolCall,
      stableSendAutomaticallyWhen,
    ]
  );

  const sendMessage = useCallback(
    async (
      messageInput: Message | string,
      requestOptions?: ChatRequestOptions
    ): Promise<void> => {
      // Normalize string input to Message
      const userMessage: Message =
        typeof messageInput === "string"
          ? { role: "user", content: messageInput }
          : messageInput;

      // Add user message to state
      state.pushMessage(userMessage);

      // Perform the request
      await performRequest(requestOptions);
    },
    [state, performRequest]
  );

  const addToolResult = useCallback(
    ({ toolCallId, result }: AddToolResultOptions): void => {
      // Create tool message
      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: toolCallId,
        content: typeof result === "string" ? result : JSON.stringify(result),
      };

      // Add to messages
      state.pushMessage(toolMessage);

      // Check if should auto-send
      Promise.resolve(
        stableSendAutomaticallyWhen?.({ messages: state.messages })
      ).then((shouldAutoSend) => {
        if (shouldAutoSend) {
          // Auto-send without adding a new user message
          performRequest();
        }
      });
    },
    [state, stableSendAutomaticallyWhen, performRequest]
  );

  return {
    id: idRef.current,
    messages,
    status,
    error,
    sendMessage,
    setMessages,
    stop,
    addToolResult,
  };
}

// Alias for backwards compatibility
export const useDedalusChat = useChat;
