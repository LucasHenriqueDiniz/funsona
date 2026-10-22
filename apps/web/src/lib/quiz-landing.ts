// What the quiz landing page reads from GET /quizzes/:slug. The API returns more than this; it is
// the page's contract, not the API's. Older imported quizzes name question and option fields
// differently (`title`/`answers`/`label` vs `text`/`options`/`text`), so the normalisers read both,
// the way QuizPlay.tsx does.

export interface LandingAuthor {
  handle?: string;
  display_name?: string;
  avatar_url?: string | null;
}

export interface LandingIntro {
  context?: string;
  what_youll_learn?: string;
  how_scoring_works?: string;
}

interface RawOption {
  text?: string;
  label?: string;
}

interface RawQuestion {
  text?: string;
  title?: string;
  options?: RawOption[];
  answers?: RawOption[];
}

interface RawOutcome {
  title?: string;
  description?: string;
}

export interface LandingContent {
  questions?: RawQuestion[];
  outcomes?: RawOutcome[];
}

export interface LandingQuiz {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  type: string;
  language?: string | null;
  tags?: string[];
  likes_count?: number;
  attempts_count?: number;
  created_at: string;
  ads_eligible?: boolean;
  author?: LandingAuthor | null;
  intro_content?: LandingIntro | null;
  content?: LandingContent | null;
}

// What "Mais para jogar" reads from a GET /quizzes listing entry.
export interface RelatedQuiz {
  id: string;
  slug: string;
  title: string;
  cover_url?: string | null;
  type: string;
  content?: LandingContent | null;
}

export interface LandingQuestion {
  title: string;
  options: string[];
}

export interface LandingOutcome {
  title: string;
  description: string;
}

export function landingQuestions(content: LandingContent | null | undefined): LandingQuestion[] {
  const raw = Array.isArray(content?.questions) ? content.questions : [];
  return raw
    .map((question) => ({
      title: (question?.title ?? question?.text ?? "").trim(),
      options: (question?.options ?? question?.answers ?? [])
        .map((option) => (option?.text ?? option?.label ?? "").trim())
        .filter(Boolean),
    }))
    .filter((question) => question.title.length > 0);
}

export function landingOutcomes(content: LandingContent | null | undefined): LandingOutcome[] {
  const raw = Array.isArray(content?.outcomes) ? content.outcomes : [];
  return raw
    .map((outcome) => ({
      title: (outcome?.title ?? "").trim(),
      description: (outcome?.description ?? "").trim(),
    }))
    .filter((outcome) => outcome.title.length > 0);
}
