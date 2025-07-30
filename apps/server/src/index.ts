import { createStates, defineState, listen, registerStates } from "sss-server";
import z from "zod";

const states = createStates({
  state_1: defineState(z.object({ val: z.number(), str: z.string() }), {
    val: 42,
    str: "Hello",
  }),
  state_2: defineState(z.number(), 100),
});

const socket = new WebSocket("ws://localhost:8080");

socket.addEventListener("open", (event) => {
  console.log("WebSocket connection established!");
  registerStates(states, socket);
});

socket.addEventListener("message", (event) => {
  listen(states, event);
});

socket.addEventListener("close", (event) => {
  console.log("WebSocket connection closed:", event.code, event.reason);
});

socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});
