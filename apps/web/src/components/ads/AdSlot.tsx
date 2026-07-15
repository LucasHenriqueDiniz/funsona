import { useEffect, useRef } from "react";

interface AdSlotProps {
  slot?: string;
  format?: string;
  label?: string;
  className?: string;
}

/**
 * Manual AdSense ad unit. Used for placements we control explicitly
 * (e.g. every N questions during quiz play) instead of relying on
 * Auto Ads, which can place ads on low-content screens and trigger
 * "low value content" review rejections.
 */
export default function AdSlot({ slot, format = "auto", label = "Publicidade", className = "" }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      // @ts-expect-error - adsbygoogle is injected by the AdSense loader script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded (dev, blocked, no client id) — fail silently
    }
  }, []);

  const client = import.meta.env.PUBLIC_GOOGLE_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
