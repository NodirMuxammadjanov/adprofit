"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserButton } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "@/components/app/ProjectSwitcher";
import { MobileNav } from "@/components/app/MobileNav";

export type NavLink = {
  href: string;
  labelKey: string;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/recommendations", labelKey: "nav.recommendations" },
  { href: "/leads", labelKey: "nav.leads" },
  { href: "/integrations", labelKey: "nav.integrations" },
];

export function AppNav({ showAccount = false }: { showAccount?: boolean }) {
  const t = useTranslations();
  const tProjects = useTranslations("projects");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <MobileNav />

        <ProjectSwitcher />

        <nav
          aria-label={tProjects("menuLabel")}
          className="hidden items-center gap-1 sm:flex"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md border-b-2 px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-transparent font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {showAccount ? (
            <UserButton
              afterSignOutUrl="/login"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              fallback={<div className="h-8 w-8 rounded-full border bg-muted" />}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-medium text-muted-foreground"
              title="Demo (dev)"
            >
              D
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppNav;
