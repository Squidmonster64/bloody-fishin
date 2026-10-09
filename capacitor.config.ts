import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bloodydaves.fishin",
  appName: "Bloody Fishin",
  webDir: "dist/public",
  backgroundColor: "#111a14",
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  server: {
    cleartext: false,
    iosScheme: "capacitor",
  },
};

export default config;
