import { Hono } from "hono";
import type { Env } from "../index.js";
import { authMiddleware, requireAuth, currentUserId } from "../middleware/auth.js";

const mediaApp = new Hono<Env>();

const BUCKETS = {
  "quiz-images": "QUIZ_IMAGES",
  "profile-media": "PROFILE_MEDIA",
} as const;

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

function extFor(mime: string) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  return byType[mime] || "jpg";
}

// Public read for any object in either bucket — these are public assets
// (quiz covers/questions/outcomes, profile avatars/banners), same as the
// old public Supabase Storage buckets they replace.
mediaApp.get("/:bucket/*", async (c) => {
  const bucketKey = c.req.param("bucket") as keyof typeof BUCKETS;
  const binding = BUCKETS[bucketKey];
  if (!binding) return c.notFound();

  // Read the key off the path rather than via c.req.param("*") — Hono does not
  // expose the wildcard as a named param here, so that returns undefined and
  // every object 404s. Keys legitimately contain slashes
  // (<quiz-id>/outcomes/resultado1.png), so take everything after the bucket
  // segment and decode it.
  const prefix = `/${bucketKey}/`;
  const pathname = new URL(c.req.url).pathname;
  const start = pathname.indexOf(prefix);
  if (start === -1) return c.notFound();

  let objectPath: string;
  try {
    objectPath = decodeURIComponent(pathname.slice(start + prefix.length));
  } catch {
    return c.notFound();
  }
  if (!objectPath) return c.notFound();

  const object = await c.env[binding].get(objectPath);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

// Authenticated upload for quiz images (cover/question/outcome pictures),
// used by the quiz editor before/while a quiz is being created — mirrors
// the shape of POST /api/users/me/media but targets the quiz-images bucket
// and isn't tied to a specific quiz id (the editor uploads images ad hoc as
// the author builds the quiz, same as the old direct-to-Supabase flow).
mediaApp.post("/quiz-images/upload", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const body = await c.req.parseBody();
  const fileRaw = body.file;

  if (!(fileRaw instanceof File)) {
    return c.json({ success: false, error: "Missing file" }, 400);
  }
  if (!MEDIA_TYPES.has(fileRaw.type)) {
    return c.json({ success: false, error: "Unsupported media type" }, 400);
  }
  if (fileRaw.size > MAX_MEDIA_BYTES) {
    return c.json({ success: false, error: "File too large" }, 400);
  }

  const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extFor(fileRaw.type)}`;
  const fileBuffer = await fileRaw.arrayBuffer();

  await c.env.QUIZ_IMAGES.put(objectPath, fileBuffer, {
    httpMetadata: { contentType: fileRaw.type, cacheControl: "public, max-age=31536000, immutable" },
  });

  const publicUrl = `${new URL(c.req.url).origin}/media/quiz-images/${objectPath}`;
  return c.json({ success: true, data: { publicUrl, path: objectPath } });
});

export { mediaApp };
