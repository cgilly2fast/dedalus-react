export { useChat, useDedalusChat } from "./use-chat";
export { useStableCallback } from "./use-stable-callback";
export type {
  // Core hook types
  Message,
  DedalusChatStatus,
  ChatRequestOptions,
  UseDedalusChatOptions,
  UseDedalusChatReturn,
  IdGenerator,
  // Transport types
  Resolvable,
  TransportConfig,
  PrepareRequestBodyOptions,
  // Tool calling and auto-send types
  ToolCall,
  OnFinishOptions,
  OnToolCallOptions,
  SendAutomaticallyWhenOptions,
  AddToolResultOptions,
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
