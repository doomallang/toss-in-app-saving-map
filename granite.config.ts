import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "saving-map",
  brand: {
    displayName: "절약지도",
    primaryColor: "#12B886",
    // TODO: 배포 전 필수 — 정사각형(1:1) PNG, 512px 이상, 공개 접근 가능한 HTTPS URL로 교체
    icon: "",
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
