import type { Server, Socket } from "socket.io";

export function createSocketProcedure<TParams, TResult>(
  io: Server,
  eventName: string,
  handler: (params: TParams) => Promise<TResult> | TResult
) {
  const call = (params: TParams) => {
    const result = handler(params);
    io.emit(eventName, result); // broadcast update to all clients
    return result;
  };

  const register = (socket: Socket) => {
    socket.on(`rpc_${eventName}`, (incomming) => {
      call(incomming);
    });
  };

  return {
    call, // Expose the broadcast method
    register, // Expose the registration method for RPC
  };
}

export type SocketProcedureDefinition<TParams, TResult> = {
  io: Server;
  handler: (params: TParams) => Promise<TResult> | TResult;
};

export type SocketProcedureDefinitions = {
  [key: string]: SocketProcedureDefinition<any, any>;
};

export type ServerProcedure<TParams, TResult> = {
  call: (params: TParams) => TResult | Promise<TResult>;
  register: (socket: Socket) => void;
};

export type ServerProcedures<T extends SocketProcedureDefinitions> = {
  [K in keyof T]: T[K] extends SocketProcedureDefinition<infer U, infer Z>
    ? ServerProcedure<U, Z>
    : never;
};

export type CreateClientSideProcedureTypes<T> = {
  [K in keyof T]: T[K] extends ServerProcedure<infer U, infer Z>
    ? { params: U; result: Z }
    : never;
};

export function defineProcedure<TParams, TResult>(
  io: Server,
  handler: (params: TParams) => Promise<TResult> | TResult
) {
  return {
    io,
    handler,
  };
}

export function createSocketProcedures<T extends SocketProcedureDefinitions>(
  methods: T
): ServerProcedures<T> {
  const states = {} as ServerProcedures<T>;
  for (const [key, definition] of Object.entries(methods)) {
    console.log(`Registering \"${key}\" procedure`);
    const proc = createSocketProcedure(definition.io, key, definition.handler);

    (states as any)[key] = proc;
  }
  return states;
}

export function registerAllProcedures<T extends SocketProcedureDefinitions>(
  states: ServerProcedures<T>,
  socket: Socket
): void {
  Object.entries(states).forEach(([key, state]) => {
    state.register(socket);
  });
}
