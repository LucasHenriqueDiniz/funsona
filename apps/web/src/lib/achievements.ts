import type { Locale } from "@/lib/i18n";

type AchievementText = {
  name: string;
  description: string;
};

const achievementText: Record<string, Record<Locale, AchievementText>> = {
  first_quiz: {
    pt: { name: "Primeiro Quiz", description: "Complete seu primeiro quiz." },
    en: { name: "First Quiz", description: "Complete your first quiz." },
    es: { name: "Primer Quiz", description: "Completa tu primer quiz." },
  },
  quizzes_10: {
    pt: { name: "Curioso", description: "Complete 10 quizzes." },
    en: { name: "Curious", description: "Complete 10 quizzes." },
    es: { name: "Curioso", description: "Completa 10 quizzes." },
  },
  quizzes_50: {
    pt: { name: "Viciado em Quiz", description: "Complete 50 quizzes." },
    en: { name: "Quiz Regular", description: "Complete 50 quizzes." },
    es: { name: "Fan de Quizzes", description: "Completa 50 quizzes." },
  },
  quizzes_100: {
    pt: { name: "Lendario", description: "Complete 100 quizzes." },
    en: { name: "Legendary", description: "Complete 100 quizzes." },
    es: { name: "Legendario", description: "Completa 100 quizzes." },
  },
  xp_100: {
    pt: { name: "Iniciante", description: "Acumule 100 XP." },
    en: { name: "Beginner", description: "Earn 100 XP." },
    es: { name: "Principiante", description: "Acumula 100 XP." },
  },
  xp_500: {
    pt: { name: "Experiente", description: "Acumule 500 XP." },
    en: { name: "Experienced", description: "Earn 500 XP." },
    es: { name: "Experimentado", description: "Acumula 500 XP." },
  },
  xp_1000: {
    pt: { name: "Mestre", description: "Acumule 1.000 XP." },
    en: { name: "Master", description: "Earn 1,000 XP." },
    es: { name: "Maestro", description: "Acumula 1.000 XP." },
  },
  xp_5000: {
    pt: { name: "Grao-Mestre", description: "Acumule 5.000 XP." },
    en: { name: "Grandmaster", description: "Earn 5,000 XP." },
    es: { name: "Gran Maestro", description: "Acumula 5.000 XP." },
  },
  streak_3: {
    pt: { name: "Em Ritmo", description: "Mantenha uma streak de 3 dias." },
    en: { name: "On Track", description: "Keep a 3-day streak." },
    es: { name: "En Ritmo", description: "Mantiene una racha de 3 dias." },
  },
  streak_7: {
    pt: { name: "Imparavel", description: "Mantenha uma streak de 7 dias." },
    en: { name: "Unstoppable", description: "Keep a 7-day streak." },
    es: { name: "Imparable", description: "Mantiene una racha de 7 dias." },
  },
  streak_30: {
    pt: { name: "Lenda Viva", description: "Mantenha uma streak de 30 dias." },
    en: { name: "Living Legend", description: "Keep a 30-day streak." },
    es: { name: "Leyenda Viva", description: "Mantiene una racha de 30 dias." },
  },
  creator_first: {
    pt: { name: "Criador", description: "Crie seu primeiro quiz." },
    en: { name: "Creator", description: "Create your first quiz." },
    es: { name: "Creador", description: "Crea tu primer quiz." },
  },
  creator_10: {
    pt: { name: "Produtor", description: "Crie 10 quizzes." },
    en: { name: "Producer", description: "Create 10 quizzes." },
    es: { name: "Productor", description: "Crea 10 quizzes." },
  },
  liked_5: {
    pt: { name: "Queridinho", description: "Receba 5 curtidas nos seus quizzes." },
    en: { name: "Crowd Favorite", description: "Receive 5 likes on your quizzes." },
    es: { name: "Favorito", description: "Recibe 5 me gusta en tus quizzes." },
  },
  liked_50: {
    pt: { name: "Influencer", description: "Receba 50 curtidas nos seus quizzes." },
    en: { name: "Influencer", description: "Receive 50 likes on your quizzes." },
    es: { name: "Influencer", description: "Recibe 50 me gusta en tus quizzes." },
  },
};

export function getAchievementText(slug: string, locale: Locale): AchievementText {
  return achievementText[slug]?.[locale] || achievementText[slug]?.pt || {
    name: slug.replace(/_/g, " "),
    description: "Conquista do FunSona.",
  };
}
