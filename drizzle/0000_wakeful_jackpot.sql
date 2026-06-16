CREATE TABLE "ad_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"level" text NOT NULL,
	"meta_id" text NOT NULL,
	"parent_id" uuid,
	"name" text,
	"status" text,
	"effective_status" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_metrics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad_entity_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"date" date NOT NULL,
	"spend" numeric(14, 2) DEFAULT '0' NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"reach" bigint DEFAULT 0 NOT NULL,
	"frequency" numeric(8, 2),
	"meta_leads" integer DEFAULT 0 NOT NULL,
	"currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"portal_domain" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"pipeline_id" text,
	"qualified_stage_id" text,
	"won_stage_id" text,
	"revenue_field" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"meta_form_id" text NOT NULL,
	"form_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"field_mapping" jsonb,
	"target_pipeline_id" text,
	"target_stage_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"meta_lead_id" text NOT NULL,
	"form_id" text,
	"ad_entity_id" uuid,
	"campaign_meta_id" text,
	"adset_meta_id" text,
	"ad_meta_id" text,
	"full_name" text,
	"phone" text,
	"email" text,
	"raw_fields" jsonb,
	"crm_entity_type" text,
	"crm_entity_id" text,
	"status" text,
	"is_qualified" boolean DEFAULT false NOT NULL,
	"qualified_at" timestamp with time zone,
	"is_won" boolean DEFAULT false NOT NULL,
	"won_at" timestamp with time zone,
	"revenue" numeric(14, 2),
	"currency" text,
	"transfer_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"transferred_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meta_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meta_user_id" text,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"scopes" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"meta_connection_id" uuid NOT NULL,
	"ad_account_id" text NOT NULL,
	"page_id" text,
	"ad_account_currency" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"ad_entity_id" uuid NOT NULL,
	"level" text NOT NULL,
	"verdict" text NOT NULL,
	"rank" integer,
	"score_metric" text,
	"score_value" numeric,
	"reason" jsonb,
	"metrics_snapshot" jsonb,
	"window_start" date,
	"window_end" date,
	"status" text DEFAULT 'new' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"stats" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"name" text,
	"locale" text DEFAULT 'uz' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"payload" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ad_entities" ADD CONSTRAINT "ad_entities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_entities" ADD CONSTRAINT "ad_entities_parent_id_ad_entities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ad_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_metrics_daily" ADD CONSTRAINT "ad_metrics_daily_ad_entity_id_ad_entities_id_fk" FOREIGN KEY ("ad_entity_id") REFERENCES "public"."ad_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_metrics_daily" ADD CONSTRAINT "ad_metrics_daily_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_forms" ADD CONSTRAINT "lead_forms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_ad_entity_id_ad_entities_id_fk" FOREIGN KEY ("ad_entity_id") REFERENCES "public"."ad_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_meta" ADD CONSTRAINT "project_meta_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_meta" ADD CONSTRAINT "project_meta_meta_connection_id_meta_connections_id_fk" FOREIGN KEY ("meta_connection_id") REFERENCES "public"."meta_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_ad_entity_id_ad_entities_id_fk" FOREIGN KEY ("ad_entity_id") REFERENCES "public"."ad_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_entities_project_meta_id_uq" ON "ad_entities" USING btree ("project_id","meta_id");--> statement-breakpoint
CREATE INDEX "ad_entities_project_level_idx" ON "ad_entities" USING btree ("project_id","level");--> statement-breakpoint
CREATE INDEX "ad_entities_parent_id_idx" ON "ad_entities" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_metrics_daily_entity_date_uq" ON "ad_metrics_daily" USING btree ("ad_entity_id","date");--> statement-breakpoint
CREATE INDEX "ad_metrics_daily_project_date_idx" ON "ad_metrics_daily" USING btree ("project_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_project_id_uq" ON "crm_connections" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_forms_project_meta_form_uq" ON "lead_forms" USING btree ("project_id","meta_form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_project_meta_lead_uq" ON "leads" USING btree ("project_id","meta_lead_id");--> statement-breakpoint
CREATE INDEX "leads_project_id_idx" ON "leads" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "leads_ad_entity_id_idx" ON "leads" USING btree ("ad_entity_id");--> statement-breakpoint
CREATE INDEX "leads_is_qualified_idx" ON "leads" USING btree ("is_qualified");--> statement-breakpoint
CREATE INDEX "leads_is_won_idx" ON "leads" USING btree ("is_won");--> statement-breakpoint
CREATE INDEX "leads_crm_entity_id_idx" ON "leads" USING btree ("crm_entity_id");--> statement-breakpoint
CREATE INDEX "meta_connections_user_id_idx" ON "meta_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_meta_project_id_uq" ON "project_meta" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendations_project_level_current_idx" ON "recommendations" USING btree ("project_id","level","is_current");--> statement-breakpoint
CREATE INDEX "recommendations_ad_entity_id_idx" ON "recommendations" USING btree ("ad_entity_id");--> statement-breakpoint
CREATE INDEX "recommendations_status_idx" ON "recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_runs_project_id_idx" ON "sync_runs" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_uq" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_source_external_uq" ON "webhook_events" USING btree ("source","external_id");