import { useState, useEffect } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PremiumGate({ children, fallback }: PremiumGateProps) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsPremium(data.data.is_premium || false);
        }
      })
      .catch(() => setIsPremium(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-32" />
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-8 text-center">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Recurso Premium</h3>
      <p className="text-gray-600 mb-6">
        Desbloqueie estatísticas avançadas, remova anúncios e ganhe um badge exclusivo no seu perfil.
      </p>
      <a
        href="/premium"
        className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
      >
        Virar Premium — R$ 19,90/mês
      </a>
    </div>
  );
}
