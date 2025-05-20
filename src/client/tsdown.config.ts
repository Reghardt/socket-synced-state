import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src"],
  dts: {
    sourcemap: true,
  },
});
