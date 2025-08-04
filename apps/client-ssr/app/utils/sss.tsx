import { createSSSContext } from "@socket-synced-state/client";
import type { States } from "server";

export const { SSSProvider, useSSS } = createSSSContext<States>(
  "ws://localhost:8000"
);
