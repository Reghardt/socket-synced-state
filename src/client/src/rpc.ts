import { useCallback } from "react";
import { Socket } from "socket.io-client";

type TransformProcedureToHookFunctions<
  OriginalProcedureTypesMap extends Record<string, any>
> = {
  [K in keyof OriginalProcedureTypesMap]: (
    onSuccess?: (result: OriginalProcedureTypesMap[K]["result"]) => void
  ) => {
    call: (params: OriginalProcedureTypesMap[K]["params"]) => void;
  };
};

type RpcOptions<T = unknown> = {
  onSuccess?: (result: T) => void;
  onError?: (err: Error) => void;
};

export function useRpc<Params, Result = unknown>(
  socket: Socket | null,
  method: string,
  options: RpcOptions<Result> = {}
) {
  return useCallback(
    (params: Params) => {
      if (!socket) {
        options.onError?.(new Error("Socket not connected"));
        return;
      }

      try {
      } catch (err) {
        options.onError?.(
          new Error("Validation failed: " + (err as Error).message)
        );
        return;
      }

      console.log("rpc");

      socket.emit(`rpc_${method}`, { method, params }, (response: any) => {
        console.log(`rpc_${method}`);
        if (response?.error) {
          options.onError?.(new Error(response.error));
        } else {
          options.onSuccess?.(response.result as Result);
        }
      });
    },
    [socket, method]
  );
}

export function createClientProcedureProxy<T extends Record<string, any>>(
  socket: Socket | null
) {
  return new Proxy({} as TransformProcedureToHookFunctions<T>, {
    get: (target, prop) => {
      if (typeof prop === "string") {
        return (options?: RpcOptions<unknown>) => useRpc(socket, prop, options);
      }
    },
  });
}
