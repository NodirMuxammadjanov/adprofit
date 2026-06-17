"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/components/app/AppNav";

/**
 * Mobil navigatsiya: sm dan kichik ekranlarda hamburger tugma + Sheet.
 * Desktop nav (hidden sm:flex) AppNav'da o'z holicha qoladi; bu unga
 * mobil muqobil bo'ladi. NAV_LINKS va isActive mantig'i AppNav bilan bir xil.
 */
export function MobileNav() {
  const t = useTranslations();
  const tProjects = useTranslations("projects");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={tProjects("menuLabel")}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border sm:hidden",
          "text-foreground outline-none transition-colors",
          "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{tProjects("menuLabel")}</SheetTitle>
        </SheetHeader>

        <nav aria-label={tProjects("menuLabel")} className="mt-6 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-l-2 border-primary bg-primary/10 font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;
