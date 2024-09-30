import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 8001,
        proxy: {
            "/game": "http://38.54.45.173:42925",
            "/room": "http://38.54.45.173:42925",
            "/players": "http://38.54.45.173:42925",
            "/login": "http://38.54.45.173:42925",
        },
    },
});
