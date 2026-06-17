/**
 * Telefon raqamini PII sifatida niqoblash yordamchilari.
 *
 * Lidlar jadvalida telefon birlamchi holatda niqoblanadi (masalan
 * `+998 ** *** 12 34`); foydalanuvchi qatordagi tugma orqali ochib ko'radi.
 * Qidiruv esa xotiradagi **xom** qiymat bo'yicha ishlaydi (bu modul faqat
 * ko'rsatish uchun, qidiruv mantiqiga ta'sir qilmaydi).
 *
 * Sof funksiyalar — server va client'da bir xil natija beradi.
 */

/** Faqat raqam (va boshidagi +) belgilarini qoldiradi. */
function normalize(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/** Niqobda kamida shuncha raqam yulduzcha bilan yashirilsin (PII himoyasi). */
const MIN_MASKED = 2;

/**
 * Telefonni niqoblaydi: oxirgi (ko'pi bilan) 4 ta raqam ko'rinadi, o'rtasi `*`,
 * boshida mamlakat prefiksi (+998 kabi) saqlanadi.
 *
 * PII himoyasi: imkon bo'lsa kamida {@link MIN_MASKED} ta raqam doim
 * yulduzcha bilan yashiriladi. Qisqa/qisman raqamlarda ko'rinadigan oxirgi
 * qism qisqartiriladi, toki butun qiymat ochilib qolmasin.
 *
 * Misollar:
 *   "+998901234234"  → "+998 ** *** 42 34"
 *   "998901234234"   → "998 ** *** 42 34"
 *   "12345678"       → "12 ** 56 78"      (8 ta — kamida 2 ta yashirin)
 *   "1234567"        → "1 ** 45 67"       (7 ta — kamida 2 ta yashirin)
 *   "1234"           → "** 34"            (qisqa — yarmi yashirin)
 *   ""               → ""                 (bo'sh — niqob yo'q)
 */
export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const n = normalize(raw);
  const hasPlus = n.startsWith("+");
  const digits = hasPlus ? n.slice(1) : n;

  const len = digits.length;
  if (len === 0) return "";

  // Ko'rinadigan oxirgi raqamlar soni. Qisqa raqamlarda kamroq ko'rsatamiz,
  // toki kamida bir nechta raqam yashirin qolsin (to'liq PII oqib ketmasin).
  const visibleCount = Math.min(len > 5 ? 4 : 2, len);
  const visible = digits.slice(-visibleCount);
  const visiblePart =
    visible.length === 4 ? `${visible.slice(0, 2)} ${visible.slice(2)}` : visible;

  // Yashiriladigan raqamlar soni.
  const hiddenCount = Math.max(len - visibleCount, 0);

  if (hiddenCount === 0) {
    // Raqam juda qisqa — yashiradigan narsa yo'q, faqat prefiks.
    return hasPlus ? `+${visiblePart}` : visiblePart;
  }

  // Mamlakat kodi cleartext ko'rsatiladi (identifikatsiya qilmaydi), ammo
  // u barcha yashirin raqamlarni yeb qo'ymasligi kerak: kamida MIN_MASKED ta
  // raqam yulduzcha bo'lib qolsin (imkon bo'lsa).
  const codeLen = Math.min(3, Math.max(0, hiddenCount - MIN_MASKED));
  const code = digits.slice(0, codeLen);
  const stars = hiddenCount - codeLen;

  // Yulduzchalarni o'qish uchun "** ***" kabi guruhlaymiz.
  let starsPart = "";
  if (stars > 0) {
    const masked = "*".repeat(stars);
    starsPart =
      masked.length > 2 ? `${masked.slice(0, 2)} ${masked.slice(2)}` : masked;
  }

  const segments = [`${hasPlus ? "+" : ""}${code}`, starsPart, visiblePart].filter(
    (s) => s.length > 0,
  );
  return segments.join(" ");
}

/** Niqoblash uchun raqam bormi (bo'sh emas). */
export function hasPhone(raw: string | null | undefined): boolean {
  return !!raw && normalize(raw).length > 0;
}
