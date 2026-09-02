export type ExploreLocale = "pt" | "en" | "es";

export interface CategoryText {
  name: string;
  headline: string;
  description: string;
  /** Longer editorial text (150-200 words) shown below the quiz grid, explaining
   *  what this category covers. Kept separate from `description` so the short
   *  version can still be used for meta tags without hitting length limits. */
  longDescription?: string;
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
        longDescription:
          "A categoria Personalidade reúne os quizzes mais populares do FunSona: testes que cruzam suas escolhas do dia a dia com arquétipos, energias e traços de personalidade para revelar um resultado com o qual você realmente se identifica. Aqui você encontra desde clássicos como \"qual signo combina com você de verdade\" até formatos mais criativos, como descobrir sua aura, seu elemento, seu animal espiritual ou qual personagem de um universo específico mais parece com seu jeito de ser. Diferente de um teste de personalidade clínico, esses quizzes são pensados para diversão e autoconhecimento leve — cada pergunta explora situações, preferências e reações que, juntas, formam um retrato divertido de quem você é. Os resultados costumam vir acompanhados de uma pequena explicação sobre por que aquele traço combina com suas respostas, então além de brincar, você aprende algo sobre si mesmo. É a categoria ideal para responder rapidinho, comparar resultado com amigos e descobrir se vocês têm mais em comum do que imaginavam.",
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
        longDescription:
          "A categoria Trivia é para quem gosta de testar o quanto realmente sabe sobre um assunto, em vez de descobrir um resultado de personalidade. Aqui as perguntas têm resposta certa: cada quiz apresenta um conjunto de questões de múltipla escolha sobre cultura pop, história, ciência, geografia ou curiosidades específicas de um fandom, e no final você recebe uma pontuação mostrando quantas acertou. É a categoria perfeita para quem quer se desafiar, competir com amigos por quem tira a nota mais alta, ou simplesmente aprender algo novo de forma leve enquanto joga. Os temas variam bastante: de trivias gerais sobre fatos aleatórios até quizzes bem específicos sobre um filme, jogo ou período histórico que você domina. Como o formato é baseado em acertos e erros, cada pergunta importa — não existe uma resposta certa para todo mundo, como acontece nos testes de personalidade, o que torna essa categoria mais competitiva e ideal para quem gosta de comparar pontuação no grupo de amigos ou tentar bater seu próprio recorde numa segunda tentativa.",
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
        longDescription:
          "A categoria Amor traz quizzes sobre relacionamentos, compatibilidade, crushes e tudo que envolve o lado romântico (ou nem tanto) da vida. São testes pensados para brincar sozinho, mandar pro crush como indireta, ou responder junto com o parceiro ou parceira pra ver se as respostas combinam. Você encontra desde quizzes de compatibilidade entre dois perfis até testes que revelam seu \"estilo de amar\", que tipo de parceiro combina com você, ou por que determinadas coisas acontecem na sua vida amorosa. O tom é sempre leve e divertido — nenhum resultado aqui deve ser levado como conselho sério de relacionamento, é puro entretenimento pensado para gerar risada, identificação e aquele momento de \"nossa, isso sou eu mesmo\". Muitos desses quizzes viralizam justamente porque o resultado rende conversa: dá pra comparar com amigos, discutir se bateu ou não, e usar como desculpa pra puxar assunto com alguém. Se você gosta de testes sobre o coração, essa é a categoria certa.",
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
        longDescription:
          "A categoria Games reúne quizzes para quem cresceu (ou ainda vive) dentro dos videogames. Aqui você encontra testes sobre qual personagem de um jogo específico combina com sua personalidade, quizzes de conhecimento sobre franquias inteiras, recomendações de \"qual jogo você deveria jogar a seguir\" baseadas no seu estilo, e até testes nostálgicos sobre consoles e eras dos games. A ideia é misturar cultura gamer com autoconhecimento: em vez de só listar jogos, cada quiz tenta entender seu jeito de jogar — se você prefere exploração livre ou missões diretas, se gosta de multiplayer competitivo ou campanhas solo, se busca desafio ou relaxamento — e conecta isso a um resultado dentro do universo gamer. É uma categoria útil tanto pra quem já é fã de uma franquia e quer testar seus conhecimentos, quanto pra quem está em dúvida sobre o próximo jogo e quer uma recomendação divertida baseada em preferências reais, não só em lista de lançamentos.",
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
        longDescription:
          "A categoria Filmes é dedicada a tudo que envolve cinema: personagens marcantes, franquias inteiras, gêneros e aquele tipo de curiosidade que só quem realmente assiste muito filme entende. Os quizzes variam entre dois formatos principais. No primeiro, você descobre qual personagem de um filme ou saga combina com sua personalidade, respondendo escolhas sobre moral, medo, ambição e forma de agir sob pressão. No segundo, formato mais trivia, você testa o quanto realmente conhece sobre um filme específico, diretor, década ou gênero cinematográfico. Tem espaço tanto para blockbusters recentes quanto para clássicos cult que só um público bem específico vai reconhecer, então dá pra encontrar quiz sobre praticamente qualquer nicho do cinema. Além de entretenimento, essa categoria funciona como uma forma de redescobrir filmes que você ama, relembrar detalhes que talvez tenham passado despercebidos na primeira assistida, e comparar seu resultado com amigos que também são fãs da mesma história.",
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
        longDescription:
          "A categoria Música reúne quizzes para quem vive com fone de ouvido no volume máximo. Aqui você encontra testes que conectam seu gosto musical à sua personalidade — respondendo sobre ritmo, letra, artista favorito e até o tipo de show que você preferiria estar assistindo agora — para descobrir qual estilo, gênero ou artista mais representa quem você é. Também tem quizzes voltados para fãs de bandas e cantores específicos, testando conhecimento sobre discografia, letras e curiosidades da carreira de um artista. A proposta é ir além do óbvio \"qual seu gênero favorito\": cada quiz tenta capturar a vibe, o humor e a energia que a música desperta em você, entregando um resultado que funciona quase como uma trilha sonora pessoal. É uma categoria ótima pra descobrir se sua playlist realmente combina com sua personalidade, disputar com amigos quem entende mais de um artista, ou só se divertir vendo o quanto música e identidade estão conectadas.",
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
        longDescription:
          "A categoria TV é o espaço para quem maratona séries, acompanha novelas ou tem um programa de televisão como parte da rotina. Os quizzes aqui variam entre descobrir qual personagem de uma série combina com você, revivendo dilemas e decisões marcantes de temporadas inteiras, e testes de conhecimento sobre episódios, tramas e detalhes que só quem realmente assistiu de perto vai lembrar. Séries geram fandoms enormes e apaixonados, e essa categoria tenta capturar isso: cada quiz é construído em cima de elementos específicos daquele universo — relações entre personagens, conflitos centrais, reviravoltas — em vez de perguntas genéricas que poderiam servir para qualquer produção. Tem espaço tanto para séries atuais que estão em alta quanto para clássicas que continuam com base de fãs fiel anos depois do final. Se você é do tipo que discute teorias sobre o próximo episódio ou já assistiu uma temporada inteira em um fim de semana, essa categoria foi pensada pra você.",
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
        longDescription:
          "A categoria Conhecimentos reúne quizzes de cultura geral para quem gosta de aprender brincando ou simplesmente testar o quanto sabe sobre um assunto. Diferente das categorias mais voltadas a entretenimento e personalidade, aqui o foco é conteúdo real: história, ciência, geografia, matemática básica e curiosidades do dia a dia, organizados em perguntas de múltipla escolha com resposta certa. Tem quizzes rápidos, pensados pra responder em poucos minutos, e outros mais aprofundados sobre um tema específico, como conceitos de física do ensino fundamental ou fatos históricos pouco conhecidos. Essa categoria também funciona bem como ferramenta de revisão leve: estudantes usam pra reforçar conteúdo de forma menos cansativa que um livro didático, e curiosos usam só pra desafiar o próprio conhecimento geral. Cada acerto soma pontos, cada erro geralmente vem acompanhado de uma explicação rápida sobre a resposta certa, tornando o processo tanto competitivo quanto educativo — ideal pra quem quer se divertir aprendendo algo novo.",
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
