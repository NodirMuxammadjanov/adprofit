/**
 * Sana oralig'i — dashboard/leads uchun preset oraliqlar + maxsus (custom) oraliq.
 * Ikki o'lcham: ad_metrics_daily.date (date) va leads.created_at (timestamptz).
 * Hammasi UTC bo'yicha hisoblanadi (seed ham UTC sana ishlatadi).
 */

export type PresetKey = "today" | "7d" | "30d";
export type RangeKey = PresetKey | "custom";

export type DateRange = {
  key: RangeKey;
  label: string;
  /** ad_metrics_daily.date uchun — inklyuziv 'YYYY-MM-DD'. */
  fromDate: string;
  toDate: string;
  /** leads.created_at uchun — [fromTs, toTsExclusive). */
  fromTs: Date;
  toTsExclusive: Date;
  days: number;
};

const RANGE_DAYS: Record<PresetKey, number> = { today: 1, "7d": 7, "30d": 30 };
const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Bugun",
  "7d": "7 kun",
  "30d": "30 kun",
  custom: "Boshqa",
};

export const RANGE_OPTIONS: { key: PresetKey; label: string }[] = (
  Object.keys(RANGE_DAYS) as PresetKey[]
).map((key) => ({ key, label: RANGE_LABEL[key] }));

/** searchParam qiymatini xavfsiz preset RangeKey'ga (default 30d). "custom" bu yerda QABUL QILINMAYDI. */
export function parseRangeKey(value: string | string[] | undefined | null): PresetKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "today" || v === "7d" || v === "30d" ? v : "30d";
}

function firstParam(value: string | string[] | undefined | null): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v ?? null;
}

/** 'YYYY-MM-DD' formatini va kalendar haqiqiyligini tekshiradi (UTC). */
function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Sana mavjudligini tekshiramiz (mas. 2026-02-31 ni rad etamiz).
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function buildRange(key: RangeKey, label: string, from: Date, to: Date): DateRange {
  const toExclusive = new Date(to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  return {
    key,
    label,
    fromDate: utcDateStr(from),
    toDate: utcDateStr(to),
    fromTs: from,
    toTsExclusive: toExclusive,
    days,
  };
}

/** PresetKey → konkret sana chegaralari (bugun bilan tugaydigan oxirgi `days` kun). */
export function resolveRange(key: PresetKey): DateRange {
  const days = RANGE_DAYS[key];
  const today = utcMidnight();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return buildRange(key, RANGE_LABEL[key], from, today);
}

/**
 * Maxsus (custom) oraliq — from/to ISO ('YYYY-MM-DD') searchParam'laridan.
 * Yaroqsiz/yetishmaydigan qiymatlar → null (chaqiruvchi presetga tushadi).
 * To'g'ri tartibga keltiriladi (from ≤ to) va bugundan keyingi sanalar bugunga cheklanadi.
 */
export function resolveCustomRange(
  fromParam: string | string[] | undefined | null,
  toParam: string | string[] | undefined | null,
): DateRange | null {
  let from = parseIsoDate(firstParam(fromParam));
  let to = parseIsoDate(firstParam(toParam));
  if (!from || !to) return null;

  // Tartibni to'g'rilaymiz.
  if (from.getTime() > to.getTime()) [from, to] = [to, from];

  // Kelajak sanasini bugunga cheklaymiz.
  const today = utcMidnight();
  if (to.getTime() > today.getTime()) to = today;
  if (from.getTime() > today.getTime()) from = today;

  const label = `${utcDateStr(from)} – ${utcDateStr(to)}`;
  return buildRange("custom", label, from, to);
}

/**
 * Oraliq uchun ko'rsatiladigan yorliqni next-intl orqali aniqlaydi.
 * Preset kalitlar (today/7d/30d) `dashboard.range.*` dan tarjima qilinadi;
 * custom oraliq esa lokaldan mustaqil sana oralig'i sifatida ko'rsatiladi.
 *
 * DateRange.label hardkod o'zbekcha bo'lib qolgani uchun UI shu helperdan
 * foydalanadi (i18n-tayyor: ru/uz).
 */
export function rangeDisplayLabel(
  range: DateRange,
  t: (key: PresetKey) => string,
): string {
  if (range.key === "custom") return `${range.fromDate} – ${range.toDate}`;
  return t(range.key);
}

/**
 * Yuqori darajadagi helper: searchParam'lardan oraliqni aniqlaydi.
 * range=custom + yaroqli from/to bo'lsa custom; aks holda preset.
 */
export function resolveRangeFromParams(params: {
  range?: string | string[] | null;
  from?: string | string[] | null;
  to?: string | string[] | null;
}): DateRange {
  const rangeVal = firstParam(params.range);
  if (rangeVal === "custom") {
    const custom = resolveCustomRange(params.from, params.to);
    if (custom) return custom;
  }
  return resolveRange(parseRangeKey(params.range));
}
