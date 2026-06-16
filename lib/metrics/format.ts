/** Format yordamchilari — server va client'da bir xil ishlaydi (Intl, sof funksiyalar). */

function safeCurrency(code: string | null | undefined): string {
  const c = (code ?? "USD").toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "USD";
}

export type Formatters = ReturnType<typeof makeFormatters>;

export function makeFormatters(currency: string | null | undefined) {
  const cur = safeCurrency(currency);
  const money0 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  });
  const money2 = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  const dash = "—";

  return {
    /** Butun pul (KPI kartalar): $1,234 */
    money: (n: number | null | undefined): string =>
      n == null ? dash : money0.format(n),
    /** Aniq pul (CPL/CPC kabi): $12.34 */
    moneyPrecise: (n: number | null | undefined): string =>
      n == null ? dash : money2.format(n),
    int: (n: number | null | undefined): string => (n == null ? dash : intFmt.format(n)),
    /** ROAS: 2.4× */
    ratio: (n: number | null | undefined): string =>
      n == null ? dash : `${n.toFixed(2)}×`,
    pct: (n: number | null | undefined): string =>
      n == null ? dash : `${(n * 100).toFixed(1)}%`,
  };
}
