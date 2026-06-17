import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmConnections } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import type { CrmConnection } from "@/lib/db/schema";
import {
  deriveConnectionStatus,
  type ConnectionStatus,
} from "@/lib/meta/connection";
import type { CrmAdapter } from "./adapter";
import { getCrmAdapter } from "./registry";
import type { CrmContext, CrmProvider, CrmTokenData } from "./types";

/**
 * Loyiha (project) darajasidagi CRM ulanishini DB bilan bog'lovchi yordamchilar.
 * access_token / refresh_token DB'da shifrlangan holatda saqlanadi.
 */

/** Loyihaning CRM ulanish qatorini qaytaradi (yo'q bo'lsa null). */
export async function getProjectCrmConnection(
  projectId: string,
): Promise<CrmConnection | null> {
  const rows = await db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.projectId, projectId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Loyiha CRM ulanishining holatini qaytaradi (active | expired) — token muddati
 * `token_expires_at` bo'yicha. Ulanish yo'q bo'lsa null.
 * page.tsx token muddati tugaganini aniqlash uchun shu yerdan oladi.
 */
export async function getProjectCrmConnectionStatus(
  projectId: string,
): Promise<ConnectionStatus | null> {
  const connection = await getProjectCrmConnection(projectId);
  if (!connection) return null;
  return deriveConnectionStatus(connection.tokenExpiresAt);
}

/**
 * CRM ulanishini saqlash/yangilash. access/refresh tokenlarni shifrlaydi,
 * projectId bo'yicha UPSERT qiladi. Mavjud pipeline/stage konfiguratsiyasini saqlab qoladi.
 */
export async function saveCrmConnection(
  projectId: string,
  provider: CrmProvider,
  data: CrmTokenData,
): Promise<{ id: string }> {
  const encryptedAccess = encrypt(data.accessToken);
  const encryptedRefresh =
    data.refreshToken != null ? encrypt(data.refreshToken) : null;

  const now = new Date();

  const rows = await db
    .insert(crmConnections)
    .values({
      projectId,
      provider,
      portalDomain: data.portalDomain,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.expiresAt,
    })
    .onConflictDoUpdate({
      target: crmConnections.projectId,
      set: {
        provider,
        portalDomain: data.portalDomain,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: data.expiresAt,
        updatedAt: now,
        // pipelineId / qualifiedStageId / wonStageId / revenueField TEGILMAYDI —
        // mavjud konfiguratsiya saqlanib qoladi.
      },
    })
    .returning({ id: crmConnections.id });

  return { id: rows[0].id };
}

/**
 * Loyiha uchun CRM adapteri + dekriptlangan kontekst + ulanish qatorini qaytaradi.
 * Ulanish yo'q bo'lsa null.
 */
export async function getCrmContextForProject(projectId: string): Promise<{
  adapter: CrmAdapter;
  ctx: CrmContext;
  connection: CrmConnection;
} | null> {
  const connection = await getProjectCrmConnection(projectId);
  if (!connection) return null;

  const adapter = getCrmAdapter(connection.provider as CrmProvider);
  const ctx: CrmContext = {
    accessToken: decrypt(connection.accessToken),
    portalDomain: connection.portalDomain,
  };

  return { adapter, ctx, connection };
}
