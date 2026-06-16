/**
 * Sana oralig'i — dashboard/leads uchun preset oraliqlar.
 * Ikki o'lcham: ad_metrics_daily.date (date) va leads.created_at (timestamptz).
 * Hammasi UTC bo'yicha hisoblanadi (seed ham UTC sana ishlatadi).
 */

export type RangeKey = "today" | "7d" | "30d";

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

const RANGE_DAYS: Record<RangeKey, number> = { today: 1, "7d": 7, "30d": 30 };
const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Bugun",
  "7d": "7 kun",
  "30d": "30 kun",
};

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = (
  Object.keys(RANGE_DAYS) as RangeKey[]
).map((key) => ({ key, label: RANGE_LABEL[key] }));

/** searchParam qiymatini xavfsiz RangeKey'ga (default 30d). */
export function parseRangeKey(value: string | string[] | undefined | null): RangeKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "today" || v === "7d" || v === "30d" ? v : "30d";
}

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** RangeKey → konkret sana chegaralari (bugun bilan tugaydigan oxirgi `days` kun). */
export function resolveRange(key: RangeKey): DateRange {
  const days = RANGE_DAYS[key];
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const toExclusive = new Date(today);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return {
    key,
    label: RANGE_LABEL[key],
    fromDate: utcDateStr(from),
    toDate: utcDateStr(today),
    fromTs: from,
    toTsExclusive: toExclusive,
    days,
  };
}
