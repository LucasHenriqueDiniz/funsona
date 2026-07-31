import { useEffect, useRef } from "react";

/** Placement names used across the app, mapped to the numeric ad unit IDs that
 *  AdSense actually requires in `data-ad-slot`. The names on their own were
 *  being passed straight through (`data-ad-slot="quiz-landing"`), which AdSense
 *  rejects — the unit never fills, so every placement rendered as an empty box
 *  under a "Publicidade" label. Create the units in the AdSense dashboard and
 *  put their numeric IDs in these env vars. */
const SLOT_IDS: Record<string, string | undefined> = {
  "quiz-landing": import.meta.env.PUBLIC_ADSENSE_SLOT_QUIZ_LANDING,
  "quiz-play-interval": import.meta.env.PUBLIC_ADSENSE_SLOT_QUIZ_PLAY,
  "quiz-result": import.meta.env.PUBLIC_ADSENSE_SLOT_QUIZ_RESULT,
};

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

  const client = import.meta.env.PUBLIC_GOOGLE_ADSENSE_CLIENT;
  // AdSense unit IDs are numeric. Anything else means the placement has not been
  // configured yet, and pushing it would only produce a blank labelled box.
  const slotId = slot ? SLOT_IDS[slot] : undefined;
  const isConfigured = Boolean(client) && Boolean(slotId) && /^\d+$/.test(slotId ?? "");

  useEffect(() => {
    if (!isConfigured || pushed.current) return;
    pushed.current = true;
    try {
      // @ts-expect-error - adsbygoogle is injected by the AdSense loader script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded (dev, blocked, no client id) — fail silently
    }
  }, [isConfigured]);

  if (!isConfigured) return null;

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
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
