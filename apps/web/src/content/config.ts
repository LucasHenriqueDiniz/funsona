import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Editorial guides, one Markdown file per locale under content/guides/<locale>/<slug>.md
// (e.g. content/guides/pt/como-criar-um-bom-quiz.md). The locale segment of the
// path is the source of truth for routing; `locale` in frontmatter is kept in
// sync for convenience when filtering the collection.
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: z.enum(["pt", "en", "es"]),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { guides };
