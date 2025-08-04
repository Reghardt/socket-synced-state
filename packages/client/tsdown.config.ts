import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/index.tsx'],
    platform: 'neutral',
    dts: {
      sourcemap: true,
    },
  },
])
