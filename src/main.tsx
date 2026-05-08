import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import config from "../granite.config.ts";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
        <App />
      </TDSMobileAITProvider>
    </ErrorBoundary>
  </StrictMode>,
);
