# TRD — AdProfit

> Bu hujjat PRD'dagi mahsulot vizyonini texnik qarorlarga aylantiradi. Har bir tanlov
> PRD'dagi funksiyaga xizmat qiladi.

## Stack

| Qatlam | Tanlov |
|--------|--------|
| **Frontend** | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| **Backend** | Next.js Route Handlers (API) + alohida Node **worker** jarayoni (fon ishlari) |
| **Fon ishlari** | **pg-boss** — Postgres'ga asoslangan navbat + cron (Redis kerak emas): webhook qayta ishlash, davriy Meta polling, CRM sync, retry |
| **ORM / migratsiya** | **Drizzle ORM + Drizzle Kit** |
| **Database** | **PostgreSQL — o'z VPS'da (self-hosted)** |
| **Auth** | **Clerk** — email + parol, Google OAuth (nativ), Telegram login (custom widget) |
| **Hosting** | **O'z VPS** — Docker Compose (Next.js app + worker + Postgres + Nginx/Caddy reverse proxy) |

**Sabablar:**
- DB o'z VPS'da bo'lgani uchun fon ishlari ham tashqi servisga (Inngest cloud) bog'lanmaydi —
  **pg-boss** mavjud Postgres'ni ishlatadi, qo'shimcha Redis/servis kerak emas.
- **Drizzle** — TypeScript-native, yengil, migratsiyalari aniq; AI agent uchun qulay.
- Supabase ishlatilmagani uchun **RLS yo'q** — ma'lumot izolyatsiyasi ilova qatlamida (har
  so'rov `user_id` bo'yicha cheklanadi). Schema hujjatida batafsil.

---

## Uchinchi tomon API'lar va servislar

### Auth
- **Clerk** — sessiya, email+parol, **Google OAuth** (nativ). *Bepul tarif ~10k MAU.*
  Clerk foydalanuvchisi bizning `users` jadvalimizga `clerk_user_id` orqali bog'lanadi
  (Clerk webhook `user.created` yoki birinchi so'rovda upsert).
- **Telegram Login Widget** — Telegram bot orqali login; `hash` bot token bilan tekshiriladi,
  so'ng Clerk'ga custom token / external account sifatida ulanadi. *Bepul (bot).* **Custom ish.**

### Reklama
- **Meta Marketing API (Graph API)** — campaign/ad set/ad statistikasi (sarf, impr, klik, CTR,
  CPM, CPC, lid), OAuth. *Bepul.* Ruxsatlar: `ads_read`, `ads_management`, `leads_retrieval`,
  `pages_manage_metadata` (App Review + Business Verification talab qiladi).
- **Meta Lead Ads (Graph API + Webhooks)** — `leadgen` webhook orqali yangi lid, so'ng Graph
  API'dan lid maydonlari (`leads_retrieval`). Page'ga obuna kerak. *Bepul.*

### CRM (loyiha bo'yicha faqat bittasi aktiv)
- **Bitrix24 REST API** — OAuth 2.0 (cloud) yoki webhook; deal/lead o'qish-yozish, pipeline &
  stage o'qish, eventlarga obuna. *Bepul.* **v1 birinchi.**
- **amoCRM (Kommo) REST API** — OAuth 2.0; lead/deal o'qish-yozish, pipeline & status, webhook.
  *Bepul.* **v1, Bitrix'dan keyin.**

### v2 (hozir emas)
- **Anthropic Claude API** — to'liq LLM tahlili.
- **MCP server** — AdProfit datasini Claude'ga ochish.
- **Higgsfield API/MCP** — rasmli kreativ.

---

## Asosiy kutubxonalar

- **@clerk/nextjs** — auth (middleware, sessiya, UI komponentlar).
- **drizzle-orm** + **drizzle-kit** + **pg** (yoki **postgres**) — DB va migratsiya.
- **pg-boss** — fon ishlari (navbat + cron), worker jarayonida.
- **@tanstack/react-query** — server state, kesh, refetch.
- **zod** — barcha tashqi data (Meta/CRM/webhook) va form validatsiyasi.
- **Tremor** (yoki shadcn charts) — dashboard KPI kartalar va grafiklar.
- **@tanstack/react-table** — Campaigns/Ad sets/Ads jadvali (saralash, filtр).
- **lucide-react** — ikonkalar.
- **date-fns** — sana/oraliq hisob-kitoblari.
- **next-intl** — o'zbek/rus tili (i18n).

---

## Muhit o'zgaruvchilari (faqat nomlar)

```
# Database (self-hosted Postgres)
DATABASE_URL

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET

# Telegram login
TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME

# Meta
META_APP_ID
META_APP_SECRET
META_OAUTH_REDIRECT_URI
META_WEBHOOK_VERIFY_TOKEN

# Bitrix24
BITRIX_CLIENT_ID
BITRIX_CLIENT_SECRET
BITRIX_OAUTH_REDIRECT_URI

# amoCRM
AMO_CLIENT_ID
AMO_CLIENT_SECRET
AMO_OAUTH_REDIRECT_URI

# Umumiy
APP_BASE_URL
ENCRYPTION_KEY        # Meta/CRM OAuth tokenlarini shifrlash uchun
```

> Qiymatlar bu yerda saqlanmaydi — faqat nomlar.

---

## Cheklovlar (Constraints)

- **Self-hosted VPS** — Docker Compose orqali deploy; tashqi bog'liqliklar minimal
  (faqat Clerk auth uchun, u ham bepul tarif). DB, jobs, app — hammasi VPS'da.
- **Ma'lumot izolyatsiyasi ilova qatlamida** — Supabase RLS yo'q; har bir DB so'rovi
  joriy foydalanuvchining `user_id`'si bo'yicha cheklanishi **majburiy** (Schema hujjatida).
- **Web, to'liq responsive** — alohida mobil ilova yo'q; telefon brauzerида ishlasin.
- **O'zbek tili — birlamchi UI tili**, kod i18n'ga tayyor (rus keyin).
- **Valyuta** — Meta hisobi (USD/UZS) va CRM bitim valyutasi farq qilishi mumkin; har hisob
  valyutasi saqlanadi, dashboard'da to'g'ri ko'rsatiladi. (Kurs konvertatsiyasi v2.)
- **Maxfiy tokenlar** — Meta/Bitrix/amo OAuth tokenlari DB'da **shifrlangan** holda saqlanadi
  (`ENCRYPTION_KEY`), hech qachon frontendga chiqmaydi.
- **Faqat Meta** reklama manbasi (Google/TikTok v1'da yo'q).
- **Faqat tavsiya** — v1 Meta'ga yozmaydi; faqat o'qiydi.
