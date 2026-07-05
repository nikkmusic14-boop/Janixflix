import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend API URL. Override with VITE_API_URL if you deploy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
