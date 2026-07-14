"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { NavKey } from "@/components/nav-items";

export function ComingSoon({ titleKey }: { titleKey: NavKey }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface p-8">
      <h1 className="text-lg font-semibold text-foreground">{t.nav[titleKey]}</h1>
      <p className="text-sm text-foreground/60">{t.misc.emConstrucao} — {t.misc.emConstrucaoTexto}</p>
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        {t.misc.voltar}
      </Link>
    </div>
  );
}
