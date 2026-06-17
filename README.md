# AdProfit

> Foyda olib keladigan reklamalarni topib beramiz.

Targetolog uchun Meta Ads sarfini CRM (Bitrix24 / amoCRM) daromadiga bog'lab, har bir
campaign / ad set / ad uchun **🟢 ko'paytir / 🔴 o'chir / 🟡 kuzat** tavsiyasini beradigan
SaaS. v1 — qoidaga asoslangan "svetofor" tavsiya.

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui · PostgreSQL (self-hosted) ·
Drizzle ORM · Clerk auth · pg-boss (worker) · Docker Compose.

## Lokal ishga tushirish

### 1. Talablar
- Node 24, pnpm 11, Docker.

### 2. Env
```bash
cp .env.example .env
# ENCRYPTION_KEY yarating:
openssl rand -hex 32
# .env ichida ENCRYPTION_KEY ga qo'ying. Clerk kalitlarini ham to'ldiring.
# Meta App Review kutilayotgan bo'lsa MOCK_INTEGRATIONS=true qoldiring (seed/mock bilan ishlaydi).
```

> **Build/CI uchun env:** `lib/env.ts` build paytida bo'sh qiymatlarga toqat qiladi
> (runtime'da kerak bo'lganda tekshiriladi), shuning uchun production build uchun
> majburiy minimum — `DATABASE_URL` va `ENCRYPTION_KEY`. Telegram tugmasi
> client komponent bo'lgani uchun `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` build vaqtida
> mavjud bo'lishi kerak (build'dan keyin qo'shilsa tugma chiqmaydi).

### 3. Docker bilan (to'liq stack)
```bash
docker compose up --build
# app:    http://localhost:3000  (Caddy orqali http://localhost)
# worker: pg-boss Postgres'ga ulanadi
# postgres: localhost:5432
```

### 4. Migratsiya va seed
```bash
pnpm install
pnpm db:generate     # schema -> SQL migratsiya
pnpm db:migrate      # migratsiyalarni qo'llash
pnpm db:seed         # test user + loyiha + soxta ad/metrics/leads
```

### 5. Dev (Docker'siz)
```bash
pnpm install
pnpm dev             # Next.js (port 3000)
pnpm worker:dev      # pg-boss worker (alohida terminal)
```

## Buyruqlar
| Buyruq | Tavsif |
|--------|--------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm worker` | pg-boss worker |
| `pnpm db:generate` | Drizzle migratsiya yaratish |
| `pnpm db:migrate` | Migratsiyalarni qo'llash |
| `pnpm db:seed` | Seed data |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest birlik testlari (bir marta) |
| `pnpm test:watch` | Vitest (kuzatuv rejimi) |

## Testlar (Vitest)

Sof birlik testlari `*.test.ts` fayllarida, manba yonida turadi (mas.
`lib/phone-mask.test.ts`). Tashqi servis/DB kerak emas — `db` va navbat mock qilinadi,
sana esa fake timer bilan muzlatiladi, shuning uchun testlar tez va deterministik.

```bash
pnpm test         # bir marta
pnpm test:watch   # kuzatuv rejimi
```

**Qamrov (v1):** telefon niqobi (`lib/phone-mask`), sana oralig'i + custom range
(`lib/metrics/range`), tavsiya guruhlash/saralash (`lib/recommendations/group`),
lid qayta-o'tkazish egaligi tekshiruvi (`lib/jobs/lead`).

> `vitest` → `esbuild`'ga tayanadi; `pnpm-workspace.yaml`'dagi `allowBuilds` uning
> build-skriptini tasdiqlaydi (aks holda `pnpm install` "Ignored build scripts" bilan
> non-zero qaytaradi va `pnpm test/typecheck/lint` ham bloklanadi).

## i18n (xabarlar tuzilishi)

Tarjimalar **namespace bo'yicha** bo'lingan fayllarda turadi:

```
messages/
  uz/                 # birlamchi UI tili
    auth.json         # login/signup, Clerk override (auth.clerk), Telegram (auth.telegram)
    common.json       # umumiy (retry, ...)
    dashboard.json  leads.json  recommendations.json  integrations.json
    onboarding.json  projects.json  nav.json  landing.json  verdict.json
  ru/                 # ruscha tarjimalar (mavjud, hali yoqilmagan)
    ... (uz bilan bir xil namespace fayllar)
```

- Fayl nomi = namespace. Komponentda `useTranslations("nav")` → `messages/<locale>/nav.json`.
- `i18n/request.ts` `messages/<locale>/` ichidagi **har bir `.json`** ni avtomatik o'qiydi
  va namespace sifatida birlashtiradi — **yangi namespace qo'shganda `request.ts` ni
  tahrirlash shart emas**, faqat yangi `<namespace>.json` faylni qo'shing (`uz` va `ru` ga).
  Buzilgan/bo'sh JSON build'da log'ga chiqadi (jim yutilmaydi).
- v1 birlamchi til — **uz** (`defaultLocale`). `ru` fayllari tayyor, lekin til
  almashtirgich keyingi versiyada yoqiladi; `app/layout.tsx` Inter shriftiga `cyrillic`
  subset qo'shilgan, ruscha matn to'g'ri ko'rinadi.
- Clerk UI o'zbekchaga `auth.clerk` namespace'idan tarjima qilinadi
  (`app/layout.tsx` → `buildClerkLocalization`).

## Telegram orqali kirish

Login/signup sahifalarida Clerk formasi ostida "Telegram orqali kirish" tugmasi chiqadi.
Oqim: widget → `/api/auth/telegram` (HMAC hash tekshiruvi + replay/rate-limit) → Clerk
sign-in **ticket** → `signIn.create({ strategy: "ticket" })` → `/dashboard`.

Sozlash bosqichlari:

1. **@BotFather** da bot yarating → `TELEGRAM_BOT_TOKEN` ni `.env` ga qo'ying.
2. Bot `@username` ni **ikkala** o'zgaruvchiga yozing: `TELEGRAM_BOT_USERNAME` (server) va
   `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (client tugma; build vaqtida kerak).
3. @BotFather → `/setdomain` orqali bot domenini sayt domeniga moslang (localhost ham mumkin).
4. **Clerk dashboard** da **"Ticket"** sign-in strategiyasini yoqing (custom token sign-in).
5. Bu var/kalitlardan biri yo'q bo'lsa tugma **jim** (null) qaytadi, sahifa buzilmaydi;
   server yo'li `503` qaytaradi.

## Landing skrinshotlari

Landing (`/`) mahsulot ko'rinishi bo'limida 3 ta skrinshot slot bor. Real PNG fayllarni
`/public` ga shu nomlar bilan joylang (yo'q bo'lsa framed bo'sh slot ko'rinadi, layout buzilmaydi):

```
public/preview-dashboard.png
public/preview-recommendations.png
public/preview-leads.png
```

## Xato / yuklanish holatlari

Har bir route segmentida `loading.tsx` (skeleton) va `error.tsx` (qayta urinish tugmasi) bor;
ildizda `app/global-error.tsx` (o'z `<html>`/i18n konteksti bilan) va `app/not-found.tsx`.
`lib/rate-limit.ts` — yengil in-memory rate-limit + replay (`markSeenOnce`) himoyasi
(Telegram login va lid qayta-yuborish endpoint'larida ishlatiladi; ko'p instansli muhitda
durable store kerak).

## Ma'lumot izolyatsiyasi
Supabase RLS yo'q — har bir DB so'rovi `assertProjectOwnership(userId, projectId)` orqali
joriy foydalanuvchining loyihalari bilan cheklanadi. OAuth tokenlari DB'da `ENCRYPTION_KEY`
bilan shifrlangan, frontendga chiqmaydi. Lidlar jadvalida telefon raqami PII sifatida
niqoblanadi (`lib/phone-mask.ts`) — foydalanuvchi qatordagi tugma bilan ochib ko'radi.
