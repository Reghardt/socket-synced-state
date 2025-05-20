import type { Socket } from "socket.io-client";
import { useSocketSyncedState } from "../useSocketSyncedState";

type TransformedStatesToHookFunctions<OriginalValueTypesMap extends Record<string, any>> = {
  [K in keyof OriginalValueTypesMap]: (
    initialValue: OriginalValueTypesMap[K]["initial"]
  ) => [
    OriginalValueTypesMap[K]["type"],
    (
      updater:
        | OriginalValueTypesMap[K]["type"]
        | ((prev: OriginalValueTypesMap[K]["type"]) => OriginalValueTypesMap[K]["type"])
    ) => void
  ];
};

export function createClientProxy<T extends Record<string, any>>(socket: Socket | null) {
  return new Proxy({} as TransformedStatesToHookFunctions<T>, {
    get: (target, prop) => {
      if (typeof prop === "string") {
        return (initialValue: any) => useSocketSyncedState(socket, prop, initialValue);
      }
      return undefined;
    },
  });
}
