import { createSSSContext } from "@socket-synced-state/client";
import type { States } from "@mono/server";
import type { Procs } from "@mono/server";

export const { SSSProvider, useSSS, useSocket } = createSSSContext<
  States,
  Procs
>();
