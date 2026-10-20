import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth-fetch";
import { publicCount } from "@/lib/public-count";

interface LikeButtonProps {
  quizId: string;
  initialLikes: number;
  initialLiked?: boolean;
}

export default function LikeButton({ quizId, initialLikes, initialLiked = false }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const userHasToggled = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLikeState() {
      // Signed-out visitors skip the request entirely (auth: "required"): the
      // count still renders and there is no like state to read.
      const res = await apiFetch<{ liked: boolean }>(`/quizzes/${quizId}/like`, { auth: "required" });
      if (!cancelled && !userHasToggled.current && typeof res.data?.liked === "boolean") {
        setLiked(res.data.liked);
      }
    }

    loadLikeState();

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  async function toggleLike() {
    if (loading) return;
    setLoading(true);
    userHasToggled.current = true;

    const res = await apiFetch(`/quizzes/${quizId}/like`, { method: liked ? "DELETE" : "POST" });

    if (res.unauthenticated) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    if (!res.error) {
      setLiked(!liked);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
    }

    setLoading(false);
  }

  // Below the public threshold the count is hidden, and the button is an icon, not an empty bar.
  const count = publicCount(likes);

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      aria-label={liked ? "Remover curtida" : "Curtir"}
      className={`flex h-10 items-center justify-center gap-2 rounded-xl border-2 font-bold transition-all duration-200 ${
        count === null ? "w-11" : "px-4"
      } ${
        liked
          ? "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
          : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:border-red-500/30 hover:text-red-500"
      }`}
    >
      <svg
        className={`h-5 w-5 transition-transform ${liked ? "scale-110" : ""} ${loading ? "animate-pulse" : ""}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {count !== null && <span>{count}</span>}
    </button>
  );
}
