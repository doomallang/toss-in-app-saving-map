import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "saving-map",
  brand: {
    displayName: "절약지도",
    primaryColor: "#12B886",
    icon: "https://raw.githubusercontent.com/doomallang/toss-in-app-saving-map/main/public/icon.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite --host",
      build: "vite build",
    },
  },
  permissions: [
    {
      name: "geolocation",
      access: "access",
    },
  ],
  outdir: "dist",
  webViewProps: {
    type: "partner",
  },
});
