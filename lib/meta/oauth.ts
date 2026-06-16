import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { metaConnections } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { env, isMock } from "@/lib/env";
import type { MetaTokenData } from "./types";

/**
 * Meta OAuth oqimi. MOCK_INTEGRATIONS=true bo'lganda real Graph API'ga chiqmasdan
 * deterministik token qaytaradi (Meta App Review kutilayotgan davr uchun).
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export const META_SCOPES = [
  "ads_read",
  "ads_management",
  "leads_retrieval",
  "pages_manage_metadata",
] as const;

export function getMetaAuthUrl(state: string): string {
  const u = new URL(`${GRAPH_BASE}/dialog/oauth`);
  u.searchParams.set("client_id", env.META_APP_ID);
  u.searchParams.set("redirect_uri", env.META_OAUTH_REDIRECT_URI);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", META_SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  return u.toString();
}

export async function exchangeCodeForToken(code: string): Promise<MetaTokenData> {
  if (isMock()) {
    return {
      accessToken: "MOCK_META_TOKEN",
      metaUserId: "mock_meta_user",
      expiresAt: null,
      scopes: [...META_SCOPES],
    };
  }

  // 1) code → access_token
  const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env.META_APP_ID);
  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET);
  tokenUrl.searchParams.set("redirect_uri", env.META_OAUTH_REDIRECT_URI);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    throw new Error(`Meta token exchange error ${tokenRes.status}: ${body}`);
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const accessToken = tokenJson.access_token;
  const expiresAt =
    typeof tokenJson.expires_in === "number"
      ? new Date(Date.now() + tokenJson.expires_in * 1000)
      : null;

  // 2) token → /me (meta user id)
  const meUrl = new URL(`${GRAPH_BASE}/me`);
  meUrl.searchParams.set("access_token", accessToken);
  meUrl.searchParams.set("fields", "id");
  const meRes = await fetch(meUrl.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!meRes.ok) {
    const body = await meRes.text().catch(() => "");
    throw new Error(`Meta /me error ${meRes.status}: ${body}`);
  }
  const meJson = (await meRes.json()) as { id: string };

  return {
    accessToken,
    metaUserId: meJson.id,
    expiresAt,
    scopes: [...META_SCOPES],
  };
}

/**
 * accessToken'ni shifrlab, foydalanuvchi uchun YAGONA meta_connection saqlaydi:
 * mavjud bo'lsa yangilaydi, aks holda yangi qator qo'shadi (UPSERT).
 */
export async function saveMetaConnection(
  userId: string,
  data: MetaTokenData,
): Promise<{ id: string }> {
  const encryptedToken = encrypt(data.accessToken);

  const existing = await db
    .select({ id: metaConnections.id })
    .from(metaConnections)
    .where(eq(metaConnections.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const [row] = await db
      .update(metaConnections)
      .set({
        metaUserId: data.metaUserId,
        accessToken: encryptedToken,
        tokenExpiresAt: data.expiresAt,
        scopes: data.scopes,
        updatedAt: new Date(),
      })
      .where(eq(metaConnections.userId, userId))
      .returning({ id: metaConnections.id });
    return { id: row.id };
  }

  const [row] = await db
    .insert(metaConnections)
    .values({
      userId,
      metaUserId: data.metaUserId,
      accessToken: encryptedToken,
      tokenExpiresAt: data.expiresAt,
      scopes: data.scopes,
    })
    .returning({ id: metaConnections.id });
  return { id: row.id };
}
