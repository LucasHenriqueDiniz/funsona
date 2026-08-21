import { useProfile } from "@/lib/use-profile";

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PremiumGate({ children, fallback }: PremiumGateProps) {
  const { isLoaded, isSignedIn, profile, profileError } = useProfile();

  if (!isLoaded || (isSignedIn && !profile && !profileError)) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-32" />
    );
  }

  if (profile?.is_premium) {
    return <>{children}</>;
  }

  // A signed-in user whose profile we couldn't load is not a prospect: pitching
  // an upgrade to someone who may already be paying reads as broken. Show the
  // caller's fallback (or nothing) until we actually know.
  if (isSignedIn && profileError) {
    return <>{fallback ?? null}</>;
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
