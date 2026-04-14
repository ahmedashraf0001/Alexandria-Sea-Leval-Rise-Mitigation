import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/Alexandria-Sea-Leval-Rise-Mitigation/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5219",
        changeOrigin: true,
      },
    },
  },
});
