import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const body = (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );

  // Clerk kalitlari bo'lmasa ClerkProvider'siz render qilamiz (dev mock).
  return hasClerk() ? <ClerkProvider>{body}</ClerkProvider> : body;
}
