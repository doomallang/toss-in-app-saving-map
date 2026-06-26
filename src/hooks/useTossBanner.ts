import { TossAds, type TossAdsAttachBannerOptions } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useState } from "react";

let _initialized = false;

export function useTossBanner() {
  const [isInitialized, setIsInitialized] = useState(_initialized);

  useEffect(() => {
    if (_initialized) {
      setIsInitialized(true);
      return;
    }
    try { if (!TossAds.initialize.isSupported()) return; } catch { return; }

    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          _initialized = true;
          setIsInitialized(true);
        },
        onInitializationFailed: () => {},
      },
    });
  }, []);

  const attachBanner = useCallback(
    (adGroupId: string, element: HTMLElement, options?: TossAdsAttachBannerOptions) => {
      try { if (!TossAds.attachBanner.isSupported()) return undefined; } catch { return undefined; }
      if (!isInitialized) return undefined;
      return TossAds.attachBanner(adGroupId, element, options);
    },
    [isInitialized],
  );

  return { isInitialized, attachBanner };
}
