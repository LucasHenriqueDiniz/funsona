import type { APIRoute } from "astro";
import { apiFetch } from "@/lib/api";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  try {
    const res = await apiFetch(`/quizzes/${slug}`);
    if (!res || res.error || !res.data) {
      return new Response("Quiz not found", { status: 404 });
    }
    const quiz = res.data;

    const title = escapeXml(truncate(quiz.title || "Quiz", 80));
    const description = escapeXml(truncate(quiz.description || "", 140));
    const author = escapeXml(quiz.author?.display_name || quiz.author?.handle || "FunSona");
    const typeLabel = quiz.type === "TRIVIA" ? "🧠 Trivia" : "✨ Personalidade";
    const stats = `${quiz.attempts_count || 0} jogadas · ${quiz.likes_count || 0} curtidas`;
    const cover = quiz.cover_url ? escapeXml(quiz.cover_url) : null;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#db2777"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="80" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <clipPath id="coverClip">
      <rect x="720" y="40" width="440" height="550" rx="24"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="150" cy="100" r="200" fill="#4f46e5" opacity="0.25" filter="url(#glow)"/>
  <circle cx="1100" cy="550" r="250" fill="#db2777" opacity="0.2" filter="url(#glow)"/>

  <g transform="translate(60, 60)">
    <g fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 48h32"/>
      <path d="M40 8v8"/>
      <path d="M73 26l-7 7"/>
      <path d="M96 40h-8"/>
      <path d="M16 40H8"/>
      <path d="M25 18l-7-7"/>
      <path d="M30 55l-6 6A22 22 0 0054 74l6-6"/>
      <path d="M54 37A16 16 0 1030 55"/>
    </g>
    <text x="0" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#818cf8" letter-spacing="3">FUNSONA</text>

    <rect x="0" y="145" width="220" height="44" rx="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <text x="110" y="174" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="white">${typeLabel}</text>

    <text x="0" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="white" letter-spacing="-1.5">${title}</text>
`;

    if (description) {
      svg += `    <text x="0" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="400" fill="rgba(255,255,255,0.75)">${description}</text>\n`;
    }

    svg += `    <rect x="0" y="380" width="80" height="6" rx="3" fill="url(#accent)"/>
    <text x="0" y="430" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="rgba(255,255,255,0.7)">por ${author}</text>
    <text x="0" y="470" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.5)">${stats}</text>
  </g>
`;

    if (cover) {
      svg += `
  <g clip-path="url(#coverClip)">
    <image href="${cover}" x="720" y="40" width="440" height="550" preserveAspectRatio="xMidYMid slice"/>
    <rect x="720" y="40" width="440" height="550" fill="url(#bg)" opacity="0.15"/>
  </g>
  <rect x="720" y="40" width="440" height="550" rx="24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
`;
    } else {
      svg += `
  <g transform="translate(780, 120)" opacity="0.15">
    <circle cx="180" cy="180" r="160" fill="#4f46e5"/>
    <circle cx="120" cy="280" r="100" fill="#db2777"/>
    <circle cx="280" cy="100" r="80" fill="#7c3aed"/>
  </g>
`;
    }

    svg += `  <text x="1160" y="600" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="rgba(255,255,255,0.35)">funsona.com</text>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("OG generation error:", err);
    return new Response("Error generating image", { status: 500 });
  }
};
