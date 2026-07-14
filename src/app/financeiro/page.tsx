"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { StatCard } from "@/components/StatCard";
import { FormaPagamentoBars } from "@/components/FormaPagamentoBars";
import { PagamentoCard } from "@/components/PagamentoCard";
import { ValorPendenteCard } from "@/components/ValorPendenteCard";
import { FinanceiroDetailsPanel } from "@/components/FinanceiroDetailsPanel";
import { RelatorioAtendimentos } from "@/components/RelatorioAtendimentos";
import { CashIcon, ScissorsIcon, WalletIcon, TagIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import { mockResumoFinanceiro, mockFormasPagamento, mockPagamentos, mockValorPendente } from "@/lib/financeiro-mock";
import { formatDateMMDDYYYY } from "@/lib/date";

type Periodo = "hoje" | "semana" | "mes" | "ano" | "personalizado";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function FinanceiroPage() {
  const { t } = useLanguage();
  const f = t.financeiro;
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pagamentoSelecionado = mockPagamentos.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{f.titulo}</h1>
            <p className="text-sm text-foreground/60">
              {f.periodoSelecionado}: {f.periodo[periodo]} · {formatDateMMDDYYYY(new Date())}
            </p>
          </div>
        </div>

        <div>
          <div className="inline-flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
            {(["hoje", "semana", "mes", "ano", "personalizado"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setPeriodo(opcao)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  periodo === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {f.periodo[opcao]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-foreground/50">{t.misc.dadosFicticios}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard icon={CashIcon} label={f.cartoes.totalRecebido} value={formatCurrency(mockResumoFinanceiro.totalRecebido)} tone="brand" />
          <StatCard icon={ScissorsIcon} label={f.cartoes.valorServicos} value={formatCurrency(mockResumoFinanceiro.valorServicosRealizados)} />
          <StatCard icon={WalletIcon} label={f.cartoes.gorjetas} value={formatCurrency(mockResumoFinanceiro.gorjetas)} />
          <StatCard icon={TagIcon} label={f.cartoes.descontos} value={formatCurrency(mockResumoFinanceiro.descontos)} />
          <StatCard icon={ClockIcon} label={f.cartoes.totalPendente} value={formatCurrency(mockResumoFinanceiro.totalPendente)} tone="warning" />
          <StatCard icon={CalendarIcon} label={f.cartoes.quantidadeAtendimentos} value={mockResumoFinanceiro.quantidadeAtendimentos} />
          <StatCard icon={CashIcon} label={f.cartoes.ticketMedio} value={formatCurrency(mockResumoFinanceiro.ticketMedioServicos)} tone="brand" />
        </div>

        <FormaPagamentoBars dados={mockFormasPagamento} />

        <RelatorioAtendimentos />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{f.listaPagamentos.titulo}</p>
          {mockPagamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-foreground/60">{f.vazio}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {mockPagamentos.map((pagamento) => (
                <PagamentoCard
                  key={pagamento.id}
                  pagamento={pagamento}
                  selected={pagamento.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">{f.valoresPendentes.titulo}</p>
          <ValorPendenteCard
            pendente={mockValorPendente}
            selected={selectedId === mockValorPendente.pagamentoId}
            onSelect={() => setSelectedId(mockValorPendente.pagamentoId)}
          />
        </div>
      </div>

      {pagamentoSelecionado && (
        <div className="hidden lg:sticky lg:top-20 lg:block lg:w-96 lg:shrink-0">
          <FinanceiroDetailsPanel pagamento={pagamentoSelecionado} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {pagamentoSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <FinanceiroDetailsPanel pagamento={pagamentoSelecionado} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
