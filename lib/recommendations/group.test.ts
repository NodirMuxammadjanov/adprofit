import { describe, it, expect } from "vitest";
import {
  groupRecommendations,
  filterRecommendations,
} from "@/lib/recommendations/group";
import type { EntityLevel } from "@/lib/metrics/types";
import type { Verdict } from "@/lib/recommendations/types";

type Item = { id: string; verdict: Verdict; level: EntityLevel; status: string };

const items: Item[] = [
  { id: "a", verdict: "scale", level: "ad", status: "new" },
  { id: "b", verdict: "kill", level: "adset", status: "new" },
  { id: "c", verdict: "watch", level: "ad", status: "new" },
  { id: "d", verdict: "scale", level: "ad", status: "done" },
  { id: "e", verdict: "scale", level: "campaign", status: "new" },
  { id: "f", verdict: "kill", level: "ad", status: "seen" },
];

const ids = (list: Item[]) => list.map((i) => i.id);

describe("groupRecommendations", () => {
  it("guruhlarni kill → scale → watch tartibida qaytaradi", () => {
    const groups = groupRecommendations(items, "all", "all");
    expect(groups.map((g) => g.verdict)).toEqual(["kill", "scale", "watch"]);
  });

  it("guruh ichida done elementlarni pastga suradi (qolgan tartib saqlanadi)", () => {
    const groups = groupRecommendations(items, "all", "all");
    const scale = groups.find((g) => g.verdict === "scale")!;
    // a(new), e(new) yuqorida; d(done) oxirida.
    expect(ids(scale.list)).toEqual(["a", "e", "d"]);
  });

  it("status=pending — done chiqariladi, 'seen' qoladi", () => {
    const groups = groupRecommendations(items, "all", "pending");
    const scale = groups.find((g) => g.verdict === "scale")!;
    expect(ids(scale.list)).toEqual(["a", "e"]); // d (done) chiqdi
    const kill = groups.find((g) => g.verdict === "kill")!;
    expect(ids(kill.list)).toEqual(["b", "f"]); // f ("seen") pending sifatida qoladi
  });

  it("status=done — faqat done; bo'sh guruhlar tashlanadi", () => {
    const groups = groupRecommendations(items, "all", "done");
    expect(groups.map((g) => g.verdict)).toEqual(["scale"]);
    expect(ids(groups[0].list)).toEqual(["d"]);
  });

  it("daraja (level) filtri", () => {
    const groups = groupRecommendations(items, "ad", "all");
    expect(groups.map((g) => g.verdict)).toEqual(["kill", "scale", "watch"]);
    expect(ids(groups.find((g) => g.verdict === "scale")!.list)).toEqual(["a", "d"]);
    expect(ids(groups.find((g) => g.verdict === "kill")!.list)).toEqual(["f"]);
  });

  it("bo'sh ro'yxat uchun bo'sh natija", () => {
    expect(groupRecommendations([], "all", "all")).toEqual([]);
  });
});

describe("filterRecommendations", () => {
  it("level + status birgalikda", () => {
    expect(ids(filterRecommendations(items, "campaign", "all"))).toEqual(["e"]);
    expect(ids(filterRecommendations(items, "all", "done"))).toEqual(["d"]);
  });
});
