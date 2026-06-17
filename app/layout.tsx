import type { ComponentProps } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import { hasClerk } from "@/lib/auth";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AdProfit — Foyda olib keladigan reklamalarni topib beramiz",
  description: "Targetolog uchun Meta Ads + CRM foyda analitikasi va svetofor tavsiya.",
};

type ClerkProviderProps = ComponentProps<typeof ClerkProvider>;

/** Brend ko'rinishi — primary rang 04-ui-ux.md (#4F46E5 Indigo). */
const clerkAppearance: ClerkProviderProps["appearance"] = {
  variables: {
    colorPrimary: "#4F46E5",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-inter)",
  },
};

/**
 * Clerk uchun o'zbekcha lokalizatsiya — Clerk uz tilini ta'minlamaydi,
 * shuning uchun asosiy maydon yorliqlari, tugmalar va xato matnlarini
 * "auth.clerk" namespace'idan to'ldiramiz. LocalizationResource DeepPartial
 * bo'lgani uchun faqat bir qism kalitlarni berish kifoya.
 */
async function buildClerkLocalization(): Promise<
  ClerkProviderProps["localization"]
> {
  const t = await getTranslations("auth.clerk");
  const localization: ClerkProviderProps["localization"] = {
    socialButtonsBlockButton: t("socialButton"),
    dividerText: t("dividerText"),
    formButtonPrimary: t("continue"),
    formFieldLabel__emailAddress: t("emailLabel"),
    formFieldLabel__password: t("passwordLabel"),
    signIn: {
      start: {
        title: t("signInTitle"),
        subtitle: t("signInSubtitle"),
        actionText: t("noAccount"),
        actionLink: t("signUpAction"),
      },
    },
    signUp: {
      start: {
        title: t("signUpTitle"),
        subtitle: t("signUpSubtitle"),
        actionText: t("haveAccount"),
        actionLink: t("signInAction"),
      },
    },
    unstable__errors: {
      form_identifier_not_found: t("formErrorIdentifier"),
      form_password_incorrect: t("formErrorIdentifier"),
      form_param_nil: t("formErrorRequired"),
      form_param_format_invalid__email_address: t("formErrorEmail"),
      form_password_length_too_short: t("formErrorPassword"),
    },
  };
  // Faqat qismiy override — Clerk qolgan kalitlarni o'z standartidan oladi
  // (LocalizationResource DeepPartial, shuning uchun cast kerak emas).
  return localization;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const messages = await getMessages();

  // v1: yagona UI tili — o'zbekcha (i18n/request.ts ham "uz" qaytaradi).
  const body = (
    <html lang="uz" className={inter.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );

  // Clerk kalitlari bo'lmasa ClerkProvider'siz render qilamiz (dev mock).
  if (!hasClerk()) return body;

  const localization = await buildClerkLocalization();
  return (
    <ClerkProvider appearance={clerkAppearance} localization={localization}>
      {body}
    </ClerkProvider>
  );
}
