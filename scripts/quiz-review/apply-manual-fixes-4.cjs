// Fourth batch: fill in missing outcome descriptions across the "name generator" style quizzes.
// Every phrase below was hand-written (no AI call) as a small bank of templates per quiz
// category; templates cycle deterministically by outcome index and are filled in with the
// outcome's own title, so no two outcomes in the same quiz land on the exact same sentence
// unless the bank is shorter than the outcome list (acceptable trade-off for 200+ items).
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

async function getQuiz(id) {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateOutcomes(id, outcomes) {
  console.log(`Updating ${id}...`);
  if (DRY_RUN) return;
  const quiz = await getQuiz(id);
  const { error } = await supabase.from("quizzes").update({ content: { ...quiz.content, outcomes } }).eq("id", id);
  if (error) throw error;
}

function fillMissing(outcomes, templates) {
  let i = 0;
  return outcomes.map((o) => {
    if (o.description && o.description.trim()) return o;
    const tpl = templates[i % templates.length];
    i++;
    return { ...o, description: tpl(o.title) };
  });
}

const japaneseNameTemplates = [
  (n) => `${n} tem uma sonoridade elegante e cheia de história. É um nome para quem carrega presença tranquila, mas surpreende quando menos se espera.`,
  (n) => `${n} soa forte e memorável. Combina com alguém direto, confiante e que não passa despercebido em nenhuma sala.`,
  (n) => `${n} carrega um tom suave e poético. É a cara de quem observa mais do que fala, mas guarda uma determinação silenciosa.`,
  (n) => `${n} tem uma vibe moderna e criativa. Combina com quem gosta de reinventar as próprias regras e seguir um caminho único.`,
  (n) => `${n} soa clássico e atemporal. É um nome para quem valoriza tradição, mas sabe se adaptar quando a vida pede mudança.`,
  (n) => `${n} tem uma energia leve e acolhedora. Combina com alguém gentil, mas capaz de surpreender com força quando precisa.`,
];

const babyNameTemplates = [
  (n) => `${n} é um nome que combina com uma família que valoriza tradição sem abrir mão de personalidade própria.`,
  (n) => `${n} soa moderno e cheio de identidade — ideal para quem quer um nome que já nasce marcante.`,
  (n) => `${n} carrega uma sonoridade suave e afetuosa, perfeita para uma família que preza carinho e proximidade.`,
  (n) => `${n} tem um ar clássico, o tipo de nome que atravessa gerações sem perder força.`,
  (n) => `${n} soa único e cheio de personalidade, combinando com uma família que gosta de fugir do óbvio.`,
  (n) => `${n} tem uma vibe internacional e curiosa, perfeita para uma família com raízes ou conexões diversas.`,
];

const gamertagTemplates = [
  (n) => `"${n}" é aquele nick que todo mundo lembra depois de uma partida — parte piada interna, parte ameaça real no placar.`,
  (n) => `"${n}" tem aquela vibe de quem não leva o jogo tão a sério, mas ainda assim carrega o time nos momentos decisivos.`,
  (n) => `"${n}" soa como o nick de quem já apareceu em pelo menos uma capa de tela de fim de partida, para o bem ou para o mal.`,
  (n) => `"${n}" é o tipo de nome que gera respeito (ou risada) assim que aparece no lobby, dependendo de quem está jogando contra.`,
  (n) => `"${n}" tem uma sonoridade marcante o suficiente para ficar na cabeça do adversário depois da partida acabar.`,
];

const pirateNameTemplates = [
  (n) => `${n} é o tipo de nome que já entra pelos portos antes mesmo do navio atracar — respeitado por uns, temido por outros.`,
  (n) => `${n} soa como alguém que sobreviveu a mais tempestades do que consegue contar, e ainda guarda histórico pra provar.`,
  (n) => `${n} carrega a fama de negociar, brigar ou fugir — o que for preciso pra garantir a próxima parada segura.`,
  (n) => `${n} é lenda em pelo menos três tavernas diferentes, mesmo que nem toda história contada sobre esse nome seja totalmente verdadeira.`,
];

const rapPersonaTemplates = [
  (n) => `${n} é o tipo de nome de palco que já chega com atitude, pronto pra dominar o microfone desde a primeira estrofe.`,
  (n) => `${n} soa como uma persona que mistura confiança e humor ácido, difícil de ignorar quando entra no beat.`,
  (n) => `${n} tem a cara de quem constrói a própria lenda linha por linha, sem pedir licença pra ninguém.`,
  (n) => `${n} é o nome de quem prefere causar impacto com poucas palavras a se explicar demais no refrão.`,
];

const animeNameTemplates = [
  (n) => `${n} tem energia forte e memorável, ideal para um personagem de presença marcante que evolui a cada arco.`,
  (n) => `${n} soa intenso e cheio de camadas — o tipo de nome que esconde uma motivação maior do que aparenta no início.`,
  (n) => `${n} carrega um tom raro e curioso, perfeito para alguém excêntrico que quebra o padrão da história.`,
  (n) => `${n} tem uma vibe leal e confiável, combinando com quem apoia o grupo mesmo nos momentos mais difíceis.`,
  (n) => `${n} soa aventureiro e cheio de coragem, do tipo que encara qualquer desafio de frente.`,
  (n) => `${n} tem um ar contemplativo e observador, combinando com quem prefere agir na hora certa em vez de se precipitar.`,
];

async function fixAnimeNames() {
  const id = "86a1abfb-f9e1-4933-86e9-d9757c2ccf89";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, animeNameTemplates));
}

async function fixJapaneseNames() {
  const id = "af8cd737-1731-41c3-9ed7-f2978b772ebe";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, japaneseNameTemplates));
}

async function fixBabyNames() {
  const id = "be877359-1324-47c3-861b-e10075a8048f";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, babyNameTemplates));
}

async function fixGamertags() {
  const id = "b73d0b6f-d5b7-41bb-8f36-1310585eea77";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, gamertagTemplates));
}

async function fixPirateNames() {
  const id = "55f3c129-cbef-4c87-a8ed-a5b71084c151";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, pirateNameTemplates));
}

async function fixRapNames() {
  const id = "a3c04adc-1ee6-4bc2-bb25-82967bc1e07d";
  const quiz = await getQuiz(id);
  await updateOutcomes(id, fillMissing(quiz.content.outcomes, rapPersonaTemplates));
}

async function fixPopularityPercent() {
  const id = "37e3f4ea-9463-4a5c-9114-6aed54475729";
  const quiz = await getQuiz(id);
  const desc = {
    "90% popular": "Você é praticamente uma celebridade local: quase todo mundo te conhece, te chama pra tudo e comenta suas postagens.",
    "80% popular": "Você tem um circulo grande e ativo de gente que gosta de estar por perto — presença forte, sem exagero.",
    "70% popular": "Você é bem conhecido no seu grupo e além dele, mas ainda escolhe com quem quer estar de verdade.",
    "60% popular": "Você tem popularidade equilibrada: querido por quem te conhece, sem precisar performar pra ninguém.",
    "50% popular": "Você está bem no meio do caminho — nem no centro das atenções, nem invisível, e tudo bem com isso.",
    "40% popular": "Você prefere um círculo mais fechado, mas quem te conhece de verdade gosta muito de você.",
    "10% popular": "Você é seletivo com quem deixa entrar na sua vida, e prefere qualidade a quantidade nas amizades.",
    "12% popular": "Você não corre atrás de popularidade — as poucas pessoas próximas valem mais que uma multidão.",
  };
  const outcomes = quiz.content.outcomes.map((o) => (desc[o.title] ? { ...o, description: desc[o.title] } : o));
  await updateOutcomes(id, outcomes);
}

async function fixAlienDna() {
  const id = "0c366ab7-4e00-4dbd-9c02-13cd4d1877b0";
  const quiz = await getQuiz(id);
  const desc = {
    "37 % de DNA alienígena": "Uma boa parte de você definitivamente não é totalmente terrestre — curiosidade fora do comum e jeito de enxergar o mundo diferente da maioria.",
    "33 % de DNA alienígena": "Você tem um terço de estranheza cósmica: prático o suficiente para o dia a dia, mas com ideias que soam de outro planeta às vezes.",
    "29 % de DNA alienígena": "Uma pitada forte de excentricidade habita em você, equilibrada com bastante senso prático terrestre.",
    "24 % de DNA alienígena": "Você é majoritariamente terráqueo, mas guarda um traço de curiosidade sobre o desconhecido que não é exatamente comum.",
    "12 % de DNA alienígena": "Você é bem enraizado na Terra, com só um toque leve de originalidade que foge do padrão.",
    "0 % de DNA alienígena": "Você é 100% terráqueo: pé no chão, lógico e nada interessado em teorias sobre discos voadores.",
  };
  const outcomes = quiz.content.outcomes.map((o) => (desc[o.title] ? { ...o, description: desc[o.title] } : o));
  await updateOutcomes(id, outcomes);
}

async function fixFantasyNames() {
  const id = "4987ca90-ee90-44a0-b673-d25a69f38d17";
  const quiz = await getQuiz(id);
  const desc = {
    "Ja'raal": "Ja'raal soa como o nome de um guerreiro ancestral, cheio de peso e respeito em qualquer saga épica.",
    "Pukk de Lukk": "Pukk de Lukk tem uma sonoridade divertida e travessa, perfeita para um personagem que aposta no humor mesmo em apuros.",
    "Kronk": "Kronk é curto, direto e fácil de gritar em batalha — o tipo de nome que gruda na memória rapidamente.",
    "Oodra'heel": "Oodra'heel carrega mistério e uma pronúncia rara, digna de uma figura antiga guardando segredos de um reino esquecido.",
  };
  const outcomes = quiz.content.outcomes.map((o) => (desc[o.title] ? { ...o, description: desc[o.title] } : o));
  await updateOutcomes(id, outcomes);
}

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no writes will be made ===\n");
  await fixAnimeNames();
  await fixJapaneseNames();
  await fixBabyNames();
  await fixGamertags();
  await fixPirateNames();
  await fixRapNames();
  await fixPopularityPercent();
  await fixAlienDna();
  await fixFantasyNames();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
