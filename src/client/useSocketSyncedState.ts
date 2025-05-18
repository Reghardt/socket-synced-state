import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

export function useSocketSyncedState<T>(
  socket: Socket | null,
  eventName: string,
  initialValue: T
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  // Fetch latest from server
  useEffect(() => {
    if (socket) {
      console.log(`get_${eventName}`);
      socket.emit(`get_${eventName}`);
    }
  }, [socket, eventName]);

  // Listen for server-pushed updates
  useEffect(() => {
    if (!socket) return () => {};

    const handler = (incoming: T) => {
      console.log("incoming");
      try {
        setValue(incoming); // update from server, no emit
      } catch (err) {
        console.error(`Invalid data for ${eventName}:`, incoming, err);
      }
    };

    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
    };
  }, [socket, eventName]);

  // Support functional updates with current state + emit
  const setAndEmit = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (prev: T) => T)(prev)
            : updater;

        socket?.emit(`set_${eventName}`, next);
        return next;
      });
    },
    [socket, eventName]
  );

  return [value, setAndEmit];
}
