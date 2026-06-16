import { getRequestConfig } from "next-intl/server";

export const defaultLocale = "uz" as const;
export const locales = ["uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // v1: yagona UI tili — o'zbekcha. Kod i18n'ga tayyor (rus keyin).
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
