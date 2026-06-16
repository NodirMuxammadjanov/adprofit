# Implementation Plan — AdProfit

> Qurish ketma-ketligi. Har bosqichning aniq "tugadi" mezoni bor. Tartib muhim: poydevor →
> auth → loyiha → integratsiyalar → attribution → tavsiya → sayqal → test → deploy.

> ⚠️ **Parallel ish (0-kundan boshlang): Meta App Review.** Meta ilovasini yaratib,
> `ads_read`, `ads_management`, `leads_retrieval`, `pages_manage_metadata` ruxsatlari va
> **Business Verification**'ni darrov topshiring — bu bir necha hafta olishi mumkin va
> production'da real data tortishni bloklaydi. Dev'da test foydalanuvchilar bilan ishlayveramiz.

---

## Phase 1 — Setup
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui o'rnatish.
- Drizzle ORM + drizzle-kit + `pg`; `lib/db`.
- Alohida **worker** jarayoni (pg-boss) skeleti.
- **Docker Compose:** `app`, `worker`, `postgres`, `caddy/nginx`. `.env.example` (TRD'dagi nomlar).
- Papka tuzilishi: `app/` (sahifalar), `lib/` (db, auth, meta, crm, jobs), `components/`, `worker/`.
- Repo + lint/format.

**Tugadi:** `docker compose up` bilan ilova lokal ko'tariladi (bo'sh qobiq), worker Postgres'ga ulanadi.

## Phase 2 — Database
- Barcha jadvallarni Drizzle schema sifatida yozish (05-backend-schema bo'yicha).
- Migratsiyalar (drizzle-kit) yaratish va qo'llash.
- `assertProjectOwnership` va token shifrlash (`ENCRYPTION_KEY`) yordamchilari.
- Seed: 1 test user, 1 loyiha, soxta ad_entities + ad_metrics_daily + leads (UI'ni real ulanishsiz ko'rish uchun).

**Tugadi:** migratsiyalar qo'llangan, seed qatorlari bor, Drizzle'dan o'qish ishlaydi.

## Phase 3 — Auth (Clerk)
- `@clerk/nextjs` o'rnatish, middleware bilan himoyalangan route'lar.
- Email+parol va **Google OAuth** (nativ Clerk).
- Clerk webhook (`user.created`) → `users` upsert; yoki birinchi so'rovda upsert.
- Logged-out → `/login`; logged-in, loyihasiz → `/onboarding`; loyihali → `/dashboard`.
- (Telegram login — Phase 11 yoki v1.1, custom widget.)

**Tugadi:** foydalanuvchi ro'yxatdan o'tib, himoyalangan sahifaga kira oladi; `users` qatori yaratiladi.

## Phase 4 — Loyihalar (multi-project)
- Loyiha CRUD: yaratish (modal), ro'yxat, almashtirgich (top-left dropdown).
- Joriy loyiha konteksti (URL yoki cookie); barcha so'rovlar `project_id` bilan.

**Tugadi:** targetolog bir nechta loyiha yaratib, ular orasida almasha oladi; har biri izolyatsiyalangan.

## Phase 5 — Meta integratsiyasi
- Meta OAuth oqimi (connect/callback) → `meta_connections` (token shifrlangan).
- Ad accounts & pages ro'yxati API'lari → loyihaga biriktirish (`project_meta`).
- **pg-boss `meta.sync`** ishi: campaign/adset/ad'larni `ad_entities`'ga, kunlik insights'ni
  `ad_metrics_daily`'ga tortadi; cron (~30–60 daq) + qo'lda "Sync now".
- `sync_runs` bilan holat.

**Tugadi:** ulangan loyiha uchun Meta'dan ad'lar va kunlik metrikalar DB'ga tushadi.

## Phase 6 — CRM integratsiyasi (Bitrix24 birinchi)
- CRM'ni **adapter interfeysi** orqali yozish (`CrmAdapter`); Bitrix24 implementatsiyasi.
- OAuth → `crm_connections`; pipeline + qualified_stage + won_stage + revenue_field sozlash UI.
- **pg-boss `crm.sync`** ishi: deal/lead'larni o'qib, mavjud `leads` bilan moslab,
  `is_qualified` / `is_won` / `revenue`'ni yangilaydi.

**Tugadi:** Bitrix ulangan loyihada bitim bosqichlari va daromad `leads`'da aks etadi.

## Phase 7 — Lead o'tkazish (FB Lead Ads → CRM)
- Meta `leadgen` webhook endpoint (verify + qabul) → `webhook_events` (dedup).
- `lead_forms`: page formalarini ro'yxatlash, tanlash, maydon moslashtirish, target pipeline/stage.
- **pg-boss `lead.transfer`** ishi: Graph API'dan lid maydonlari + ad id'lar → CRM'ga yozish
  (Bitrix adapter) → `leads` yaratish, `ad_entity_id` biriktirish; retry + `transfer_status`.

**Tugadi:** FB Lead Ad to'ldirilganda lid CRM'ga avtomatik o'tadi va `/leads`'da o'z reklamasiga bog'langan ko'rinadi.

## Phase 8 — Attribution + Dashboard
- Hisoblash qatlami: ad_metrics_daily (sarf) + leads (sifatli lid, daromad) → ad/adset/campaign
  bo'yicha ROAS, CAC, CPL, CPQL, foyda.
- Dashboard: KPI kartalar + Campaigns/Ad sets/Ads jadvali (TanStack Table), sana oralig'i, drawer.
- `/leads` sahifasi.

**Tugadi:** dashboard'da har reklama bo'yicha sarf, sifatli lid, daromad, ROAS to'g'ri ko'rinadi (sana oralig'i bilan).

## Phase 9 — Tavsiya engine (svetofor)
- **`recommendations.compute`** ishi (sync'dan keyin): nisbiy reyting + xavfsizlik darvozalari
  (17-savol mantiqi): ROAS-birinchi/CPQL-fallback, top~3 🟢 / bottom~3 🔴 (faqat ROAS<1 yoki
  0 sifatli lid bo'lsa), qolgani 🟡; har darajada; data darvozasi bilan.
- Dashboard jadvalida svetofor **Badge**; `/recommendations` sahifasi (saralangan, sabab bilan, seen/done).

**Tugadi:** har reklamaga 🟢/🔴/🟡 belgi va `/recommendations`'da "buni o'chir / buni ko'paytir" sababi bilan chiqadi.

## Phase 10 — amoCRM adapter
- `CrmAdapter`'ning amoCRM implementatsiyasi (OAuth, pipelines, sync, lead yozish).

**Tugadi:** loyiha amoCRM bilan ham Bitrix kabi to'liq ishlaydi.

## Phase 11 — UI sayqal va holatlar
- Onboarding sehrgari (stepper) yakuniy ko'rinishi.
- Bo'sh holatlar, yuklanish skeletonlari, xato holatlari (03-app-flow bo'yicha).
- Responsive (mobil). Telegram login (custom widget).

**Tugadi:** barcha asosiy ekranlarda bo'sh/yuklanish/xato holatlari to'g'ri; mobilda ishlaydi.

## Phase 12 — Test va chekka holatlar
- Asosiy oqimlarni qo'lda test: signup → loyiha → Meta → Bitrix → lead transfer → dashboard → tavsiya.
- Chekka holatlar: token muddati tugashi (refresh), webhook idempotentligi (dedup), retry,
  bo'sh data, valyuta mosligi, App Review kutilayotgan holat.

**Tugadi:** barcha asosiy oqimlar real test akkauntlarda muvaffaqiyatli o'tadi.

## Phase 13 — Deploy (VPS)
- Production Docker Compose (app + worker + postgres + Caddy/Nginx), domen + TLS.
- Production env'lar; commit emas.
- Meta/CRM webhook'lar uchun public HTTPS URL'lar (`APP_BASE_URL`).
- Meta App Review tasdiqlangach — production ruxsatlari yoqiladi.

**Tugadi:** AdProfit production URL'da jonli; webhook'lar va cron ishlaydi.

---

## Tugash mezoni (butun loyiha — v1)

Targetolog ro'yxatdan o'tadi → mijoz loyihasini yaratadi → Meta va **Bitrix24/amoCRM**'ni ulaydi →
FB Lead Ads lidlari avtomatik CRM'ga o'tadi va ad'ga bog'lanadi → dashboard'da har campaign/ad set/ad
bo'yicha **sarf, sifatli lid, daromad, ROAS** ko'rinadi → AdProfit har reklamaga **🟢 ko'paytir /
🔴 o'chir / 🟡 kuzat** tavsiyasini sabab bilan beradi. Hammasi end-to-end ishlaydi.
