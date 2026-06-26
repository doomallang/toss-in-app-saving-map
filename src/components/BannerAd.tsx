import { useEffect, useRef } from "react";
import { useTossBanner } from "../hooks/useTossBanner";

const BANNER_AD_GROUP_ID = "ait.v2.live.e65b67eab92f4131";

export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isInitialized, attachBanner } = useTossBanner();

  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    const attached = attachBanner(BANNER_AD_GROUP_ID, containerRef.current, {
      theme: "auto",
      tone: "blackAndWhite",
      variant: "expanded",
    });

    return () => {
      attached?.destroy();
    };
  }, [isInitialized, attachBanner]);

  return <div ref={containerRef} style={{ width: "100%", height: "96px" }} />;
}
