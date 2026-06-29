import { useState, useEffect, useCallback } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";
import { getAchievementText } from "@/lib/achievements";
import { getLocaleFromPath, type Locale } from "@/lib/i18n";

interface Achievement {
  id: string;
  slug: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  earned: boolean;
  earned_at: string | null;
}

interface AchievementBadgesProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function AchievementBadges({ userId, isOwnProfile = false }: AchievementBadgesProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const locale: Locale = typeof window === "undefined" ? "pt" : getLocaleFromPath(window.location.pathname);

  const API_URL = PUBLIC_API_BASE_URL;

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint = isOwnProfile ? `${API_URL}/users/me/achievements` : `${API_URL}/users/${userId}/achievements`;
      const res = await fetch(endpoint, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setAchievements(json.data || []);
      } else {
        setError(json.error || "Erro ao carregar conquistas");
      }
    } catch {
      setError("Erro ao carregar conquistas");
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile, API_URL]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-4 bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border)] animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-muted)]" />
            <div className="w-20 h-3 bg-[var(--color-surface-muted)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
        {error}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
        Nenhuma conquista disponível.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)] font-medium">
          {earnedCount} de {totalCount} desbloqueadas
        </p>
        <div className="w-32 h-2 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {achievements.map((a) => (
          (() => {
            const text = getAchievementText(a.slug, locale);
            return (
              <div
                key={a.id}
                className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${
                  a.earned
                    ? "bg-gradient-to-br from-brand-500/10 to-accent-500/10 border-brand-500/30 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10"
                    : "bg-[var(--color-surface-elevated)] border-[var(--color-border)] opacity-60 grayscale hover:opacity-80"
                }`}
                title={text.description}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                    a.earned
                      ? "bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-500/25"
                      : "bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {a.icon}
                </div>
                <span className={`text-xs font-bold text-center leading-tight ${a.earned ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
                  {text.name}
                </span>
                {a.xp_reward > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.earned ? "bg-brand-500/20 text-brand-500" : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"}`}>
                    +{a.xp_reward} XP
                  </span>
                )}
                {a.earned && a.earned_at && (
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(a.earned_at).toLocaleDateString(locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR")}
                  </span>
                )}
              </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}
