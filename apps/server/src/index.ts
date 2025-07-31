import {
  createGlobalStates,
  createNodeDataAdapter,
  createNodeSocketAdapter,
  defineState,
  listen,
  registerGlobalStates,
  type CreateClientSideStateTypes,
} from "sss-server";
import z from "zod";
import { WebSocketServer } from "ws";

const clients = new Set<WebSocket>();

const states = createGlobalStates({
  state_1: defineState(z.object({ val: z.number(), str: z.string() }), {
    val: 42,
    str: "Hello",
  }),
  state_2: defineState(z.number(), 100),
  state_3: defineState(z.number(), 100),
});

export type States = CreateClientSideStateTypes<typeof states>;

const wss = new WebSocketServer({ port: 8000 });

console.log("WebSocket server started on ws://localhost:8000");

wss.on("connection", (socket) => {
  console.log("Client connected!");

  clients.add(createNodeSocketAdapter(socket));
  console.log("a client connected!");
  registerGlobalStates(states, clients);

  socket.on("message", (data) => {
    listen(states, createNodeDataAdapter(data));
  });

  socket.on("close", (code, reason) => {
    console.log("Client disconnected:", code, reason?.toString());
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
