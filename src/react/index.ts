export { useChat, useDedalusChat } from "./use-chat";
export type {
  // Core hook types
  Message,
  DedalusChatStatus,
  ChatRequestOptions,
  UseDedalusChatOptions,
  UseDedalusChatReturn,
  IdGenerator,
  // Re-exported from dedalus-labs SDK (type-only, no runtime impact)
  StreamChunk,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionDeveloperMessageParam,
  ChatCompletionFunctionMessageParam,
  ChoiceDelta,
  ChoiceDeltaToolCall,
} from "./types";
