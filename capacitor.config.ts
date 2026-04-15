import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cosmicslime.app",
  appName: "Cosmic Games",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
