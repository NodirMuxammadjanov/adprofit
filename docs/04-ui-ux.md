# UI/UX Design Brief — AdProfit

**Estetika:** minimal, toza, data-zich dashboard — **adtru / Linear / Vercel** uslubida.
Ortiqcha bezak yo'q; raqamlar va tavsiya bosh qahramon. Light-mode birlamchi.

## Rang tokenlari

| Token | Qiymat | Maqsad |
|-------|--------|--------|
| Primary (brand) | `#4F46E5` (Indigo) | tugma, aktiv holat, brend urg'usi |
| Background | `#FFFFFF` | asosiy fon |
| Surface / panel | `#F9FAFB` | karta, jadval fon |
| Border | `#E5E7EB` | chiziq, ajratgich |
| Text (asosiy) | `#111827` | sarlavha, raqam |
| Text (ikkilamchi) | `#6B7280` | yorliq, izoh |
| **Yashil (Skala / foyda)** | `#16A34A` | 🟢 ko'paytir, ijobiy ROAS |
| **Qizil (O'chir / zarar)** | `#DC2626` | 🔴 o'chir, zarar |
| **Sariq (Kuzat)** | `#D97706` | 🟡 data kam / noaniq |

> Svetofor ranglari (yashil/qizil/sariq) — mahsulotning yuragi. Ular **semantik** standart:
> har joyda bir xil ma'noda ishlatiladi (tavsiya belgisi, ROAS rangi, status badge).

## Tipografika

- **UI shrift:** Inter.
- **Raqamlar:** `font-variant-numeric: tabular-nums` — jadvaldagi raqamlar tik ustun bo'lib tursin.
- O'lchamlar: sarlavha 24–30px, bo'lim 18px, asosiy matn 14px, jadval 13–14px.

## Komponent uslubi

- **Burchaklar:** 8px radius (kartalar, tugmalar, inputlar).
- **Soyalar:** juda yengil karta soyasi (`shadow-sm`), flat'ga yaqin.
- **Tugmalar:** primary (indigo to'la), secondary (outline), destructive (qizil) — o'chirish tavsiyalari uchun.
- **Komponentlar:** shadcn/ui asosida (Button, Card, Table, Dialog, Drawer, Badge, Select, Tabs, Toast).

## Asosiy UI naqshlari (Patterns)

- **KPI kartalar** — yuqorida qatorda: Sarf, Daromad, Foyda, ROAS, Sifatli lid, CPL/CPQL.
  Har karta: katta raqam + kichik yorliq + (mavjud bo'lsa) o'zgarish foizi.
- **Data jadvali** — Campaigns / Ad sets / Ads tablar; ustunlar saralanadi; har qatorда
  svetofor **Badge** (🟢/🔴/🟡). "Active only" filtr. Qator bosilsa — o'ng **Drawer** (tafsilot).
- **Tavsiyalar ro'yxati** — kartalar: rang chizig'i (chap chetda yashil/qizil/sariq) + harakat
  gapi ("Buni o'chir") + sabab ("$40 sarf, 0 sotuv") + "ko'rildi/bajarildi" tugmasi.
- **Loyiha almashtirgich** — chap-yuqorida dropdown (mijoz nomi + avatar harfi).
- **Onboarding** — bosqichli sehrgar (stepper): 1 Loyiha · 2 Meta · 3 CRM · 4 Lead transfer.
- **Sana oralig'i** — yuqori-o'ngda preset (Bugun/7/30 kun) + maxsus oraliq.

## Rejim (Mode)

- **Light — birlamchi.** Dark mode = v1.1 (tokenlar CSS o'zgaruvchilari bilan, keyin oson qo'shiladi).

## Mobil

- To'liq responsive. Jadval mobilda gorizontal scroll yoki muhim ustunlarga qisqaradi.
- Navbar hamburger menyuga yig'iladi; KPI kartalar 2 ustunга tushadi.

## Foydalanish qulayligi (Accessibility)

- Kontrast WCAG AA (matn `#111827` oq fonda — yetarli).
- Faqat rangga tayanmaymiz: svetofor belgisida rang **+ ikonka/yozuv** (🟢 "Skala", 🔴 "O'chir").
- Fokus halqalari (focus ring) ko'rinadigan; tugma/havola klaviaturadan ishlaydi.
- Minimal shrift 13px; bosiladigan element ≥ 36px balandlik.

## Mos yozuvlar (Reference apps)

- **adtru.ai** — jadval va integratsiya tuzilishi.
- **Linear** — toza, tezkor, minimal hisi.
- **Vercel dashboard** — KPI kartalar va bo'shliq ishlatilishi.
