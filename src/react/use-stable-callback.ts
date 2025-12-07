"use client";
import { useRef, useLayoutEffect, useCallback } from "react";

/**
 * Creates a stable callback reference that always invokes the latest version.
 *
 * This solves the stale closure problem where callbacks passed to hooks capture
 * values at the time of creation. By using this hook, the returned callback
 * will always call the most recent version of the function, ensuring it sees
 * the latest values from the component's scope.
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0)
 *
 * // Without useStableCallback: onClick would always see count = 0
 * // With useStableCallback: onClick always sees current count
 * const stableOnClick = useStableCallback(() => {
 *   console.log(count) // Always logs current count
 * })
 * ```
 */
export function useStableCallback<T extends ((...args: any[]) => any) | undefined>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update the ref synchronously on every render
  // useLayoutEffect ensures this happens before any other effects
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return a stable callback that always calls the latest version
  // The empty deps array ensures this callback reference never changes
  const stableCallback = useCallback(
    (...args: T extends (...args: infer A) => any ? A : never[]) => {
      return callbackRef.current?.(...args);
    },
    []
  );

  return stableCallback as T;
}
