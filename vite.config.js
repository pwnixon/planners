import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [react()],
  // Local dev convenience: when @archera/design-system is npm-linked
  // (scripts/link-design-system.sh), edits in the local design-system/ hot-reload
  // here. dedupe forces a single React/MUI instance (the linked package has its own
  // node_modules), fs.allow serves the sibling dir, and excluding it from
  // optimizeDeps keeps edits live. All no-ops for the normal installed package / CI.
  resolve: {
    dedupe: ['react', 'react-dom', '@mui/material', '@mui/system', '@mui/private-theming', '@emotion/react', '@emotion/styled'],
  },
  optimizeDeps: { exclude: ['@archera/design-system'] },
  server: { fs: { allow: ['..'] } },
})
