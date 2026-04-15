import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

function getAndroidVersionTag(): string {
  try {
    const gradlePath = resolve(__dirname, "android/app/build.gradle");
    const gradle = readFileSync(gradlePath, "utf8");
    const codeMatch = gradle.match(/versionCode\s+(\d+)/);
    const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
    if (!codeMatch || !nameMatch) return "v0.0.0 (0)";
    return `v${nameMatch[1]} (${codeMatch[1]})`;
  } catch {
    return "v0.0.0 (0)";
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the app loads inside Capacitor’s WebView
  base: "./",
  plugins: [vue()],
  define: {
    __APP_VERSION_TAG__: JSON.stringify(getAndroidVersionTag()),
  },
  server: {
    host: true,
    port: 5173,
  },
});
