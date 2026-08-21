import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth-fetch";

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

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-200 ${
        liked
          ? "bg-red-500/10 text-red-500 border-2 border-red-500/30 hover:bg-red-500/20"
          : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-2 border-[var(--color-border)] hover:border-red-500/30 hover:text-red-500 transition"
      }`}
    >
      <svg
        className={`w-5 h-5 transition-transform ${liked ? "scale-110" : ""} ${loading ? "animate-pulse" : ""}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{likes}</span>
    </button>
  );
}
