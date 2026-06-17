# Changelog

Bu loyihaning sezilarli o'zgarishlari shu yerda hujjatlanadi.
Format [Keep a Changelog](https://keepachangelog.com/) ga yaqin; sanalar `YYYY-MM-DD`.

## [Unreleased] — 2026-06-17

UX/UI sayqallash bosqichi: kirish-chiqish holatlari, i18n qayta tuzilishi, Telegram login,
mobil navigatsiya va ishonchlilik (error/loading) qatlamlari. Hamda birinchi avtomatik
test qatlami (Vitest).

### Testlar (Vitest)
- `vitest` devDependency qo'shildi; `pnpm test` / `pnpm test:watch`; konfiguratsiya `vitest.config.ts` (node env, `@/` alias).
- 32 ta sof birlik testi: `lib/phone-mask` (PII niqob), `lib/metrics/range` (preset + custom oraliq, fake timer bilan deterministik), `lib/recommendations/group` (verdict guruhlash/saralash), `lib/jobs/lead` (retransfer loyiha-egaligi tekshiruvi; `db` va navbat mock qilingan).
- Tavsiya guruhlash/saralash mantiqi `RecommendationList`'dan sof `lib/recommendations/group.ts`'ga ajratildi (testlanadigan qilib; ko'rinadigan o'zgarish yo'q).
- `pnpm-workspace.yaml` qo'shildi: `allowBuilds` orqali `esbuild`/`sharp`/`@clerk/shared`/`unrs-resolver` build-skriptlari tasdiqlandi — toza (exit 0) `pnpm install` va `pnpm test/typecheck/lint`.

### Accessibility
- Auth sahifalarida ko'rinmas (`sr-only`) sarlavhalar; nav va ikonkalarda `aria-label`,
  `aria-current`, `aria-hidden`.
- Hamma interaktiv elementda ko'rinadigan focus ring (`focus-visible:ring-*`).
- Svetofor (verdict) faqat rangga tayanmaydi — rang + ikonka + yozuv (`VerdictBadge`).
- Lidlar jadvalida telefon PII sifatida niqoblanadi, tugma orqali ochiladi (`lib/phone-mask.ts`).

### i18n
- Yagona `messages/uz.json` namespace bo'yicha fayllarga bo'lindi:
  `messages/<locale>/<namespace>.json` (auth, common, dashboard, integrations, landing,
  leads, nav, onboarding, projects, recommendations, verdict).
- `messages/ru/` to'liq tarjimalari qo'shildi (hali yoqilmagan; `defaultLocale` = `uz`).
- `i18n/request.ts` endi `messages/<locale>/` ichidagi har bir `.json` ni avtomatik
  o'qiydi va deep-merge qiladi; buzilgan fayl build'da log'ga chiqadi.
- Clerk UI `auth.clerk` namespace'idan o'zbekchaga lokalizatsiya qilindi.
- Inter shriftiga `cyrillic` subset qo'shildi (ru matni uchun).

### Onboarding
- Yangi bosqichli sehrgar komponentlari: `OnboardingWizard`, `Stepper`, `ProjectStep`,
  `CompletionStep`.
- `routeAfterAuth` endi "yadro" onboarding holatini tekshiradi: Meta ad account + Facebook
  Page **va** CRM pipeline/qualified/won bosqichlari bo'lmasa sehrgarga qaytaradi
  (faqat "loyiha bormi" emas). Lead transfer dashboardni bloklamaydi.
- `onboarding/loading.tsx` va `onboarding/error.tsx`.

### Dashboard
- `KpiCards`, `EntityTable`, `EntityDrawer`, `DateRangePicker` sayqallandi.
- Sana oralig'i hisob-kitobi (`lib/metrics/range.ts`, `lib/metrics/dashboard.ts`) yangilandi.
- `dashboard/loading.tsx` (skeleton) va `dashboard/error.tsx`.

### Recommendations
- `RecommendationList` qayta ishlandi (rang chizig'i, harakat gapi, sabab, holat tugmasi).
- `recommendations/loading.tsx` va `recommendations/error.tsx`.

### Leads
- `LeadsTable`: telefon niqoblash + ochish, ustun/qidiruv yaxshilandi.
- Muvaffaqiyatsiz lidni CRM'ga qayta o'tkazish: `POST /api/leads/[id]/retransfer`
  (autentifikatsiya + `assertProjectOwnership` + rate-limit; pg-boss ishi idempotent).
- `lib/jobs/lead.ts` ga `enqueueLeadRetransfer` qo'shildi.
- `leads/loading.tsx` va `leads/error.tsx`.

### Integrations
- `MetaConnect`, `CrmConnect`, `LeadAdsTransfer` sayqallandi; ulanish holatlari
  (`lib/meta/connection.ts`, `lib/crm/connection.ts`) kengaytirildi.
- `integrations/loading.tsx`.

### Nav / mobile
- Yangi `MobileNav` — sm dan kichik ekranda hamburger + Sheet; `AppNav` `NAV_LINKS` ni
  eksport qiladi (desktop/mobil bitta manbadan).
- `ProjectSwitcher` sayqallandi.

### Landing / Auth
- Landing (`/`) qayta ishlandi: hero + mahsulot ko'rinishi (3 skrinshot slot:
  `/public/preview-{dashboard,recommendations,leads}.png`) + 3 ta tavsiya turi kartasi.
- **Telegram orqali kirish**: `components/auth/TelegramLoginButton.tsx` +
  `app/api/auth/telegram/route.ts` — HMAC hash tekshiruvi, eskirgan/kelajak payload rad,
  replay (`markSeenOnce`) va rate-limit, Clerk **ticket** sign-in.
- `login` / `signup` sahifalarida sr-only sarlavha; Clerk kalitlari yo'qda dev fallback.
- `app/not-found.tsx` va `app/global-error.tsx` qo'shildi.

### Reliability
- Har bir route segmentida `loading.tsx` (skeleton) va `error.tsx`; ildizda
  `global-error.tsx` (mustaqil `<html>`/i18n) va `not-found.tsx`.
- `lib/rate-limit.ts` — fixed-window rate-limit + bir martalik (replay) nazorati
  (in-memory, best-effort; ko'p instansda durable store kerak).
- Telegram va retransfer endpoint'lari ownership-scoped, idempotent, rate-limited.
- `query-provider` sozlamalari yangilandi.

### Config / env
- `.env.example` ga `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` qo'shildi (client login tugmasi
  uchun; `TELEGRAM_BOT_USERNAME` bilan bir xil qiymat, build vaqtida kerak).
