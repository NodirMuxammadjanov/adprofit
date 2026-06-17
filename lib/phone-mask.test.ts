import { describe, it, expect } from "vitest";
import { maskPhone, hasPhone } from "@/lib/phone-mask";

describe("maskPhone", () => {
  it("docstring misollariga mos keladi", () => {
    expect(maskPhone("+998901234234")).toBe("+998 ** *** 42 34");
    expect(maskPhone("998901234234")).toBe("998 ** *** 42 34");
    expect(maskPhone("12345678")).toBe("12 ** 56 78");
    expect(maskPhone("1234567")).toBe("1 ** 45 67");
    expect(maskPhone("1234")).toBe("** 34");
    expect(maskPhone("")).toBe("");
  });

  it("null/undefined uchun bo'sh satr qaytaradi", () => {
    expect(maskPhone(null)).toBe("");
    expect(maskPhone(undefined)).toBe("");
  });

  it("ajratuvchilarni (bo'shliq, tire, qavs) e'tiborsiz qoldiradi", () => {
    expect(maskPhone("+998 90 123 42 34")).toBe("+998 ** *** 42 34");
    expect(maskPhone("(998) 90-123-42-34")).toBe("998 ** *** 42 34");
  });

  it("qisqa raqamlarning ham bir qismini yashiradi (PII himoyasi)", () => {
    // 3+ raqamli har qanday qiymatda kamida bitta yulduzcha bo'lsin
    // (to'liq raqam ochilib qolmasin). 2 xonalida yashiradigan narsa yo'q.
    for (const raw of ["123", "1234", "12345", "123456", "+99890"]) {
      expect(maskPhone(raw)).toContain("*");
    }
  });

  it("oxirgi ko'rinadigan qism xom raqamning oxiri bilan tugaydi", () => {
    expect(maskPhone("+998901234234").endsWith("42 34")).toBe(true);
    expect(maskPhone("70000099").endsWith("00 99")).toBe(true);
  });
});

describe("hasPhone", () => {
  it("raqam bor bo'lsa true", () => {
    expect(hasPhone("+998901234234")).toBe(true);
    expect(hasPhone("12")).toBe(true);
  });

  it("bo'sh/null/undefined yoki faqat ajratuvchilar bo'lsa false", () => {
    expect(hasPhone("")).toBe(false);
    expect(hasPhone(null)).toBe(false);
    expect(hasPhone(undefined)).toBe(false);
    expect(hasPhone("---")).toBe(false);
    expect(hasPhone("   ")).toBe(false);
  });
});
