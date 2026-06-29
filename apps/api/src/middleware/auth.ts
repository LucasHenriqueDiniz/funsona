import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";
import type { Env } from "../index.js";

async function verifyToken(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const authMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, "FunSona_session");
  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload?.sub) {
      c.set("userId", payload.sub as string);
      c.set("session", payload);
    }
  }
  await next();
};
