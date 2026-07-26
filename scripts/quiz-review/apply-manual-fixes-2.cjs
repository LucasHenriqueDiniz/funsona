// Second batch of hand-written fixes (no AI) for quizzes with single-option/empty-label
// questions found by audit-live.cjs.
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

async function getQuiz(id) {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateContent(id, content) {
  console.log(`Updating ${id}...`);
  if (DRY_RUN) return;
  const { error } = await supabase.from("quizzes").update({ content }).eq("id", id);
  if (error) throw error;
}

function replaceQuestion(content, questionId, newQuestion) {
  return {
    ...content,
    questions: content.questions.map((q) => (q.id === questionId ? newQuestion : q)),
  };
}

async function fixIotDefinitionQuestion() {
  const id = "735b4bc9-910f-4835-a318-8486480f81c5";
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q_1777903148957", {
    id: "q_1777903148957",
    order: 0,
    title: "Qual definição descreve melhor a Internet das Coisas, também chamada de IoT?",
    answers: [
      {
        id: "a_1777903591045",
        label: "Objetos físicos conectados à internet para coletar, trocar e processar dados.",
        order: 0,
        imageUrl: "",
        outcomeWeights: { resultado1: 5, resultado2: 3, resultado3: 1, resultado4: 1, resultado5: 1 },
      },
      {
        id: "a_fix_iot_def_1",
        label: "Um conjunto de sites que só existem para vender eletrônicos.",
        order: 1,
        imageUrl: "",
        outcomeWeights: { resultado1: 1, resultado2: 1, resultado3: 1, resultado4: 1, resultado5: 0 },
      },
      {
        id: "a_fix_iot_def_2",
        label: "Uma rede exclusiva para computadores, sem incluir outros aparelhos do dia a dia.",
        order: 2,
        imageUrl: "",
        outcomeWeights: { resultado1: 1, resultado2: 1, resultado3: 1, resultado4: 3, resultado5: 1 },
      },
      {
        id: "a_fix_iot_def_3",
        label: "Não tenho certeza, mas soa a algo relacionado a automação residencial.",
        order: 3,
        imageUrl: "",
        outcomeWeights: { resultado1: 0, resultado2: 1, resultado3: 3, resultado4: 1, resultado5: 5 },
      },
    ],
    imageUrl: "",
  });
  await updateContent(id, content);
}

async function fixHalloweenSoundQuestion() {
  const id = "cfe7fdd7-929a-4510-bd3b-fcc6a8a2b66f";
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q2", {
    id: "q2",
    title: "Que tipo de som deixaria sua decoração de Halloween ainda mais assustadora?",
    answers: [
      {
        id: "a1",
        label: "Efeitos de fantasmas, monstros, portas rangendo e risadas sinistras.",
        outcomeWeights: { resultado6: 1, resultado8: 1 },
      },
      {
        id: "a2",
        label: "Uma trilha instrumental sombria tocando baixinho o tempo todo.",
        outcomeWeights: { resultado1: 1, resultado3: 1 },
      },
      {
        id: "a3",
        label: "Nenhum som: prefiro que o visual assuste sozinho.",
        outcomeWeights: { resultado2: 1, resultado5: 1 },
      },
      {
        id: "a4",
        label: "Sons altos e repentinos para fazer todo mundo pular de susto.",
        outcomeWeights: { resultado4: 1, resultado7: 1 },
      },
    ],
    imageUrl: "https://quizpanda.com/images/quiz-images/music.jpg",
  });
  await updateContent(id, content);
}

async function fixPoliticalQuadrant(id) {
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q14", {
    id: "q14",
    title: "Qual afirmação mais se aproxima da sua visão sobre o papel do Estado na sociedade?",
    answers: [
      {
        id: "a1",
        label: "O Estado deve garantir igualdade econômica, mesmo que exija regras rígidas e forte intervenção.",
        outcomeWeights: { resultado1: 1 },
      },
      {
        id: "a2",
        label: "Defendo igualdade social e econômica, mas sem abrir mão das liberdades individuais.",
        outcomeWeights: { resultado2: 1 },
      },
      {
        id: "a3",
        label: "Tradição, ordem e autoridade são essenciais para manter a sociedade estável.",
        outcomeWeights: { resultado3: 1 },
      },
      {
        id: "a4",
        label: "O mercado livre e a responsabilidade individual devem vir antes da intervenção do Estado.",
        outcomeWeights: { resultado4: 1 },
      },
    ],
  });
  await updateContent(id, content);
}

async function fixCatSchemeQuestion() {
  const id = "29db7a50-aef6-4856-9690-c07b33d8672b";
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q13", {
    id: "q13",
    title: "Se um tradutor de linguagem felina revelasse os pensamentos do seu gato, o que provavelmente aconteceria?",
    answers: [
      {
        id: "a1",
        label: "Mesmo podendo falar minha língua, ele escolheria o silêncio absoluto.",
        outcomeWeights: { resultado10: 1, resultado11: 1 },
      },
      {
        id: "a2",
        label: "Ele passaria o dia inteiro fazendo exigências sobre horário de comida.",
        outcomeWeights: { resultado1: 1, resultado4: 1 },
      },
      {
        id: "a3",
        label: "Revelaria planos elaborados para dominar cada cômodo da casa.",
        outcomeWeights: { resultado2: 1, resultado7: 1 },
      },
      {
        id: "a4",
        label: "Só falaria para reclamar de mim na frente de outros gatos.",
        outcomeWeights: { resultado5: 1, resultado9: 1 },
      },
    ],
    imageUrl: "https://media.giphy.com/media/BBNYBoYa5VwtO/giphy.gif",
  });
  await updateContent(id, content);
}

async function fixEncantoSongQuestion() {
  const id = "41cf9122-a750-444b-85ab-9210789cbdf4";
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q11", {
    id: "q11",
    title: "Qual música de Encanto mais combina com você?",
    answers: [
      { id: "a1", label: "Uma canção sobre pressão familiar e expectativas altas demais.", outcomeWeights: { resultado1: 1 } },
      { id: "a2", label: "Um hino animado sobre força física e orgulho.", outcomeWeights: { resultado2: 1 } },
      { id: "a3", label: "Uma música sobre não encontrar seu lugar na família.", outcomeWeights: { resultado3: 1 } },
      { id: "a4", label: "Uma canção intimista sobre segredos e sentimentos escondidos.", outcomeWeights: { resultado4: 1 } },
    ],
    imageUrl: "https://media.giphy.com/media/3og0IKkjwDPCC3CR3O/giphy.gif",
  });
  await updateContent(id, content);
}

async function fixPastLivesAnimalQuestion() {
  const id = "e4ce74d7-42f2-427f-b4b3-1b70bb1f3847";
  const quiz = await getQuiz(id);
  const content = replaceQuestion(quiz.content, "q1", {
    id: "q1",
    title: "Se pudesse escolher, que bichinho você sente que poderia ter sido em uma vida passada?",
    answers: [
      {
        id: "a1",
        label: "Um cachorro",
        image: { alt: "Um cachorro", file: "https://quizpanda.com/images/quiz-images/dog.jpg", type: "url" },
        outcomeWeights: { resultado1: 1, resultado4: 1 },
      },
      {
        id: "a2",
        label: "Um gato",
        image: { alt: "Um gato", file: "https://quizpanda.com/images/quiz-images/cat.jpg", type: "url" },
        outcomeWeights: { resultado2: 1, resultado5: 1, resultado6: 1 },
      },
    ],
  });
  await updateContent(id, content);
}

async function fixMarioAnimalQuestion() {
  const id = "a181789a-fd33-45c5-8bff-eeacbfaaf647";
  const quiz = await getQuiz(id);
  const labels = ["Um gato", "Um hamster", "Um cachorro", "Uma lagartixa", "Um porquinho", "Um rato", "Uma tartaruga", "Um sapo"];
  const content = replaceQuestion(quiz.content, "q12", {
    id: "q12",
    title: "De qual desses animais você mais gosta?",
    answers: quiz.content.questions
      .find((q) => q.id === "q12")
      .answers.map((a, i) => ({ ...a, label: labels[i] })),
  });
  await updateContent(id, content);
}

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no writes will be made ===\n");
  await fixIotDefinitionQuestion();
  await fixHalloweenSoundQuestion();
  await fixPoliticalQuadrant("4a0bb40b-df13-4eb7-9af1-9d4f990be45f");
  await fixPoliticalQuadrant("ec2d7b88-18e4-4c37-86b8-c2fe34f65418");
  await fixCatSchemeQuestion();
  await fixEncantoSongQuestion();
  await fixPastLivesAnimalQuestion();
  await fixMarioAnimalQuestion();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
