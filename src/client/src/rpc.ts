import { useCallback } from "react";
import { Socket } from "socket.io-client";

type TransformProcedureToHookFunctions<
  OriginalProcedureTypesMap extends Record<string, any>
> = {
  [K in keyof OriginalProcedureTypesMap]: (options: {
    onSuccess?: (result: OriginalProcedureTypesMap[K]["result"]) => void;
    onError?: (err: Error) => void;
  }) => {
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
  const call = useCallback(
    (params: Params) => {
      if (!socket) {
        options.onError?.(new Error("Socket not connected"));
        return;
      }

      try {
        // possibly validate params here
      } catch (err) {
        options.onError?.(
          new Error("Validation failed: " + (err as Error).message)
        );
        return;
      }

      console.log("rpc fire");

      socket.emit(
        `rpc_${method}`,
        (() => {
          console.log("args", { method, params });
          return { method, params };
        })(),
        (response: any) => {
          console.log(`rpc_${method}`, response);
          if (response?.error) {
            options.onError?.(new Error(response.error));
          } else {
            options.onSuccess?.(response.result as Result);
          }
        }
      );
    },
    [socket, method]
  );

  return { call };
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
