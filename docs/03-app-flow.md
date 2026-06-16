# App Flow — AdProfit

> Foydalanuvchi mahsulot ichida qanday harakatlanadi. Har bir sahifa va o'tish yo'li.

## Sahifalar (Pages)

- `/` — **Landing** (logged-out): qisqa tavsif + "Boshlash" tugmasi → signup. Logged-in bo'lsa → `/dashboard`'ga redirect.
- `/login` — Clerk kirish (email+parol, Google, Telegram).
- `/signup` — Clerk ro'yxatdan o'tish.
- `/onboarding` — birinchi ulanish sehrgari (loyiha yaratish → Meta → CRM → Lead transfer).
- `/dashboard` — KPI kartalar + Campaigns/Ad sets/Ads jadvali (svetofor belgisi bilan).
- `/recommendations` — saralangan tavsiyalar ro'yxati: 🔴 o'chir / 🟢 ko'paytir / 🟡 kuzat.
- `/leads` — lidlar ro'yxati: qaysi reklamadan, status, sifatli/sotuv, summa.
- `/integrations` — joriy loyihaning Meta / CRM / Lead Ads transfer ulanishlari.
- `/settings` — akkaunt, til, billing.

## Navigatsiya

- **Yuqori navbar:** Dashboard · Recommendations · Leads · Integrations.
- **Chap-yuqorida:** loyiha (mijoz) almashtirgich (dropdown) + "Yangi loyiha" tugmasi.
- **O'ng-yuqorida:** akkaunt menyusi (Settings, Logout) — Clerk `<UserButton/>`.
- **Mobil:** responsive; navbar hamburger menyuga yig'iladi, loyiha almashtirgich tepada qoladi.

## Birinchi ekran (yangi mehmon)

Logged-out foydalanuvchi `/` (Landing)'ni ko'radi: bitta jumlali qiymat taklifi
("Foyda olib keladigan reklamalarni topib beramiz"), 2-3 ekran skrinshot, "Bepul boshlash" CTA →
`/signup`.

## Auth oqimi (Clerk)

1. `/signup` → email+parol **yoki** Google **yoki** Telegram.
2. Clerk email tasdiqlashni o'zi boshqaradi (kerak bo'lsa).
3. Birinchi kirishda backend `users` jadvalida `clerk_user_id` bo'yicha qator yaratadi (upsert / Clerk webhook).
4. Foydalanuvchining loyihasi **yo'q** → avtomatik `/onboarding`'ga.
5. Loyihasi **bor** → `/dashboard`'ga.

---

## Asosiy yo'nalish 1 — Onboarding (birinchi mijozni ulash)

> Maqsad: 10 daqiqada birinchi loyiha datasini dashboard'da ko'rish.

1. `/onboarding` — **Qadam 1: Loyiha yaratish.** Mijoz nomini kiritadi (mas. "Mars reklama").
2. **Qadam 2: Meta ulash.** "Connect Meta" → Meta OAuth → ruxsat → qaytib keladi → ulangan
   hisobdagi **ad account'lar ro'yxati** → bittasini bu loyihaga biriktiradi. FB Page ham tanlanadi
   (Lead Ads uchun kerak).
3. **Qadam 3: CRM ulash.** Bitrix24'ni tanlaydi → OAuth → portal ulanadi → **pipeline** tanlaydi
   → **"Qualified stage"** (sifatli lid bosqichi) tanlaydi → won (yopilgan) bosqich aniqlanadi.
4. **Qadam 4: Lead Ads transfer sozlash.** Tanlangan Page'dagi **lead formalar ro'yxati** chiqadi →
   qaysi formalarni o'tkazishni belgilaydi → har forma maydonlarini CRM maydonlariga **moslashtiradi**
   (ism, telefon, ...) → yangi lid tushadigan **CRM pipeline/bosqichini** tanlaydi.
5. **Tugadi** → "Sinxronlash boshlandi" → `/dashboard`. Birinchi data tortilguncha "Yuklanmoqda"
   holati ko'rsatiladi (Meta polling + CRM sync fon ishi).

## Asosiy yo'nalish 2 — Kunlik tekshiruv va qaror

> Maqsad: qaysi reklamani o'chirish/ko'paytirishni tez bilish.

1. Kiradi → `/dashboard` (oxirgi ko'rilgan loyiha).
2. Kerak bo'lsa **loyiha almashtirgich**dan boshqa mijozga o'tadi.
3. Sana oralig'ini tanlaydi (Bugun / 7 kun / 30 kun / maxsus).
4. Jadvalda Campaigns → Ad sets → Ads bo'yicha **sarf, sifatli lid, daromad, ROAS** va yonida
   🟢/🔴/🟡 **svetofor belgisi**ni ko'radi.
5. `/recommendations`'ga o'tadi → "🔴 Buni o'chir: $40 sarf, 0 sotuv" / "🟢 Buni ko'paytir: ROAS 5x"
   degan saralangan ro'yxatni ko'radi; har birida **sababi** (nega) yozilgan.
6. Qarorni **Meta Ads Manager'da qo'lda** bajaradi (v1 Meta'ga yozmaydi). Tavsiyani "ko'rildi /
   bajarildi" deb belgilashi mumkin.

## Asosiy yo'nalish 3 — Lid o'tkazish (avtomatik, fon)

> Foydalanuvchi aralashmaydi; tizim o'zi qiladi.

1. Odam FB Lead Ad formani to'ldiradi.
2. Meta `leadgen` **webhook** AdProfit'ga keladi → Inngest/pg-boss ishi navbatga qo'yiladi.
3. Ish Graph API'dan lid maydonlarini oladi (`leads_retrieval`) + ad_id/adset_id/campaign_id/form_id.
4. Maydonlarni moslashtirib **CRM'ga (Bitrix/amo) yozadi**, ad identifikatorlarini biriktiradi.
5. Lid `/leads`'da paydo bo'ladi, o'z reklamasiga bog'langan holda. CRM'da bosqich o'zgarsa
   (qualified / won), keyingi sync uni yangilaydi va dashboard/daromad qayta hisoblanadi.

---

## Bo'sh holatlar (Empty States)

- **Loyiha yo'q** → to'g'ridan-to'g'ri `/onboarding` (yuqoriga qarang).
- **Meta ulanmagan** → Dashboard'da "Meta'ni ulang" karta + tugma → `/integrations`.
- **CRM ulanmagan** → daromad/ROAS ustunlari "—", "CRM'ni ulang" eslatmasi.
- **Data hali yuklanmoqda** → skelet (skeleton) jadval + "Sinxronlanmoqda, bir-ikki daqiqa" banneri.
- **Lid yo'q** → `/leads`'da "Hali lid yo'q. Birinchi Lead Ads lidi shu yerda ko'rinadi."
- **Tavsiya yo'q (data kam)** → `/recommendations`'da "Aniq tavsiya uchun data yetarli emas
  (kamida N lid / M kun kerak)."

## Xato holatlari (Error States)

- **OAuth bekor qilindi / muvaffaqiyatsiz** → "Ulanish bekor qilindi, qayta urinib ko'ring" + tugma.
- **Token muddati tugagan (Meta/CRM)** → `/integrations`'da qizil "Qayta ulang" belgisi; sync
  to'xtaydi, banner chiqadi.
- **Meta App Review hali tugamagan / ruxsat yo'q** → "Meta ruxsati kutilmoqda" holati, qo'llanma havola.
- **Webhook/lid o'tkazish xatosi** → ish **retry** qilinadi (pg-boss); bir necha urinishdan keyin
  ham xato bo'lsa, `/leads`'da "o'tkazilmadi" belgisi + qayta yuborish tugmasi.
- **Tarmoq / server xatosi** → toast xabar + "Qayta urinish" tugmasi.

## Modal / Drawer

- **Yangi loyiha** → modal (nom kiritish).
- **Reklama tafsiloti** → o'ngdan chiqadigan drawer (ad'ning to'liq metrikasi + tavsiya sababi).
- **Tavsiya sababi** → "nega bunday tavsiya?" tushuntirishi (qaysi qoida ishladi).

## Redirektlar

- Login muvaffaqiyatli → loyiha bor bo'lsa `/dashboard`, yo'q bo'lsa `/onboarding`.
- Logout → `/` (Landing).
- Onboarding tugadi → `/dashboard`.
- Yangi loyiha yaratildi → o'sha loyihaning `/integrations` (Meta ulashdan boshlaydi).
- Himoyalangan sahifaga logged-out kirish → `/login` (Clerk middleware).
