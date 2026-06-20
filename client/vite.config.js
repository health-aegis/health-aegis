import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// All API routes are served from the single api-gateway on port 5000
const API_GATEWAY_URL = process.env.VITE_API_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy all /api/* requests to the monolithic api-gateway
      '/api': {
        target: API_GATEWAY_URL,
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO WebSocket connections
      '/socket.io': {
        target: API_GATEWAY_URL,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
