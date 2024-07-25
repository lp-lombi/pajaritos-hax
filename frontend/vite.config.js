import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 8001,
        proxy: {
            "/game": "http://localhost:8000",
            "/room": "http://localhost:8000",
            "/players": "http://localhost:8000",
        },
    },
});
