# Backend Schema — AdProfit

> Eng qiyin o'zgartiriladigan hujjat. PostgreSQL (self-hosted), Drizzle ORM. Supabase RLS **yo'q**
> — ma'lumot izolyatsiyasi **ilova qatlamida** majburlanadi (pastга qarang).

## Egalik zanjiri (ownership)

```
users ──< projects ──< { meta/crm ulanishlar, ad_entities, leads, recommendations, ... }
```

Har bir loyihaga tegishli yozuv `project_id` orqali bog'lanadi; har bir loyiha `user_id` orqali
egasiga bog'lanadi. **Har bir DB so'rovi joriy foydalanuvchi egallik qiladigan loyihalar bilan
cheklanishi SHART** (`project.user_id = currentUser.id`).

---

## Jadvallar

### users
Targetolog. Auth Clerk'da; bu yerda faqat mapping va profil.

| column | type |
|--------|------|
| id | uuid (PK) |
| clerk_user_id | text (unique, not null) |
| email | text |
| name | text |
| locale | text (default 'uz') |
| created_at | timestamptz (default now) |
| updated_at | timestamptz |

### projects
Bitta mijoz = bitta loyiha. 1 Meta ad account + 1 CRM.

| column | type |
|--------|------|
| id | uuid (PK) |
| user_id | uuid (FK → users.id, not null) |
| name | text (not null) |
| currency | text (Meta hisobi valyutasi, mas. 'USD'/'UZS') |
| created_at | timestamptz |
| updated_at | timestamptz |

### meta_connections
Meta OAuth granti — **foydalanuvchi darajasida** (bitta login ostida ko'p ad account ko'rinadi).
Loyiha shu connection'dan bitta ad account + page tanlaydi.

| column | type |
|--------|------|
| id | uuid (PK) |
| user_id | uuid (FK → users.id) |
| meta_user_id | text |
| access_token | text (**shifrlangan**) |
| token_expires_at | timestamptz |
| scopes | text[] |
| created_at / updated_at | timestamptz |

> Loyihaga biriktirilgan ad account & page `projects` emas, balki quyidagi maydonlarda:
> `project_meta` (1:1 loyiha bilan) — ajratib qo'yamiz:

### project_meta
Loyihaga tanlangan aniq Meta ad account va page.

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id, unique) |
| meta_connection_id | uuid (FK → meta_connections.id) |
| ad_account_id | text (mas. `act_...`) |
| page_id | text (Lead Ads uchun) |
| ad_account_currency | text |
| last_synced_at | timestamptz |
| created_at / updated_at | timestamptz |

### crm_connections
Har loyihada bitta aktiv CRM (Bitrix24 yoki amoCRM).

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id, unique) |
| provider | text ('bitrix24' \| 'amocrm') |
| portal_domain | text (mas. `navii.amocrm.ru`) |
| access_token | text (**shifrlangan**) |
| refresh_token | text (**shifrlangan**) |
| token_expires_at | timestamptz |
| pipeline_id | text |
| qualified_stage_id | text (sifatli lid bosqichi) |
| won_stage_id | text (yopilgan/sotuv bosqichi) |
| revenue_field | text (bitim summasi maydoni; default budget) |
| last_synced_at | timestamptz |
| created_at / updated_at | timestamptz |

### lead_forms
Obuna qilingan FB Lead Ads formalari + maydon moslashtirish + qaysi CRM pipeline/bosqichiga.

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id) |
| meta_form_id | text |
| form_name | text |
| is_active | boolean (default true) |
| field_mapping | jsonb (FB maydon → CRM maydon) |
| target_pipeline_id | text |
| target_stage_id | text (yangi lid tushadigan bosqich) |
| created_at / updated_at | timestamptz |

unique (project_id, meta_form_id)

### ad_entities
Meta ierarxiyasi: campaign → ad set → ad (bitta jadval, self-FK).

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id) |
| level | text ('campaign' \| 'adset' \| 'ad') |
| meta_id | text (Meta'ning o'z id'si) |
| parent_id | uuid (FK → ad_entities.id, campaign uchun null) |
| name | text |
| status | text ('ACTIVE' \| 'PAUSED' \| ...) |
| effective_status | text |
| last_synced_at | timestamptz |
| created_at / updated_at | timestamptz |

unique (project_id, meta_id)

### ad_metrics_daily
Kunlik Meta insights — **ad (leaf) darajasida** saqlanadi; adset/campaign yig'indi bilan hisoblanadi.

| column | type |
|--------|------|
| id | uuid (PK) |
| ad_entity_id | uuid (FK → ad_entities.id, level='ad') |
| project_id | uuid (FK → projects.id) |
| date | date |
| spend | numeric(14,2) |
| impressions | bigint |
| clicks | bigint |
| reach | bigint |
| frequency | numeric(8,2) |
| meta_leads | integer (Meta tomonidagi lid soni) |
| currency | text |
| created_at | timestamptz |

unique (ad_entity_id, date)

> Hosilaviy ko'rsatkichlar (CTR, CPM, CPC, CPL) saqlanmaydi — so'rovda hisoblanadi.

### leads
Markaziy jadval: Meta lidi + CRM bitimi + attribution (Meta sarfini CRM daromadiga bog'laydi).

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id) |
| meta_lead_id | text (leadgen id) |
| form_id | text |
| ad_entity_id | uuid (FK → ad_entities.id; lidni bergan **ad**) |
| campaign_meta_id / adset_meta_id / ad_meta_id | text (xom id'lar) |
| full_name | text |
| phone | text |
| email | text |
| raw_fields | jsonb |
| crm_entity_type | text ('lead' \| 'deal') |
| crm_entity_id | text (CRM'dagi id, o'tkazilgandan keyin) |
| status | text (normalizatsiya qilingan holat) |
| is_qualified | boolean (default false) |
| qualified_at | timestamptz |
| is_won | boolean (default false) |
| won_at | timestamptz |
| revenue | numeric(14,2) |
| currency | text |
| transfer_status | text ('pending' \| 'transferred' \| 'failed') |
| created_at | timestamptz (lid yaratilgan vaqt) |
| transferred_at / updated_at / last_synced_at | timestamptz |

unique (project_id, meta_lead_id)

### recommendations
Svetofor xulosalari (har sync/hisoblashda qayta generatsiya qilinadi).

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id) |
| ad_entity_id | uuid (FK → ad_entities.id) |
| level | text ('campaign' \| 'adset' \| 'ad') |
| verdict | text ('scale' \| 'kill' \| 'watch') |
| rank | integer (daraja ichidagi o'rni) |
| score_metric | text ('roas' \| 'cpql') |
| score_value | numeric |
| reason | jsonb (qaysi tekshiruv ishladi + raqamlar) |
| metrics_snapshot | jsonb (sarf, sifatli lid, daromad, ROAS, CAC, CPQL) |
| window_start / window_end | date |
| status | text ('new' \| 'seen' \| 'done' \| 'dismissed') |
| is_current | boolean (oxirgi hisoblash) |
| created_at / updated_at | timestamptz |

### sync_runs
Sinxronlash holati (UI "sinxronlanmoqda / xato" ko'rsatishi uchun).

| column | type |
|--------|------|
| id | uuid (PK) |
| project_id | uuid (FK → projects.id) |
| source | text ('meta' \| 'crm') |
| status | text ('running' \| 'success' \| 'error') |
| stats | jsonb |
| error | text |
| started_at / finished_at | timestamptz |

### webhook_events
Kelgan webhook'lar xom logi — idempotentlik (dedup) va debug uchun.

| column | type |
|--------|------|
| id | uuid (PK) |
| source | text ('meta_leadgen' \| 'crm_bitrix' \| 'crm_amo' \| 'clerk') |
| external_id | text (dedup uchun) |
| payload | jsonb |
| processed | boolean (default false) |
| error | text |
| received_at / processed_at | timestamptz |

unique (source, external_id)

---

## Bog'lanishlar (Relationships)

- `projects.user_id → users.id` (ko'p-bir)
- `meta_connections.user_id → users.id`
- `project_meta.project_id → projects.id` (bir-bir); `.meta_connection_id → meta_connections.id`
- `crm_connections.project_id → projects.id` (bir-bir)
- `lead_forms.project_id → projects.id` (bir-ko'p)
- `ad_entities.project_id → projects.id`; `ad_entities.parent_id → ad_entities.id` (self)
- `ad_metrics_daily.ad_entity_id → ad_entities.id`
- `leads.project_id → projects.id`; `leads.ad_entity_id → ad_entities.id`
- `recommendations.project_id → projects.id`; `.ad_entity_id → ad_entities.id`

## Indekslar

- `users.clerk_user_id` (unique)
- `projects.user_id`
- `ad_entities (project_id, level)`, `ad_entities (parent_id)`, unique `(project_id, meta_id)`
- `ad_metrics_daily` unique `(ad_entity_id, date)`, `(project_id, date)`
- `leads (project_id)`, `(ad_entity_id)`, `(is_qualified)`, `(is_won)`, unique `(project_id, meta_lead_id)`, `(crm_entity_id)`
- `recommendations (project_id, level, is_current)`, `(ad_entity_id)`, `(status)`
- `webhook_events` unique `(source, external_id)`

## Auth provayder

**Clerk** — sessiya/JWT. Email+parol, Google OAuth, Telegram (custom widget). Foydalanuvchi
`clerk_user_id` orqali `users` jadvaliga bog'lanadi (Clerk webhook `user.created` yoki birinchi
so'rovda upsert).

## Ma'lumot izolyatsiyasi (RLS o'rnida)

- Supabase RLS yo'q. Har bir API/so'rov **server tomonida** joriy `clerk_user_id` → `users.id` →
  o'sha foydalanuvchining `projects` ro'yxati bilan cheklanadi.
- Hech qaysi loyiha-bog'liq so'rov `user_id` filtrisiz bajarilmaydi. Drizzle query'lari
  markazlashgan `assertProjectOwnership(userId, projectId)` orqali o'tadi.
- `SUPABASE_SERVICE_ROLE` yo'q; DB'ga faqat backend (worker + API) ulanadi, frontend to'g'ridan-to'g'ri DB'ga tegmaydi.

## Rollar

- **user** (targetolog) — faqat o'z loyihalari va datasi. v1'da yagona rol.
- **admin** (ichki) — v2 (qo'llab-quvvatlash/monitoring).

## Maxfiy maydonlar

- Meta/Bitrix/amo **OAuth tokenlari** — DB'da `ENCRYPTION_KEY` bilan **shifrlangan** (app-level
  AES). Frontendga hech qachon chiqmaydi.
- Parol/auth ma'lumotlari DB'da yo'q — Clerk boshqaradi.
- To'lov/billing ma'lumotlari DB'da saqlanmaydi (keyin billing provayderda).

## Fayl/media saqlash

- v1'da fayl saqlash yo'q (kreativ rasmlar = v2, Higgsfield bilan).

## Webhook'lar / triggerlar

- **Meta leadgen** webhook → `webhook_events` → pg-boss `lead.transfer` ishi.
- **CRM (Bitrix/amo)** webhook (deal bosqichi o'zgardi) → `crm.sync` / leadni yangilash.
- **Clerk** webhook (`user.created`) → `users` upsert.
- **pg-boss cron:** `meta.sync` (har ~30–60 daqiqa, insights), `crm.sync` (davriy), `recommendations.compute` (sync'dan keyin).

> pg-boss o'z jadvallarini alohida `pgboss` sxemasida yaratadi — domen jadvallaridan ajratilgan.

## API endpointlar (asosiy)

- Auth: Clerk (`/sign-in`, `/sign-up`).
- Loyihalar: `GET/POST /api/projects`, `PATCH/DELETE /api/projects/:id`.
- Integratsiya (Meta): `GET /api/integrations/meta/connect|callback`, `GET .../ad-accounts`, `.../pages`, `.../forms`.
- Integratsiya (CRM): `GET /api/integrations/crm/:provider/connect|callback`, `GET .../pipelines`, `POST /api/projects/:id/crm/config`.
- Lead transfer: `POST /api/projects/:id/lead-forms` (obuna + mapping).
- Dashboard: `GET /api/projects/:id/dashboard?from&to&level`.
- Reklamalar: `GET /api/projects/:id/ads?level&from&to`.
- Lidlar: `GET /api/projects/:id/leads`, `POST /api/projects/:id/leads/:leadId/retry`.
- Tavsiyalar: `GET /api/projects/:id/recommendations`, `PATCH .../:recId` (seen/done/dismiss).
- Webhooks: `GET/POST /api/webhooks/meta/leadgen`, `POST /api/webhooks/crm/:provider`, `POST /api/webhooks/clerk`.
