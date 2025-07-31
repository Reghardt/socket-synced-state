import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createSSSContext } from "sss-client";
import type { States } from "server";

export const { SSSProvider, useSSS } = createSSSContext<States>(
  "ws://localhost:8000"
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SSSProvider>
      <App />
    </SSSProvider>
  </StrictMode>
);
