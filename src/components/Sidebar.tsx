"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { NAV_ITEMS } from "@/components/nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
          BN
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">{t.brand}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand/10 text-brand"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
