import { useState } from "react";
import { apiFetch } from "@/lib/auth-fetch";

// This used to be an `is:inline` script on premium.astro, which couldn't
// import the shared client and so hand-rolled a cookie-credentialed fetch.
// It's an island now so it goes through apiFetch like everything else — and
// so the Clerk token never has to be inlined into cacheable HTML.
export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setError("");
    setLoading(true);

    const res = await apiFetch<{ url: string }>("/stripe/checkout", { method: "POST", auth: "required" });

    if (res.data?.url) {
      window.location.href = res.data.url;
      return;
    }

    if (res.unauthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent("/premium")}`;
      return;
    }

    setError(res.error || "Erro ao iniciar checkout");
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full max-w-md mx-auto px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg disabled:opacity-60"
      >
        {loading ? "Redirecionando..." : "Assinar Premium"}
      </button>
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
    </div>
  );
}
