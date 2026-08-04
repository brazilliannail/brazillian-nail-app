"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility } from "@/components/FinancialVisibilityProvider";
import { GlobeIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import { formatDateMMDDYYYY } from "@/lib/date";
import { authClient } from "@/lib/auth/client";

export function Header() {
  const { locale, toggleLocale, t } = useLanguage();
  const { visible, toggleVisible } = useFinancialVisibility();
  const today = formatDateMMDDYYYY(new Date());

  async function sair() {
    await authClient.signOut();
    window.location.assign("/auth/sign-in");
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:h-16 sm:gap-3 sm:px-6">
      <div className="flex items-center gap-1.5 lg:hidden">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-semibold text-white sm:h-8 sm:w-8 sm:rounded-lg sm:text-sm">
          BN
        </span>
        <span className="text-xs font-semibold tracking-tight text-foreground sm:text-sm">{t.brand}</span>
      </div>

      <span className="hidden text-sm text-foreground/60 lg:block">{today}</span>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-4">
        <span className="text-xs text-foreground/60 lg:hidden">{today}</span>

        <button
          type="button"
          onClick={toggleLocale}
          aria-label="Alternar idioma / Toggle language"
          className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          <GlobeIcon className="hidden h-4 w-4 text-foreground/50 sm:block" />
          <span className={locale === "pt" ? "text-brand" : "text-foreground/40"}>PT</span>
          <span className="text-foreground/30">/</span>
          <span className={locale === "en" ? "text-brand" : "text-foreground/40"}>EN</span>
        </button>

        <button
          type="button"
          onClick={toggleVisible}
          aria-label={visible ? t.header.ocultarValores : t.header.mostrarValores}
          aria-pressed={visible}
          className="flex items-center justify-center rounded-full border border-border bg-background p-1.5 text-foreground/70 transition-colors hover:bg-muted sm:p-2"
        >
          {visible ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={sair}
          aria-label="Sair do aplicativo"
          title="Sair"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/70 transition-colors hover:bg-brand hover:text-white sm:h-9 sm:w-9 sm:text-sm"
        >
          R
        </button>
      </div>
    </header>
  );
}
