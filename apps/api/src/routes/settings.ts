import { Hono } from "hono";
import type { Env } from "../index.js";

const settingsApp = new Hono<Env>();

// Public settings (no auth required)
settingsApp.get("/public", (c) => {
  return c.json({
    success: true,
    data: {
      stripe_enabled: Boolean(c.env.STRIPE_SECRET_KEY),
      premium_price: "R$ 19,90/mês",
      features: [
        "Remover anúncios",
        "Badge premium no perfil",
        "Estatísticas avançadas de quizzes",
        "Suporte prioritário",
      ],
    },
  });
});

export { settingsApp };
