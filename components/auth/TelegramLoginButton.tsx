"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

/**
 * Telegram Login Widget tugmasi.
 *
 * Telegram'ning rasmiy widget script'ini inject qiladi. Foydalanuvchi
 * Telegram orqali tasdiqlasa, global callback `/api/auth/telegram` ga
 * payload yuboradi; server hash'ni tekshirib Clerk sign-in token (ticket)
 * qaytaradi; biz uni `signIn.create({ strategy: "ticket" })` bilan
 * yakunlaymiz va `/dashboard`'ga o'tamiz.
 *
 * Eslatma: bu komponent faqat `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` mavjud va
 * Clerk yoqilgan bo'lsa render qilinadi. Aks holda jim (null) qaytadi.
 *
 * Manual sozlash (kod bilan emas, Clerk dashboard'da):
 *   - "Ticket" sign-in strategiyasini yoqish kerak.
 *   - Telegram bot domeni @BotFather'da sayt domeniga moslanishi shart.
 */

// Telegram widget tasdiqlangan payload (tashqi manba; server qayta tekshiradi).
type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

export function TelegramLoginButton() {
  const t = useTranslations("auth.telegram");
  const router = useRouter();
  const { signIn, isLoaded, setActive } = useSignIn();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    // Bot username yo'q yoki Clerk hali yuklanmagan bo'lsa — render qilmaymiz.
    if (!botUsername || !isLoaded || !signIn || !setActive) return;
    const container = containerRef.current;
    if (!container) return;

    // Global callback — Telegram widget shu nomdagi funksiyani chaqiradi.
    window.onTelegramAuth = async (user: TelegramAuthData) => {
      setStatus("loading");
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (!res.ok) throw new Error(`auth failed: ${res.status}`);

        const { ticket } = (await res.json()) as { ticket?: string };
        if (!ticket) throw new Error("no ticket");

        const attempt = await signIn.create({
          strategy: "ticket",
          ticket,
        });

        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActive({ session: attempt.createdSessionId });
          router.push("/dashboard");
          return;
        }
        throw new Error(`unexpected status: ${attempt.status}`);
      } catch (err) {
        console.error("[telegram-login] failed:", err);
        setStatus("error");
      }
    };

    // Widget script'ini bir marta inject qilamiz.
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      container.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [botUsername, isLoaded, signIn, setActive, router]);

  // Bot sozlanmagan bo'lsa — hech narsa ko'rsatmaymiz (build buzilmaydi).
  if (!botUsername) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} aria-label="Telegram" />
      {status === "loading" && (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">{t("error")}</p>
      )}
    </div>
  );
}
