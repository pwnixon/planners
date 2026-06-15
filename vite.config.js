import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [react()],
  // Force a single instance of shared libs — see design-system README. Without
  // this, the production build pulls a second @mui/@emotion/react copy from
  // ../_template/node_modules, so AppShell falls back to the default theme.
  resolve: {
    dedupe: ['react', 'react-dom', '@mui/material', '@mui/system', '@mui/private-theming', '@emotion/react', '@emotion/styled'],
  },
})
