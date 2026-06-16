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

## Ma'lumot izolyatsiyasi
Supabase RLS yo'q — har bir DB so'rovi `assertProjectOwnership(userId, projectId)` orqali
joriy foydalanuvchining loyihalari bilan cheklanadi. OAuth tokenlari DB'da `ENCRYPTION_KEY`
bilan shifrlangan, frontendga chiqmaydi.
