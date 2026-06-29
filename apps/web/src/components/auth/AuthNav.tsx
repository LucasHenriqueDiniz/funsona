import { useState, useEffect, useRef } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

interface User {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  xp?: number;
  level?: number;
}

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/auth/me`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch(`${PUBLIC_API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    window.location.reload();
  }

  if (loading) {
    return <div className="h-10 w-10 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />;
  }

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/75 px-1.5 py-1.5 text-sm font-black text-[var(--color-text-secondary)] transition hover:border-brand-300 hover:text-[var(--color-text-primary)]"
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.display_name} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-brand-500 to-accent-500 text-sm font-black text-white">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden max-w-28 truncate md:inline">{user.display_name}</span>
          <svg className={`mr-1 h-4 w-4 text-[var(--color-text-muted)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-3xl border border-[var(--color-border)] py-2 shadow-2xl shadow-slate-950/15 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 dark:shadow-black/30"
            style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
            <div className="border-b border-[var(--color-border)] px-4 py-4">
              <p className="font-black text-[var(--color-text-primary)]">{user.display_name}</p>
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">@{user.handle}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-black text-brand-600 dark:text-brand-400">
                  Nv. {user.level || 1}
                </span>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">{user.xp || 0} XP</span>
              </div>
            </div>
            <a href="/profile/me" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-brand-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Meu Perfil
            </a>
            <a href="/quiz/new" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-brand-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Quiz
            </a>
            <a href="/leaderboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-brand-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Ranking
            </a>
            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-red-500 transition hover:bg-red-500/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a href="/login" className="hidden rounded-2xl px-3 py-2 text-sm font-black text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] sm:inline">
        Entrar
      </a>
      <a href="/register" className="rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5">
        Criar conta
      </a>
    </div>
  );
}
