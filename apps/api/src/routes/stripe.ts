import { Hono } from "hono";
import Stripe from "stripe";
import type { Env } from "../index.js";
import { authMiddleware, requireAuth, currentUserId } from "../middleware/auth.js";
import { secret } from "../lib/env.js";
import { getProfileById, updateProfile } from "../db/client.js";

const stripeApp = new Hono<Env>();

function getStripe(env: Env["Bindings"]) {
  return new Stripe(secret(env, "STRIPE_SECRET_KEY"), { apiVersion: "2025-02-24.acacia" });
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

// Create checkout session
stripeApp.post("/checkout", authMiddleware, requireAuth, async (c) => {
  const userId = currentUserId(c);

  const profile = await getProfileById(c.env, userId);

  if (profile?.is_premium) {
    return c.json({ success: false, error: "User already has premium" }, 400);
  }

  const stripe = getStripe(c.env);
  const baseUrl = c.env.ENVIRONMENT === "production"
    ? "https://funsona.com"
    : "http://localhost:4321";

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: profile?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "FunSona Premium",
              description: "Remova anúncios, ganhe badge premium e acesse estatísticas avançadas",
            },
            unit_amount: 1990, // R$ 19,90
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: { user_id: userId },
      },
      success_url: `${baseUrl}/profile/me?premium=success`,
      cancel_url: `${baseUrl}/profile/me?premium=cancel`,
      metadata: { user_id: userId },
    });

    return c.json({ success: true, data: { url: session.url } });
  } catch (err: unknown) {
    return c.json({ success: false, error: getErrorMessage(err) }, 500);
  }
});

// Webhook handler
stripeApp.post("/webhook", async (c) => {
  const stripe = getStripe(c.env);
  const signature = c.req.header("stripe-signature");
  const rawBody = await c.req.raw.text();

  if (!signature) {
    return c.json({ success: false, error: "Missing signature" }, 400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret(c.env, "STRIPE_WEBHOOK_SECRET"));
  } catch (err: unknown) {
    return c.json({ success: false, error: `Webhook error: ${getErrorMessage(err)}` }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (userId) {
        try {
          await updateProfile(c.env, userId, { is_premium: 1 });
        } catch (err) {
          console.error("stripe webhook profile update failed", {
            eventType: event.type,
            userId,
            error: getErrorMessage(err),
          });
          return c.json({ success: false, error: "Failed to update premium status" }, 500);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        try {
          await updateProfile(c.env, userId, { is_premium: 0 });
        } catch (err) {
          console.error("stripe webhook profile downgrade failed", {
            eventType: event.type,
            userId,
            error: getErrorMessage(err),
          });
          return c.json({ success: false, error: "Failed to downgrade premium status" }, 500);
        }
      }
      break;
    }
  }

  return c.json({ success: true });
});

export { stripeApp };
