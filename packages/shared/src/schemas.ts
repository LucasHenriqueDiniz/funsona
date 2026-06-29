import { z } from "zod";

// Enums
export const QuizTypeSchema = z.enum(["TRIVIA", "PERSONALITY"]);
export const QuizStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const QuizLanguageSchema = z.enum(["pt", "en", "es"]);

// Profile
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().min(1).max(100),
  avatar_url: z.string().url().nullable(),
  avatar_path: z.string().nullable().optional(),
  avatar_source: z.enum(["external", "storage"]).default("external").optional(),
  banner_url: z.string().url().nullable().optional(),
  banner_path: z.string().nullable().optional(),
  banner_source: z.enum(["external", "storage"]).default("storage").optional(),
  bio: z.string().max(500).nullable(),
  xp: z.number().int().default(0),
  level: z.number().int().default(1),
  is_premium: z.boolean().default(false),
  is_admin: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Quiz content (JSONB)
export const QuizQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  image_url: z.string().url().nullable().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      image_url: z.string().url().nullable().optional(),
      is_correct: z.boolean().optional(), // for TRIVIA
      outcome_key: z.string().optional(), // for PERSONALITY
      points: z.number().int().optional(),
    })
  ).min(2),
});

export const QuizOutcomeSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  image_url: z.string().url().nullable().optional(),
  min_score: z.number().int().optional(),
  max_score: z.number().int().optional(),
});

export const QuizContentSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
  outcomes: z.array(QuizOutcomeSchema).optional(), // for PERSONALITY
});

export const QuizSettingsSchema = z.object({
  show_correct_answers: z.boolean().default(true),
  randomize_questions: z.boolean().default(false),
  time_limit_seconds: z.number().int().nullable().optional(),
});

// Quiz
export const QuizSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  cover_url: z.string().url().nullable(),
  type: QuizTypeSchema,
  status: QuizStatusSchema,
  content: QuizContentSchema,
  settings: QuizSettingsSchema.default({}),
  author_id: z.string().uuid(),
  language: QuizLanguageSchema.default("pt"),
  tags: z.array(z.string()).default([]),
  likes_count: z.number().int().default(0),
  attempts_count: z.number().int().default(0),
  completions_count: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateQuizSchema = QuizSchema.omit({
  id: true,
  slug: true,
  author_id: true,
  likes_count: true,
  attempts_count: true,
  completions_count: true,
  created_at: true,
  updated_at: true,
}).extend({
  slug: z.string().min(1).max(200).optional(),
});

export const UpdateQuizSchema = CreateQuizSchema.partial();

// Quiz Result
export const QuizResultSchema = z.object({
  id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  quiz_type: QuizTypeSchema,
  result_type: z.enum(["TRIVIA_SUM", "PERSONALITY_TALLY"]),
  result_value: z.string().nullable(),
  xp_gained: z.number().int().default(0),
  created_at: z.string().datetime(),
});

export const CreateQuizResultSchema = QuizResultSchema.omit({
  id: true,
  quiz_id: true,
  quiz_type: true,
  user_id: true,
  created_at: true,
});

// Leaderboard
export const LeaderboardEntrySchema = z.object({
  user_id: z.string().uuid(),
  xp_all_time: z.number().int().default(0),
  xp_weekly: z.number().int().default(0),
  xp_monthly: z.number().int().default(0),
  updated_at: z.string().datetime(),
});

// Streaks
export const UserStreakSchema = z.object({
  user_id: z.string().uuid(),
  current_streak: z.number().int().default(0),
  longest_streak: z.number().int().default(0),
  last_activity_date: z.string().date().nullable(),
  updated_at: z.string().datetime(),
});

// Auth
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterSchema = LoginSchema.extend({
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().min(1).max(100),
});

// API Response
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
  });

export type QuizType = z.infer<typeof QuizTypeSchema>;
export type QuizStatus = z.infer<typeof QuizStatusSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type CreateQuiz = z.infer<typeof CreateQuizSchema>;
export type UpdateQuiz = z.infer<typeof UpdateQuizSchema>;
export type QuizResult = z.infer<typeof QuizResultSchema>;
export type CreateQuizResult = z.infer<typeof CreateQuizResultSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type UserStreak = z.infer<typeof UserStreakSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
