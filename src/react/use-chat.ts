"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { DedalusChatState } from "./chat-state";
import { parseSSEStream } from "./parse-sse-stream";
import type {
  Message,
  StreamChunk,
  UseDedalusChatOptions,
  UseDedalusChatReturn,
  ChatRequestOptions,
  ChatCompletionAssistantMessageParam,
  ChoiceDeltaToolCall,
} from "./types";

interface ToolCallAccumulator {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Default ID generator using crypto.randomUUID
 */
const defaultGenerateId = (): string => crypto.randomUUID();

/**
 * A simple chat hook that works with Dedalus's Message types and StreamChunk format.
 * Compatible with OpenAI Chat Completions API message format.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, status } = useChat({
 *   api: '/api/chat',
 *   onFinish: ({ message }) => console.log('Done:', message),
 * })
 *
 * // Send a simple text message
 * await sendMessage('Hello!')
 *
 * // Send with custom body
 * await sendMessage('Hello!', { body: { model: 'gpt-4' } })
 * ```
 */
export function useChat(options: UseDedalusChatOptions): UseDedalusChatReturn {
  const {
    api,
    id: providedId,
    messages: initialMessages,
    generateId = defaultGenerateId,
    headers: defaultHeaders,
    credentials,
    fetch: customFetch = globalThis.fetch,
    prepareRequestBody,
    onError,
    onFinish,
  } = options;

  const idRef = useRef<string>(providedId ?? generateId());
  const stateRef = useRef<DedalusChatState>(
    new DedalusChatState(initialMessages),
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle id changes
  if (providedId && providedId !== idRef.current) {
    idRef.current = providedId;
    stateRef.current = new DedalusChatState(initialMessages);
  }

  const state = stateRef.current;

  // Subscribe to state with useSyncExternalStore
  const messages = useSyncExternalStore(
    state.subscribeMessages,
    state.getMessagesSnapshot,
    state.getMessagesSnapshot,
  );

  const status = useSyncExternalStore(
    state.subscribeStatus,
    state.getStatusSnapshot,
    state.getStatusSnapshot,
  );

  const error = useSyncExternalStore(
    state.subscribeError,
    state.getErrorSnapshot,
    state.getErrorSnapshot,
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
    [state],
  );

  const sendMessage = useCallback(
    async (
      messageInput: Message | string,
      requestOptions?: ChatRequestOptions,
    ): Promise<void> => {
      // Normalize string input to Message
      const userMessage: Message =
        typeof messageInput === "string"
          ? { role: "user", content: messageInput }
          : messageInput;

      // Add user message to state
      state.pushMessage(userMessage);
      state.status = "submitted";
      state.error = undefined;

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Build request body
        const currentMessages = state.messages;
        const defaultBody = {
          id: idRef.current,
          messages: currentMessages,
          ...requestOptions?.body,
        };

        const body = prepareRequestBody
          ? prepareRequestBody({
              id: idRef.current,
              messages: currentMessages,
              body: requestOptions?.body,
            })
          : defaultBody;

        // Merge headers
        const mergedHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(defaultHeaders instanceof Headers
            ? Object.fromEntries(defaultHeaders.entries())
            : defaultHeaders),
          ...(requestOptions?.headers instanceof Headers
            ? Object.fromEntries(requestOptions.headers.entries())
            : requestOptions?.headers),
        };

        // Make request
        const response = await customFetch(api, {
          method: "POST",
          headers: mergedHeaders,
          body: JSON.stringify(body),
          credentials,
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
        const toolCalls: ToolCallAccumulator[] = [];

        for await (const chunk of parseSSEStream(response.body)) {
          if (abortController.signal.aborted) break;

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

        onFinish?.({
          message: state.messages[state.messages.length - 1],
          messages: state.messages,
        });
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          state.status = "ready";
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        state.error = error;
        state.status = "error";
        abortControllerRef.current = null;

        onError?.(error);
      }
    },
    [
      state,
      api,
      defaultHeaders,
      credentials,
      customFetch,
      prepareRequestBody,
      onError,
      onFinish,
    ],
  );

  return {
    id: idRef.current,
    messages,
    status,
    error,
    sendMessage,
    setMessages,
    stop,
  };
}

// Alias for backwards compatibility
export const useDedalusChat = useChat;
