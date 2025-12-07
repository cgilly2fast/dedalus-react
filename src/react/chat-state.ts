import type { Message, DedalusChatStatus } from "./types";

/**
 * External state store for React 18 useSyncExternalStore pattern.
 * Manages messages, status, and error state with subscription callbacks.
 */
export class DedalusChatState {
  #messages: Message[];
  #status: DedalusChatStatus = "ready";
  #error: Error | undefined = undefined;

  #messagesCallbacks = new Set<() => void>();
  #statusCallbacks = new Set<() => void>();
  #errorCallbacks = new Set<() => void>();

  constructor(initialMessages: Message[] = []) {
    this.#messages = initialMessages;
  }

  get status(): DedalusChatStatus {
    return this.#status;
  }

  set status(newStatus: DedalusChatStatus) {
    if (this.#status === newStatus) return;
    this.#status = newStatus;
    this.#notifyStatusCallbacks();
  }

  get error(): Error | undefined {
    return this.#error;
  }

  set error(newError: Error | undefined) {
    this.#error = newError;
    this.#notifyErrorCallbacks();
  }

  get messages(): Message[] {
    return this.#messages;
  }

  set messages(newMessages: Message[]) {
    this.#messages = [...newMessages];
    this.#notifyMessagesCallbacks();
  }

  pushMessage = (message: Message): void => {
    this.#messages = [...this.#messages, message];
    this.#notifyMessagesCallbacks();
  };

  popMessage = (): void => {
    this.#messages = this.#messages.slice(0, -1);
    this.#notifyMessagesCallbacks();
  };

  replaceLastMessage = (message: Message): void => {
    if (this.#messages.length === 0) {
      this.pushMessage(message);
      return;
    }
    this.#messages = [...this.#messages.slice(0, -1), structuredClone(message)];
    this.#notifyMessagesCallbacks();
  };

  /**
   * Subscribe to messages changes for useSyncExternalStore.
   */
  subscribeMessages = (callback: () => void): (() => void) => {
    this.#messagesCallbacks.add(callback);
    return () => {
      this.#messagesCallbacks.delete(callback);
    };
  };

  /**
   * Subscribe to status changes for useSyncExternalStore.
   */
  subscribeStatus = (callback: () => void): (() => void) => {
    this.#statusCallbacks.add(callback);
    return () => {
      this.#statusCallbacks.delete(callback);
    };
  };

  /**
   * Subscribe to error changes for useSyncExternalStore.
   */
  subscribeError = (callback: () => void): (() => void) => {
    this.#errorCallbacks.add(callback);
    return () => {
      this.#errorCallbacks.delete(callback);
    };
  };

  /**
   * Get snapshot of messages for useSyncExternalStore.
   */
  getMessagesSnapshot = (): Message[] => {
    return this.#messages;
  };

  /**
   * Get snapshot of status for useSyncExternalStore.
   */
  getStatusSnapshot = (): DedalusChatStatus => {
    return this.#status;
  };

  /**
   * Get snapshot of error for useSyncExternalStore.
   */
  getErrorSnapshot = (): Error | undefined => {
    return this.#error;
  };

  #notifyMessagesCallbacks = (): void => {
    this.#messagesCallbacks.forEach((callback) => callback());
  };

  #notifyStatusCallbacks = (): void => {
    this.#statusCallbacks.forEach((callback) => callback());
  };

  #notifyErrorCallbacks = (): void => {
    this.#errorCallbacks.forEach((callback) => callback());
  };
}
