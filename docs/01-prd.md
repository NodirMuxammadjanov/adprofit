# PRD — AdProfit

**Tagline:** Foyda olib keladigan reklamalarni topib beramiz.

---

## Muammo (Problem)

Targetolog Meta Ads Manager'da faqat **sarf, ko'rsatish, klik, lid soni (CPL)** ko'radi —
lekin Meta unga **qaysi lid pulga aylandi**ini ko'rsatolmaydi. Daromad esa CRM'da
(Bitrix24 / amoCRM) yotadi.

Bugun targetolog bu ikki manbani **qo'lda** bog'laydi: CRM'dan bitimlarni eksport qiladi,
Meta'dan sarfni oladi, UTM yoki lid ismi bo'yicha taqqoslaydi. Bu soatlab vaqt oladi,
xatoga to'la va har hafta qaytadan qilinishi kerak.

Natijada targetolog **qaysi reklama haqiqatda foyda keltirayotganini bilmaydi**. U arzon
CPL'li kampaniya/ad set'larni duplicate qilib ko'paytiradi — aslida o'sha arzon lidlar CRM'da
**sifatsizga** chiqib ketayotgan bo'ladi. Tekshirish uchun UTM orqali har bir lidni qo'lda
kuzatish kerak; vaqt ketadi, shuning uchun ko'pchilik buni umuman qilmaydi va pulni isrof qiladi.

**Eng asosiy og'riq — ko'rinmaslik:** qaysi reklama foydali ekani noma'lum, shu sabab byudjet
noto'g'ri reklamaga ketadi.

---

## Maqsadli foydalanuvchi (Target User)

**Yakka targetolog / frilanser.** U bir vaqtning o'zida bir nechta mijozning Meta
reklamasini yuritadi. Har bir mijoz uchun alohida natijani (sarf, lid, sifatli lid, daromad,
foyda) ko'rishni xohlaydi. Reklama atamalarini (campaign, ad set, ad, ROAS, CPL) yaxshi biladi,
lekin analitikaga ko'p vaqt sarflashni istamaydi — tez, aniq xulosa kerak.

> Eslatma: agentlik (jamoa, ko'p seat, rollar) va biznes egasi (in-house) — bu personalar
> v1 doirasida emas. Butun til, dashboard va onboarding "men targetolog, mijozlarim bor"
> mantiqiga qurilади.

---

## Asosiy qiymat taklifi (Core Value Proposition)

Bozorda allaqachon o'xshash mahsulotlar bor (Roistat, **adtru.ai**, venaai.uz, Smartis).
Ular **dashboard + attribution** qismini yaxshi qiladi — ya'ni "raqam ko'rsatish" bu **minimal
kirish narxi**, g'alaba emas. AdProfit ularда yo'q narsa bilan ajraladi:

1. **Tavsiya / Aql qatlami (asosiy qurol)** — AdProfit shunchaki raqam ko'rsatmaydi, **qaror
   aytadi**: har bir campaign/ad set/ad uchun 🟢 *Skala qil* / 🔴 *O'chir* / 🟡 *Kuzat*.
   v1'da bu qoidaga asoslangan ("svetofor"); to'liq LLM tahlili — v2.
2. **Lid o'tkazish + attribution bitta joyda** — Albato/make.com lidni o'tkazadi, lekin
   analitika bermaydi; adtru analitika beradi, lekin Lead Ads lidini o'tkazmaydi (snippet'ga
   tayanadi). AdProfit **FB Lead Ads → CRM** o'tkazadi **va** o'sha lidni ad'ga bog'lab foydani
   ko'rsatadi. ad_id webhook'dan kelgani uchun attribution 100% ishonchli.
3. **Soddalik + o'zbek/lokal** — 5 daqiqada ulanadi, faqat targetolog kerak qiladigan narsa,
   o'zbek tili va lokal narx.

---

## Funksiyalar — Must Have (v1)

1. **Auth va akkaunt** — targetolog ro'yxatdan o'tadi, kiradi, chiqadi.
2. **Multi-loyiha (mijoz) boshqaruvi** — har bir mijoz = alohida loyiha; loyihalar orasida
   almashtirish.
3. **Meta Ads ulanish** — OAuth orqali, ad account tanlash; campaign → ad set → ad bo'yicha
   statistika (sarf, impressions, klik, CTR, CPM, CPC, lid, CPL) tortib olinadi.
4. **CRM ulanish** — **Bitrix24 (birinchi)**, keyin **amoCRM**; pipeline va "Qualified stage"
   (sifatli lid bosqichi) tanlanadi. Yopilgan (won) bitimdan daromad olinadi.
5. **Lid o'tkazish servisi** — Facebook **Lead Ads** webhook orqali lidlarni CRM'ga o'tkazadi,
   ad_id / adset_id / campaign_id / form_id'ni biriktirib yuboradi.
6. **Attribution / matching** — har bir lidni va yopilgan bitimni o'zining reklamasiga bog'laydi
   (qaysi reklamadan kelgan lid sotuvga aylandi).
7. **Dashboard** — KPI kartalar (Sarf, Daromad, Foyda, ROAS, Sifatli lid, CPL, CPQL...) +
   Campaigns / Ad sets / Ads kesimidagi jadval.
8. **Svetofor tavsiya** — qoidaga asoslangan: har bir reklamaga 🟢 Skala / 🔴 O'chir / 🟡 Kuzat
   belgisi (ROAS, sifatli lid soni, sarf chegarasi bo'yicha).

---

## Funksiyalar — Nice to Have (v2+)

- **To'liq LLM (AI) tahlili** — tabiiy tilda batafsil xulosa: nega va keyingi qadam.
- **MCP server** — AdProfit'ni Claude'ga ulab, shu yerdan xulosa olish.
- **Higgsfield MCP** — rasmli kreativ generatsiya.
- **Landing page tracking snippet** — traffic/conversion kampaniyalar uchun (adtru kabi).
- **Meta Conversions API** — server-side eventlar, attribution aniqligini oshiradi.
- **Mahsulot tannarxi / marja** — sof foyda (revenue − spend − COGS).
- **Avtomatik harakat** — tavsiyani Meta'ga to'g'ridan-to'g'ri qo'llash (ad o'chirish, byudjet o'zgartirish).
- **Jamoa / multi-seat** — agentlik uchun bir nechta targetolog, rollar.

---

## Doiradan tashqari (Out of Scope — v1)

- **Meta'dan boshqa manbalar** (Google Ads, TikTok Ads va h.k.) — faqat Meta.
- **Landing page snippet** — v1'da yo'q; faqat Lead Ads + Meta API + CRM daromad.
- **Avtomatik harakat** — v1 faqat **tavsiya** beradi; o'chirish/oshirishni targetolog qo'lda qiladi.
- **COGS / mahsulot tannarxi** — foyda = daromad − reklama sarfi (tannarxsiz).
- **Jamoa / rollar / multi-seat** — bitta targetolog akkaunti.
- **Mobil ilova** — web (responsive) yetarli, alohida ilova yo'q.

---

## Foydalanuvchi hikoyalari (User Stories)

- Targetolog sifatida men **Meta va CRM'ni 5 daqiqada ulashni** xohlayman, токи har bir mijoz
  uchun datani qo'lda yig'masdan boshlay olay.
- Targetolog sifatida men **har bir campaign/ad set/ad bo'yicha sarf, sifatli lid va daromadni
  bitta jadvalda** ko'rishni xohlayman, токи qaysi reklama foydali ekanini darrov bilay.
- Targetolog sifatida men **FB Lead Ads lidlarini avtomatik CRM'ga** o'tkazishni xohlayman,
  токи Albato/make.com'ga alohida pul to'lamay va lid attribution'i to'g'ri bo'lsin.
- Targetolog sifatida men har bir reklama yonida **🟢/🔴/🟡 tavsiya** ko'rishni xohlayman,
  токи qaysi reklamani o'chirish/ko'paytirishni o'ylab o'tirmay, darrov harakat qilay.
- Targetolog sifatida men **mijozlar orasida tez almashishni** xohlayman, токi har birining
  natijasini alohida ko'ray.

---

## Muvaffaqiyat metrikalari (Success Metrics)

1. **Faollashtirish (Activation):** ro'yxatdan o'tgan targetologning **70%+** birinchi 10
   daqiqada Meta + CRM'ni ulab, dashboard'da kamida 1 ta loyiha datasini ko'radi.
2. **Tutib qolish (Retention):** faol foydalanuvchilarning **40%+** haftada kamida 3 marta
   dashboard'ga kiradi.
3. **Qiymat isboti:** foydalanuvchi har hafta o'rtacha **kamida 1 ta** "o'chir/ko'paytir"
   tavsiyasiga amal qiladi.
4. **Biznes:** birinchi 3 oyda **50 ta to'lovchi targetolog**.
