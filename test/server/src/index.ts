import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { Server as HTTPServer } from "node:http";

import {
  createSocketSyncedState,
  defineState,
  registerAllStates,
  type CreateClientSideStateTypes,
} from "@socket-synced-state/server";
import { z } from "zod/v3";
import { Server } from "socket.io";

const app = new Hono();
const httpServer = serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});

const io = new Server(httpServer as HTTPServer, {
  cors: { origin: "*" },
});

const states = createSocketSyncedState({
  myNumStateX: defineState(io, z.number(), 100 as const),
  myObjState: defineState(
    io,
    z.object({
      val1: z.number(),
      val2: z.boolean(),
    }),
    {
      val1: 0,
      val2: false,
    } as const
  ),
});

export type States = CreateClientSideStateTypes<typeof states>;

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  registerAllStates(states, socket);
});

setInterval(() => {
  console.log(`State on server: ${states.myNumStateX.get()}`);
}, 1000);
