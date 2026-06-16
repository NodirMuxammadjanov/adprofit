import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * Clerk webhook — `user.created` / `user.updated` → `users` upsert.
 * svix bilan imzo tekshiriladi (CLERK_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET sozlanmagan" }, { status: 500 });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let evt: ClerkWebhookEvent;
  try {
    evt = new Webhook(secret).verify(payload, headers) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Imzo tekshiruvi muvaffaqiyatsiz" }, { status: 400 });
  }

  // Dedup log
  await db
    .insert(webhookEvents)
    .values({ source: "clerk", externalId: evt.data.id, payload: evt })
    .onConflictDoNothing({ target: [webhookEvents.source, webhookEvents.externalId] });

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const email = evt.data.email_addresses?.[0]?.email_address ?? null;
    const name =
      [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") || null;
    await db
      .insert(users)
      .values({ clerkUserId: evt.data.id, email, name })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: { email, name, updatedAt: new Date() },
      });
  }

  await db
    .update(webhookEvents)
    .set({ processed: true, processedAt: new Date() })
    .where(sql`${webhookEvents.source} = 'clerk' and ${webhookEvents.externalId} = ${evt.data.id}`);

  return NextResponse.json({ ok: true });
}

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: { email_address: string }[];
    first_name?: string | null;
    last_name?: string | null;
  };
};
