"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { NAV_ITEMS, BOTTOM_NAV_PRIMARY_KEYS, BOTTOM_NAV_MORE_KEYS } from "@/components/nav-items";
import { MoreIcon } from "@/components/icons";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = NAV_ITEMS.filter((item) => BOTTOM_NAV_PRIMARY_KEYS.includes(item.key));
  const moreItems = NAV_ITEMS.filter((item) => BOTTOM_NAV_MORE_KEYS.includes(item.key));
  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        {moreOpen && (
          <div className="border-b border-border bg-surface px-2 py-2">
            <ul className="flex flex-col">
              {moreItems.map(({ key, href, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                        active ? "bg-brand/10 text-brand" : "text-foreground/70 hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {t.nav[key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex w-full">
          {primaryItems.map(({ key, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-brand" : "text-foreground/60"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate px-1">{t.nav[key]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              moreOpen || moreActive ? "text-brand" : "text-foreground/60"
            }`}
          >
            <MoreIcon className="h-5 w-5" />
            <span className="truncate px-1">{t.nav.mais}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
