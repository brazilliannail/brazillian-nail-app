"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility } from "@/components/FinancialVisibilityProvider";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ClockIcon, CalendarIcon, WalletIcon, BellIcon, PlusIcon, UserPlusIcon, ZapIcon } from "@/components/icons";
import { mockAgendaHoje, mockResumoHoje } from "@/lib/mock-data";

const VALOR_OCULTO = "••••••";

export default function Home() {
  const { locale, t } = useLanguage();
  const { visible } = useFinancialVisibility();

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={ClockIcon} label={t.cards.proximoAtendimento} value={mockResumoHoje.proximoAtendimento} tone="brand" />
        <StatCard icon={CalendarIcon} label={t.cards.agendamentosHoje} value={mockResumoHoje.agendamentosHoje} />
        <StatCard
          icon={WalletIcon}
          label={t.cards.totalRecebidoHoje}
          value={visible ? mockResumoHoje.totalRecebidoHoje : VALOR_OCULTO}
          tone="brand"
        />
        <StatCard
          icon={WalletIcon}
          label={t.cards.totalEstimadoDia}
          value={visible ? mockResumoHoje.totalEstimadoDia : VALOR_OCULTO}
        />
        <StatCard
          icon={WalletIcon}
          label={t.cards.valoresPendentes}
          value={visible ? mockResumoHoje.valoresPendentes : VALOR_OCULTO}
        />
        <StatCard icon={BellIcon} label={t.cards.lembretesAmanha} value={mockResumoHoje.lembretesAmanha} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t.agendaHoje.titulo}</h2>
            <p className="text-xs text-foreground/50">{t.misc.dadosFicticios}</p>
          </div>
          <Link href="/agenda" className="text-sm font-medium text-brand hover:underline">
            {t.agendaHoje.verCompleta}
          </Link>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-border">
          {mockAgendaHoje.map((item) => (
            <li key={item.horario} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-medium text-foreground/70">{item.horario}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.cliente}</p>
                  <p className="truncate text-sm text-foreground/60">
                    {locale === "pt" ? item.servicoPt : item.servicoEn}
                  </p>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">{t.atalhos.titulo}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            title={t.misc.emConstrucao}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <PlusIcon className="h-6 w-6 text-brand" />
            {t.atalhos.novoAgendamento}
          </button>
          <button
            type="button"
            title={t.misc.emConstrucao}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <UserPlusIcon className="h-6 w-6 text-brand" />
            {t.atalhos.novaCliente}
          </button>
          <button
            type="button"
            title={t.misc.emConstrucao}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <ZapIcon className="h-6 w-6 text-brand" />
            {t.atalhos.encaixe}
          </button>
          <Link
            href="/agenda"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted"
          >
            <CalendarIcon className="h-6 w-6 text-brand" />
            {t.atalhos.verAgenda}
          </Link>
        </div>
      </section>
    </div>
  );
}
