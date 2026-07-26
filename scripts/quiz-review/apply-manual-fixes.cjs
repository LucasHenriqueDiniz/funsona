// Manual, hand-written content fixes for the worst-quality live quizzes found by audit-live.cjs.
// No AI-generated text — every question/outcome here was authored directly.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

async function getQuiz(id) {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateContent(id, content, extra = {}) {
  console.log(`Updating ${id}...`);
  if (DRY_RUN) {
    console.log(JSON.stringify({ content, ...extra }, null, 2).slice(0, 2000));
    return;
  }
  const { error } = await supabase.from("quizzes").update({ content, ...extra }).eq("id", id);
  if (error) throw error;
}

async function fixDragon() {
  const id = "8cd8995b-8d9f-425e-95c3-4944ec53ba83";
  const content = JSON.parse(fs.readFileSync(path.join(__dirname, "fixes", "8cd8995b.json"), "utf8"));
  await updateContent(id, content);
}

async function fixIotTrivia() {
  // Was type PERSONALITY with 20 questions each having exactly one answer flagged via a
  // shared single outcomeWeights key (a leftover "correct answer" marker) and 0 outcomes.
  // Convert to a proper TRIVIA quiz: mark that answer isCorrect, drop the weight keys.
  const id = "ef808f88-fa04-4514-a51c-b34d5d89a852";
  const quiz = await getQuiz(id);
  const questions = quiz.content.questions.map((q) => ({
    ...q,
    answers: q.answers.map((a) => {
      const { outcomeWeights, ...rest } = a;
      return outcomeWeights ? { ...rest, isCorrect: true } : rest;
    }),
  }));
  await updateContent(id, { questions, outcomes: [] }, { type: "TRIVIA" });
}

async function fixHorrorOutcomes() {
  const id = "f72d1376-1554-4b36-99a8-0beb3324049c";
  const quiz = await getQuiz(id);
  const outcomes = JSON.parse(fs.readFileSync(path.join(__dirname, "fixes", "f72d1376-outcomes.json"), "utf8"));
  await updateContent(id, { ...quiz.content, outcomes });
}

async function fixIotEmptyQuestion() {
  // One question in this quiz had answers: [] — a leftover from a partial edit. Fill it in
  // with 4 real options weighted toward the same 5 outcomes (resultado1..5) used elsewhere
  // in this quiz, matching the weighting style already present on sibling questions.
  const id = "735b4bc9-910f-4835-a318-8486480f81c5";
  const quiz = await getQuiz(id);
  const questions = quiz.content.questions.map((q) => {
    if (q.answers && q.answers.length > 0) return q;
    return {
      ...q,
      answers: [
        {
          id: "a_fix_iot_empty_0",
          label: "Uso apps que já monitoram consumo de energia ou automatizam tarefas em casa",
          outcomeWeights: { resultado1: 5, resultado2: 3, resultado3: 1, resultado4: 1, resultado5: 0 },
        },
        {
          id: "a_fix_iot_empty_1",
          label: "Um dispositivo vestível (relógio, pulseira) que acompanha saúde e rotina",
          outcomeWeights: { resultado1: 1, resultado2: 5, resultado3: 1, resultado4: 2, resultado5: 0 },
        },
        {
          id: "a_fix_iot_empty_2",
          label: "Câmeras e sensores de segurança conectados que avisam o celular em tempo real",
          outcomeWeights: { resultado1: 0, resultado2: 1, resultado3: 5, resultado4: 3, resultado5: 1 },
        },
        {
          id: "a_fix_iot_empty_3",
          label: "Sensores industriais ou urbanos que otimizam tráfego, energia ou produção em larga escala",
          outcomeWeights: { resultado1: 1, resultado2: 1, resultado3: 1, resultado4: 2, resultado5: 5 },
        },
      ],
    };
  });
  await updateContent(id, { ...quiz.content, questions });
}

async function fixRiskManagementTrivia() {
  const id = "f89ccf5c-8c39-405a-abfe-0e4d478cf518";
  const quiz = await getQuiz(id);
  const extraQuestions = [
    {
      id: "q_fix_risk_3",
      order: 2,
      title: "O que caracteriza um risco operacional dentro da gestão de riscos corporativos?",
      answers: [
        { id: "a_fix_risk_3_0", label: "Perdas causadas por falhas em processos, sistemas ou pessoas", order: 0, imageUrl: "", isCorrect: true },
        { id: "a_fix_risk_3_1", label: "Variações no preço de ações negociadas em bolsa", order: 1, imageUrl: "" },
        { id: "a_fix_risk_3_2", label: "Mudanças na taxa de câmbio entre moedas estrangeiras", order: 2, imageUrl: "" },
        { id: "a_fix_risk_3_3", label: "Alterações na política de dividendos da empresa", order: 3, imageUrl: "" },
      ],
      imageUrl: "",
    },
    {
      id: "q_fix_risk_4",
      order: 3,
      title: "Qual é o papel principal de um comitê de riscos em uma empresa?",
      answers: [
        { id: "a_fix_risk_4_0", label: "Aprovar sozinho todas as contratações da área financeira", order: 0, imageUrl: "" },
        { id: "a_fix_risk_4_1", label: "Definir apenas o valor dos salários da diretoria", order: 1, imageUrl: "" },
        { id: "a_fix_risk_4_2", label: "Supervisionar a identificação, avaliação e mitigação de riscos relevantes", order: 2, imageUrl: "", isCorrect: true },
        { id: "a_fix_risk_4_3", label: "Substituir integralmente a auditoria externa da empresa", order: 3, imageUrl: "" },
      ],
      imageUrl: "",
    },
  ];
  const questions = [...quiz.content.questions, ...extraQuestions];
  await updateContent(id, { ...quiz.content, questions });
}

async function fixFazendaFuturoTrivia() {
  const id = "4a9cb472-11e1-4d5f-aef0-fd6669bf9148";
  const quiz = await getQuiz(id);
  const extraQuestions = [
    {
      id: "q_fix_ff_4",
      order: 3,
      title: "O que significa, na prática, um produto ser rotulado como \"plant-based\"?",
      answers: [
        { id: "a_fix_ff_4_0", label: "É feito majoritariamente com ingredientes de origem vegetal, sem carne animal", order: 0, imageUrl: "", isCorrect: true },
        { id: "a_fix_ff_4_1", label: "É um produto orgânico certificado, independente dos ingredientes", order: 1, imageUrl: "" },
        { id: "a_fix_ff_4_2", label: "É um produto sem nenhum tipo de sódio ou conservante", order: 2, imageUrl: "" },
        { id: "a_fix_ff_4_3", label: "É um produto fabricado exclusivamente no exterior", order: 3, imageUrl: "" },
      ],
      imageUrl: "",
    },
    {
      id: "q_fix_ff_5",
      order: 4,
      title: "Qual é uma vantagem frequentemente associada a alternativas plant-based em relação à carne animal?",
      answers: [
        { id: "a_fix_ff_5_0", label: "Menor pegada de carbono na produção, segundo estudos do setor", order: 0, imageUrl: "", isCorrect: true },
        { id: "a_fix_ff_5_1", label: "Prazo de validade infinito sem qualquer refrigeração", order: 1, imageUrl: "" },
        { id: "a_fix_ff_5_2", label: "Ausência total de qualquer processo industrial", order: 2, imageUrl: "" },
        { id: "a_fix_ff_5_3", label: "Preço sempre inferior ao da carne animal em qualquer mercado", order: 3, imageUrl: "" },
      ],
      imageUrl: "",
    },
  ];
  const questions = [...quiz.content.questions, ...extraQuestions];
  await updateContent(id, { ...quiz.content, questions });
}

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no writes will be made ===\n");
  await fixDragon();
  await fixIotTrivia();
  await fixHorrorOutcomes();
  await fixIotEmptyQuestion();
  await fixRiskManagementTrivia();
  await fixFazendaFuturoTrivia();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
