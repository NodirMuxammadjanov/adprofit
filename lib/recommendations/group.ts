/**
 * Tavsiyalarni filtrlash va verdict bo'yicha guruhlash — SOF funksiyalar.
 *
 * UI mantiqi (`RecommendationList`) shu yerdan foydalanadi; alohida ajratilgani
 * uni client komponentdan mustaqil unit-test qilish imkonini beradi.
 */

import type { EntityLevel } from "@/lib/metrics/types";
import type { Verdict } from "@/lib/recommendations/types";

/** Guruh tartibi: avval o'chirish, keyin ko'paytirish, oxirida kuzatish. */
export const VERDICT_GROUP_ORDER: Verdict[] = ["kill", "scale", "watch"];

export type StatusFilter = "all" | "pending" | "done";
export type LevelFilter = EntityLevel | "all";

/** Guruhlash/filtrlash uchun kerakli minimal shakl. */
type Groupable = {
  verdict: Verdict;
  level: EntityLevel;
  status: string;
};

/** Tanlangan daraja va status filtriga ko'ra elementlarni ajratadi. */
export function filterRecommendations<T extends Groupable>(
  items: T[],
  level: LevelFilter,
  status: StatusFilter,
): T[] {
  return items.filter((it) => {
    if (level !== "all" && it.level !== level) return false;
    if (status === "pending" && it.status === "done") return false;
    if (status === "done" && it.status !== "done") return false;
    return true;
  });
}

/**
 * Filtrlangan elementlarni verdict bo'yicha guruhlaydi (kill → scale → watch).
 * Har guruh ichida "done" elementlar pastga suriladi. V8 sort BARQAROR, shuning
 * uchun done bo'lmaganlarning kiruvchi tartibi (mas. sarf bo'yicha) BUZILMAYDI.
 * Bo'sh guruhlar tashlab yuboriladi.
 */
export function groupRecommendations<T extends Groupable>(
  items: T[],
  level: LevelFilter,
  status: StatusFilter,
): { verdict: Verdict; list: T[] }[] {
  const filtered = filterRecommendations(items, level, status);
  return VERDICT_GROUP_ORDER.map((verdict) => {
    const list = filtered
      .filter((it) => it.verdict === verdict)
      .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
    return { verdict, list };
  }).filter((g) => g.list.length > 0);
}
