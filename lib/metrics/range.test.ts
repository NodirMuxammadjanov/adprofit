import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseRangeKey,
  resolveRange,
  resolveCustomRange,
  resolveRangeFromParams,
} from "@/lib/metrics/range";

// "Bugun"ni deterministik qilish uchun vaqtni muzlatamiz (UTC yarim tun = 2026-06-17).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-17T10:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("parseRangeKey", () => {
  it("yaroqli presetlarni o'tkazadi", () => {
    expect(parseRangeKey("today")).toBe("today");
    expect(parseRangeKey("7d")).toBe("7d");
    expect(parseRangeKey("30d")).toBe("30d");
  });

  it("custom va noma'lum qiymatlar uchun 30d default", () => {
    expect(parseRangeKey("custom")).toBe("30d");
    expect(parseRangeKey("xyz")).toBe("30d");
    expect(parseRangeKey(undefined)).toBe("30d");
    expect(parseRangeKey(null)).toBe("30d");
  });

  it("massivdan birinchi elementni oladi", () => {
    expect(parseRangeKey(["7d", "30d"])).toBe("7d");
  });
});

describe("resolveRange (preset)", () => {
  it("7d — bugun bilan tugaydigan 7 kun", () => {
    const r = resolveRange("7d");
    expect(r.key).toBe("7d");
    expect(r.fromDate).toBe("2026-06-11");
    expect(r.toDate).toBe("2026-06-17");
    expect(r.days).toBe(7);
    expect(r.fromTs.toISOString()).toBe("2026-06-11T00:00:00.000Z");
    expect(r.toTsExclusive.toISOString()).toBe("2026-06-18T00:00:00.000Z");
  });

  it("today — bitta kun", () => {
    const r = resolveRange("today");
    expect(r.fromDate).toBe("2026-06-17");
    expect(r.toDate).toBe("2026-06-17");
    expect(r.days).toBe(1);
  });

  it("30d — 30 kun", () => {
    const r = resolveRange("30d");
    expect(r.toDate).toBe("2026-06-17");
    expect(r.days).toBe(30);
  });
});

describe("resolveCustomRange", () => {
  it("yaroqli oraliqni quradi", () => {
    const r = resolveCustomRange("2026-06-01", "2026-06-10");
    expect(r).not.toBeNull();
    expect(r!.key).toBe("custom");
    expect(r!.fromDate).toBe("2026-06-01");
    expect(r!.toDate).toBe("2026-06-10");
    expect(r!.days).toBe(10);
  });

  it("teskari tartibni to'g'rilaydi (from ≤ to)", () => {
    const r = resolveCustomRange("2026-06-10", "2026-06-01");
    expect(r!.fromDate).toBe("2026-06-01");
    expect(r!.toDate).toBe("2026-06-10");
  });

  it("kelajak sanasini bugunga cheklaydi", () => {
    const r = resolveCustomRange("2026-06-01", "2026-12-31");
    expect(r!.toDate).toBe("2026-06-17");
  });

  it("from ham kelajakda bo'lsa ikkalasi bugunga cheklanadi", () => {
    const r = resolveCustomRange("2026-12-01", "2026-12-31");
    expect(r!.fromDate).toBe("2026-06-17");
    expect(r!.toDate).toBe("2026-06-17");
    expect(r!.days).toBe(1);
  });

  it("yaroqsiz format yoki yo'q sana uchun null", () => {
    expect(resolveCustomRange("bad", "2026-06-10")).toBeNull();
    expect(resolveCustomRange("2026-06-01", null)).toBeNull();
    expect(resolveCustomRange("2026-02-31", "2026-06-10")).toBeNull(); // mavjud bo'lmagan sana
    expect(resolveCustomRange("2026-13-01", "2026-06-10")).toBeNull();
  });
});

describe("resolveRangeFromParams", () => {
  it("range=custom + yaroqli from/to → custom", () => {
    const r = resolveRangeFromParams({
      range: "custom",
      from: "2026-06-01",
      to: "2026-06-10",
    });
    expect(r.key).toBe("custom");
    expect(r.fromDate).toBe("2026-06-01");
  });

  it("range=custom + yaroqsiz from/to → presetga (30d) tushadi", () => {
    const r = resolveRangeFromParams({ range: "custom", from: "bad" });
    expect(r.key).toBe("30d");
  });

  it("preset range uzatilsa o'shani qaytaradi", () => {
    expect(resolveRangeFromParams({ range: "7d" }).key).toBe("7d");
    expect(resolveRangeFromParams({}).key).toBe("30d");
  });
});
