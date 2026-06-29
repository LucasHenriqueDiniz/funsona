export type ExploreLocale = "pt" | "en" | "es";

export interface CategoryText {
  name: string;
  headline: string;
  description: string;
}

export interface ExploreCategory {
  slug: string;
  emoji: string;
  image: string;
  aliases: string[];
  text: Record<ExploreLocale, CategoryText>;
}

export const sortOptions = [
  { label: "Mais recentes", value: "" },
  { label: "Mais curtidos", value: "likes" },
  { label: "Mais jogados", value: "plays" },
];

export const exploreCategories: ExploreCategory[] = [
  {
    slug: "personality",
    emoji: "✨",
    image: "https://quizpanda.com/what-color-is-my-aura/feature-image.jpg",
    aliases: ["personality", "personalidade", "personality-quiz", "persona"],
    text: {
      pt: {
        name: "Personalidade",
        headline: "Quizzes de personalidade para descobrir seu lado mais divertido.",
        description: "Encontre testes sobre estilo, aura, personagens, signos e resultados que todo mundo quer compartilhar.",
      },
      en: {
        name: "Personality",
        headline: "Personality quizzes to discover your most fun side.",
        description: "Find tests about style, aura, characters, signs, and results people love to share.",
      },
      es: {
        name: "Personalidad",
        headline: "Quizzes de personalidad para descubrir tu lado mas divertido.",
        description: "Encuentra tests sobre estilo, aura, personajes y resultados que todos quieren compartir.",
      },
    },
  },
  {
    slug: "trivia",
    emoji: "🧠",
    image: "https://quizpanda.com/which-scary-story-would-you-tell-around-the-campfire/feature-image.jpg",
    aliases: ["trivia", "curiosidades", "conhecimento", "knowledge-trivia"],
    text: {
      pt: {
        name: "Trivia",
        headline: "Teste seus conhecimentos com quizzes de trivia.",
        description: "Perguntas rapidas para desafiar memoria, cultura pop, curiosidades e fatos aleatorios.",
      },
      en: {
        name: "Trivia",
        headline: "Test your knowledge with trivia quizzes.",
        description: "Quick questions about pop culture, random facts, and general knowledge.",
      },
      es: {
        name: "Trivia",
        headline: "Pon a prueba tus conocimientos con quizzes de trivia.",
        description: "Preguntas rapidas sobre cultura pop, curiosidades y hechos aleatorios.",
      },
    },
  },
  {
    slug: "love",
    emoji: "💕",
    image: "https://res.cloudinary.com/dnql7wfjq/image/upload/v1763503932/quizhub/banners/rgdk0yyo9mgan0p5x98j.jpg",
    aliases: ["love", "amor", "romance", "crush", "relationship", "relacionamento"],
    text: {
      pt: {
        name: "Amor",
        headline: "Quizzes de amor, crush e compatibilidade.",
        description: "Descubra combinacoes, vibes romanticas e respostas leves para mandar no grupo ou para o crush.",
      },
      en: {
        name: "Love",
        headline: "Love quizzes about crushes and compatibility.",
        description: "Discover romantic vibes and fun answers to share with friends or your crush.",
      },
      es: {
        name: "Amor",
        headline: "Quizzes de amor, crush y compatibilidad.",
        description: "Descubre vibes romanticas y respuestas para compartir con amigos o con tu crush.",
      },
    },
  },
  {
    slug: "games",
    emoji: "🎮",
    image: "https://quizpanda.com/which-one-piece-character-would-be-your-arch-enemy/feature-image.jpg",
    aliases: ["games", "game", "gaming", "jogos", "videojuegos", "juego"],
    text: {
      pt: {
        name: "Games",
        headline: "Quizzes de games para jogadores de todos os estilos.",
        description: "Personagens, universos, desafios e nostalgia gamer reunidos em um so catalogo.",
      },
      en: {
        name: "Games",
        headline: "Game quizzes for every type of player.",
        description: "Characters, universes, challenges, and gamer nostalgia in one catalog.",
      },
      es: {
        name: "Games",
        headline: "Quizzes de videojuegos para todos los estilos.",
        description: "Personajes, mundos y nostalgia gamer reunidos en un solo catalogo.",
      },
    },
  },
  {
    slug: "movies",
    emoji: "🎬",
    image: "https://res.cloudinary.com/dnql7wfjq/image/upload/v1766094277/quizhub/banners/jdkwpldcd5zbkqtga6xm.jpg",
    aliases: ["movies", "movie", "filmes", "filme", "cinema", "peliculas"],
    text: {
      pt: {
        name: "Filmes",
        headline: "Quizzes de filmes para cinefilos casuais e viciados em cultura pop.",
        description: "Descubra personagens, generos favoritos, teorias e desafios sobre grandes historias do cinema.",
      },
      en: {
        name: "Movies",
        headline: "Movie quizzes for casual fans and pop-culture lovers.",
        description: "Discover characters, favorite genres, and challenges from iconic stories.",
      },
      es: {
        name: "Peliculas",
        headline: "Quizzes de peliculas para fans casuales y amantes de la cultura pop.",
        description: "Descubre personajes, generos favoritos y desafios sobre historias icónicas.",
      },
    },
  },
  {
    slug: "music",
    emoji: "🎵",
    image: "https://quizpanda.com/which-phineas-and-ferb-character-are-you/feature-image.jpg",
    aliases: ["music", "musica", "songs", "song", "musica-pop"],
    text: {
      pt: {
        name: "Musica",
        headline: "Quizzes de musica para descobrir sua trilha sonora.",
        description: "Artistas, letras, estilos e vibes musicais para jogar, comparar e compartilhar.",
      },
      en: {
        name: "Music",
        headline: "Music quizzes to discover your soundtrack.",
        description: "Artists, lyrics, styles, and vibes to play and share.",
      },
      es: {
        name: "Musica",
        headline: "Quizzes de musica para descubrir tu soundtrack.",
        description: "Artistas, letras y estilos para jugar y compartir.",
      },
    },
  },
  {
    slug: "tv",
    emoji: "📺",
    image: "https://quizpanda.com/which-shameless-character-are-you/feature-image.jpg",
    aliases: ["tv", "series", "serie", "television", "televisao"],
    text: {
      pt: {
        name: "TV",
        headline: "Quizzes de series, novelas e programas de TV.",
        description: "Personagens, episodios, fandoms e momentos marcantes da televisao em formato de quiz.",
      },
      en: {
        name: "TV",
        headline: "TV quizzes about series, shows, and iconic moments.",
        description: "Characters, episodes, fandoms, and unforgettable TV moments.",
      },
      es: {
        name: "TV",
        headline: "Quizzes de series, programas y momentos de TV.",
        description: "Personajes, episodios y fandoms en formato quiz.",
      },
    },
  },
  {
    slug: "knowledge",
    emoji: "📚",
    image: "https://quizpanda.com/which-piece-of-furniture-are-you/feature-image.jpg",
    aliases: ["knowledge", "conhecimentos", "conocimiento", "general-knowledge", "cultura-geral"],
    text: {
      pt: {
        name: "Conhecimentos",
        headline: "Quizzes de conhecimentos gerais para testar o que voce sabe.",
        description: "Desafios rapidos sobre historia, ciencia, geografia, curiosidades e aprendizado leve.",
      },
      en: {
        name: "Knowledge",
        headline: "General knowledge quizzes to test what you know.",
        description: "Quick challenges about history, science, geography, and random facts.",
      },
      es: {
        name: "Conocimientos",
        headline: "Quizzes de conocimientos generales para ponerte a prueba.",
        description: "Retos rapidos sobre historia, ciencia, geografia y curiosidades.",
      },
    },
  },
];

export function getExploreCategory(slug?: string | null) {
  return exploreCategories.find((category) => category.slug === slug);
}

export function getExploreCategoryFromAnySlug(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return exploreCategories.find(
    (category) => category.slug === normalized || category.aliases.includes(normalized)
  );
}

export function getExploreCategoryUrl(slug: string) {
  return `/explore/${slug}`;
}

export function getCategoryText(category: ExploreCategory, locale?: string | null) {
  const key = (locale || "pt") as ExploreLocale;
  return category.text[key] || category.text.pt;
}
