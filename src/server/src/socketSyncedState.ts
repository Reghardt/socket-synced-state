import type { Server, Socket } from "socket.io";
import z from "zod";

export function createSocketState<T>(
  io: Server,
  eventName: string,
  schema: z.ZodType<T>,
  initialValue: T,
  hooks?: {
    preCommit?: (value: T) => boolean;
    postCommit?: (value: T) => void;
  }
) {
  let value = initialValue;

  const getValue = () => value;

  const setValue = (newValue: T) => {
    value = newValue;
    io.emit(eventName, value); // broadcast update
  };

  const register = (socket: Socket) => {
    z;
    socket.on(`get_${eventName}`, () => {
      socket.emit(eventName, value); // only emit to requester
    });

    socket.on(`set_${eventName}`, (incoming) => {
      // console.log(`Received ${eventName} update:`, incoming);
      try {
        const parsed = schema.parse(incoming);
        if (hooks?.preCommit) {
          const shouldCommit = hooks.preCommit(parsed);
          if (!shouldCommit) {
            console.warn(`Pre-commit hook failed for ${eventName}`);
            return;
          }
        }
        value = parsed;
        io.emit(eventName, value);
        if (hooks?.postCommit) {
          hooks.postCommit(parsed);
        }
      } catch (err) {
        console.error(`Invalid payload for ${eventName}:`, incoming, err);
      }
    });
  };

  return {
    get: getValue,
    set: setValue,
    register,
  };
}

export type StateDefinition<T, Z extends T> = {
  io: Server;
  schema: z.ZodType<T>;
  initialValue: Z;
  hooks?: {
    preCommit?: (value: T) => boolean;
    postCommit?: (value: T) => void;
  };
};

export type StateDefinitions = {
  [key: string]: StateDefinition<any, any>;
};

export type ServerState<T, Z> = {
  get: () => T;
  set: (value: T) => void;
  register: (socket: Socket) => void;
  initial: Z;
};

export type ServerStates<T extends StateDefinitions> = {
  [K in keyof T]: T[K] extends StateDefinition<infer U, infer Z>
    ? ServerState<U, Z>
    : never;
};

export type CreateClientSideStateTypes<T> = {
  [K in keyof T]: T[K] extends ServerState<infer U, infer Z>
    ? { type: U; initial: Z }
    : never;
};

// defineState now has two generic parameters
export function defineState<T, Z extends T>(
  io: Server,
  schema: z.ZodType<T>, // T is inferred from schema (e.g., z.number() -> number)
  initialValue: Z, // Z is inferred from the initialValue parameter (e.g., 42 as const -> 42)
  hooks?: {
    preCommit?: (value: T) => boolean;
    postCommit?: (value: T) => void;
  }
): StateDefinition<T, Z> {
  return {
    io,
    schema,
    initialValue, // The runtime value here has type Z
    hooks,
  };
}

// Register function that creates socket-synced states
export function createSocketSyncedState<T extends StateDefinitions>(
  methods: T
): ServerStates<T> {
  const states = {} as ServerStates<T>;

  for (const [key, definition] of Object.entries(methods)) {
    console.log(`Registering state for: ${key}`);

    // Create socket state using the key as the event name
    const socketState = createSocketState(
      definition.io,
      key,
      definition.schema,
      definition.initialValue,
      definition.hooks
    );

    // Add to the states object
    (states as any)[key] = socketState;
  }

  return states;
}

export function registerAllStates<T extends StateDefinitions>(
  states: ServerStates<T>,
  socket: Socket
): void {
  Object.entries(states).forEach(([key, state]) => {
    state.register(socket);
  });
}
