import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { enqueueLeadTransfer } from "@/lib/jobs/lead";

/**
 * Meta Leadgen webhook.
 * GET  — Meta verifikatsiya handshake (hub.challenge'ni qaytaradi).
 * POST — leadgen hodisalari: dedup (webhook_events) + lead.transfer navbatga qo'yish.
 * Meta tez 200 kutadi — har doim 200 qaytaramiz, ichkarisi himoyalangan (defensive).
 */

// ── GET: verifikatsiya ───────────────────────────────────────────
export function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";

  if (mode === "subscribe" && verifyToken === env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ── POST: leadgen hodisalari ─────────────────────────────────────
type LeadgenValue = {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time?: number;
};
type LeadgenChange = { field?: string; value?: LeadgenValue };
type LeadgenEntry = { id?: string; time?: number; changes?: LeadgenChange[] };
type LeadgenBody = { object?: string; entry?: LeadgenEntry[] };

export async function POST(req: Request) {
  let body: LeadgenBody;
  try {
    body = (await req.json()) as LeadgenBody;
  } catch (err) {
    console.error("[meta/leadgen] noto'g'ri JSON body:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;
        const value = change.value;
        const leadgenId = value?.leadgen_id;
        if (!value || !leadgenId) {
          console.error("[meta/leadgen] leadgen_id yo'q:", change);
          continue;
        }

        // Dedup: yangi qator qaytsa — birinchi marta; bo'sh massiv — dublikat.
        const inserted = await db
          .insert(webhookEvents)
          .values({
            source: "meta_leadgen",
            externalId: leadgenId,
            payload: value,
          })
          .onConflictDoNothing({
            target: [webhookEvents.source, webhookEvents.externalId],
          })
          .returning({ id: webhookEvents.id });

        if (inserted.length === 0) {
          // Dublikat — qayta navbatga qo'ymaymiz.
          continue;
        }

        if (!value.form_id) {
          console.error("[meta/leadgen] form_id yo'q, o'tkazib yuborildi:", leadgenId);
          continue;
        }

        try {
          await enqueueLeadTransfer({
            leadgenId,
            formId: value.form_id,
            adId: value.ad_id ?? null,
            adsetId: value.adgroup_id ?? null,
            campaignId: null,
          });
        } catch (err) {
          // Worker o'chiq bo'lishi mumkin — hodisa log qilingan, keyin qayta ishlanadi.
          console.error("[meta/leadgen] enqueueLeadTransfer xatosi:", err);
        }
      }
    }
  } catch (err) {
    console.error("[meta/leadgen] POST ishlovida xato:", err);
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
