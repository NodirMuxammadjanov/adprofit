/**
 * Drizzle schema — 05-backend-schema.md bo'yicha (PostgreSQL, self-hosted).
 * RLS yo'q — ma'lumot izolyatsiyasi ilova qatlamida (assertProjectOwnership).
 * OAuth tokenlari (access_token / refresh_token) DB'da ENCRYPTION_KEY bilan shifrlangan.
 */
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ── users ────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    name: text("name"),
    locale: text("locale").default("uz").notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("users_clerk_user_id_uq").on(t.clerkUserId)],
);

// ── projects ─────────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency"),
    createdAt,
    updatedAt,
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

// ── meta_connections (foydalanuvchi darajasida) ──────────────────
export const metaConnections = pgTable(
  "meta_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metaUserId: text("meta_user_id"),
    accessToken: text("access_token").notNull(), // shifrlangan
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").array(),
    createdAt,
    updatedAt,
  },
  (t) => [index("meta_connections_user_id_idx").on(t.userId)],
);

// ── project_meta (loyihaga tanlangan ad account + page) ──────────
export const projectMeta = pgTable(
  "project_meta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    metaConnectionId: uuid("meta_connection_id")
      .notNull()
      .references(() => metaConnections.id, { onDelete: "cascade" }),
    adAccountId: text("ad_account_id").notNull(),
    pageId: text("page_id"),
    adAccountCurrency: text("ad_account_currency"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("project_meta_project_id_uq").on(t.projectId)],
);

// ── crm_connections (loyihada bitta aktiv CRM) ───────────────────
export const crmConnections = pgTable(
  "crm_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'bitrix24' | 'amocrm'
    portalDomain: text("portal_domain"),
    accessToken: text("access_token").notNull(), // shifrlangan
    refreshToken: text("refresh_token"), // shifrlangan
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    pipelineId: text("pipeline_id"),
    qualifiedStageId: text("qualified_stage_id"),
    wonStageId: text("won_stage_id"),
    revenueField: text("revenue_field"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("crm_connections_project_id_uq").on(t.projectId)],
);

// ── lead_forms ───────────────────────────────────────────────────
export const leadForms = pgTable(
  "lead_forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    metaFormId: text("meta_form_id").notNull(),
    formName: text("form_name"),
    isActive: boolean("is_active").default(true).notNull(),
    fieldMapping: jsonb("field_mapping").$type<Record<string, string>>(),
    targetPipelineId: text("target_pipeline_id"),
    targetStageId: text("target_stage_id"),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex("lead_forms_project_meta_form_uq").on(t.projectId, t.metaFormId)],
);

// ── ad_entities (campaign → adset → ad, self-FK) ─────────────────
export const adEntities = pgTable(
  "ad_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    level: text("level").notNull(), // 'campaign' | 'adset' | 'ad'
    metaId: text("meta_id").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => adEntities.id, {
      onDelete: "cascade",
    }),
    name: text("name"),
    status: text("status"),
    effectiveStatus: text("effective_status"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [
    uniqueIndex("ad_entities_project_meta_id_uq").on(t.projectId, t.metaId),
    index("ad_entities_project_level_idx").on(t.projectId, t.level),
    index("ad_entities_parent_id_idx").on(t.parentId),
  ],
);

// ── ad_metrics_daily (ad/leaf darajasida) ────────────────────────
export const adMetricsDaily = pgTable(
  "ad_metrics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adEntityId: uuid("ad_entity_id")
      .notNull()
      .references(() => adEntities.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    spend: numeric("spend", { precision: 14, scale: 2 }).default("0").notNull(),
    impressions: bigint("impressions", { mode: "number" }).default(0).notNull(),
    clicks: bigint("clicks", { mode: "number" }).default(0).notNull(),
    reach: bigint("reach", { mode: "number" }).default(0).notNull(),
    frequency: numeric("frequency", { precision: 8, scale: 2 }),
    metaLeads: integer("meta_leads").default(0).notNull(),
    currency: text("currency"),
    createdAt,
  },
  (t) => [
    uniqueIndex("ad_metrics_daily_entity_date_uq").on(t.adEntityId, t.date),
    index("ad_metrics_daily_project_date_idx").on(t.projectId, t.date),
  ],
);

// ── leads (markaziy: Meta lid + CRM bitim + attribution) ─────────
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    metaLeadId: text("meta_lead_id").notNull(),
    formId: text("form_id"),
    adEntityId: uuid("ad_entity_id").references(() => adEntities.id, {
      onDelete: "set null",
    }),
    campaignMetaId: text("campaign_meta_id"),
    adsetMetaId: text("adset_meta_id"),
    adMetaId: text("ad_meta_id"),
    fullName: text("full_name"),
    phone: text("phone"),
    email: text("email"),
    rawFields: jsonb("raw_fields"),
    crmEntityType: text("crm_entity_type"), // 'lead' | 'deal'
    crmEntityId: text("crm_entity_id"),
    status: text("status"),
    isQualified: boolean("is_qualified").default(false).notNull(),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
    isWon: boolean("is_won").default(false).notNull(),
    wonAt: timestamp("won_at", { withTimezone: true }),
    revenue: numeric("revenue", { precision: 14, scale: 2 }),
    currency: text("currency"),
    transferStatus: text("transfer_status").default("pending").notNull(), // pending|transferred|failed
    createdAt,
    transferredAt: timestamp("transferred_at", { withTimezone: true }),
    updatedAt,
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("leads_project_meta_lead_uq").on(t.projectId, t.metaLeadId),
    index("leads_project_id_idx").on(t.projectId),
    index("leads_ad_entity_id_idx").on(t.adEntityId),
    index("leads_is_qualified_idx").on(t.isQualified),
    index("leads_is_won_idx").on(t.isWon),
    index("leads_crm_entity_id_idx").on(t.crmEntityId),
  ],
);

// ── recommendations (svetofor) ───────────────────────────────────
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    adEntityId: uuid("ad_entity_id")
      .notNull()
      .references(() => adEntities.id, { onDelete: "cascade" }),
    level: text("level").notNull(), // 'campaign' | 'adset' | 'ad'
    verdict: text("verdict").notNull(), // 'scale' | 'kill' | 'watch'
    rank: integer("rank"),
    scoreMetric: text("score_metric"), // 'roas' | 'cpql'
    scoreValue: numeric("score_value"),
    reason: jsonb("reason"),
    metricsSnapshot: jsonb("metrics_snapshot"),
    windowStart: date("window_start"),
    windowEnd: date("window_end"),
    status: text("status").default("new").notNull(), // new|seen|done|dismissed
    isCurrent: boolean("is_current").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("recommendations_project_level_current_idx").on(
      t.projectId,
      t.level,
      t.isCurrent,
    ),
    index("recommendations_ad_entity_id_idx").on(t.adEntityId),
    index("recommendations_status_idx").on(t.status),
  ],
);

// ── sync_runs ────────────────────────────────────────────────────
export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'meta' | 'crm'
    status: text("status").notNull(), // 'running' | 'success' | 'error'
    stats: jsonb("stats"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("sync_runs_project_id_idx").on(t.projectId)],
);

// ── webhook_events (xom log + dedup) ─────────────────────────────
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(), // 'meta_leadgen' | 'crm_bitrix' | 'crm_amo' | 'clerk'
    externalId: text("external_id").notNull(),
    payload: jsonb("payload"),
    processed: boolean("processed").default(false).notNull(),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("webhook_events_source_external_uq").on(t.source, t.externalId)],
);

// ── Relations (Drizzle query API uchun) ──────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  metaConnections: many(metaConnections),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  meta: one(projectMeta),
  crm: one(crmConnections),
  leadForms: many(leadForms),
  adEntities: many(adEntities),
  leads: many(leads),
  recommendations: many(recommendations),
}));

export const projectMetaRelations = relations(projectMeta, ({ one }) => ({
  project: one(projects, { fields: [projectMeta.projectId], references: [projects.id] }),
  connection: one(metaConnections, {
    fields: [projectMeta.metaConnectionId],
    references: [metaConnections.id],
  }),
}));

export const crmConnectionsRelations = relations(crmConnections, ({ one }) => ({
  project: one(projects, {
    fields: [crmConnections.projectId],
    references: [projects.id],
  }),
}));

export const adEntitiesRelations = relations(adEntities, ({ one, many }) => ({
  project: one(projects, { fields: [adEntities.projectId], references: [projects.id] }),
  parent: one(adEntities, {
    fields: [adEntities.parentId],
    references: [adEntities.id],
    relationName: "ad_hierarchy",
  }),
  children: many(adEntities, { relationName: "ad_hierarchy" }),
  metrics: many(adMetricsDaily),
}));

export const adMetricsDailyRelations = relations(adMetricsDaily, ({ one }) => ({
  adEntity: one(adEntities, {
    fields: [adMetricsDaily.adEntityId],
    references: [adEntities.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  project: one(projects, { fields: [leads.projectId], references: [projects.id] }),
  adEntity: one(adEntities, {
    fields: [leads.adEntityId],
    references: [adEntities.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  project: one(projects, {
    fields: [recommendations.projectId],
    references: [projects.id],
  }),
  adEntity: one(adEntities, {
    fields: [recommendations.adEntityId],
    references: [adEntities.id],
  }),
}));

// ── Tip eksportlari ──────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type MetaConnection = typeof metaConnections.$inferSelect;
export type ProjectMeta = typeof projectMeta.$inferSelect;
export type CrmConnection = typeof crmConnections.$inferSelect;
export type LeadForm = typeof leadForms.$inferSelect;
export type AdEntity = typeof adEntities.$inferSelect;
export type NewAdEntity = typeof adEntities.$inferInsert;
export type AdMetricDaily = typeof adMetricsDaily.$inferSelect;
export type NewAdMetricDaily = typeof adMetricsDaily.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
export type SyncRun = typeof syncRuns.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
