import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { createClientStateProxy } from "./createClientStateProxy";
import { createClientProcedureProxy } from "./rpc";

export function createSSSContext<
  T extends Record<string, any>,
  U extends Record<string, any>
>() {
  type SSSContext = {
    socket: Socket | null;
    state: ReturnType<typeof createClientStateProxy<T>>;
    procedures: ReturnType<typeof createClientProcedureProxy<U>>;
  };

  const SocketContext = createContext<SSSContext | null>(null);

  const SSSProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
      const socketInstance = io("http://localhost:3000");
      socketInstance.on("connect", () => {});
      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }, []);

    return (
      <SocketContext.Provider
        value={{
          socket,
          state: createClientStateProxy<T>(socket),
          procedures: createClientProcedureProxy<U>(socket),
        }}
      >
        {children}
      </SocketContext.Provider>
    );
  };

  const useSSS = () => {
    const context = {
      state: useContext(SocketContext)?.state,
      proc: useContext(SocketContext)?.procedures,
    };
    if (!context) throw new Error("useSSS must be used within an SSSProvider");
    return context;
  };

  const useSocket = () => {
    const socket = useContext(SocketContext)?.socket ?? null;
    return socket;
  };

  return { SSSProvider, useSSS, useSocket };
}
