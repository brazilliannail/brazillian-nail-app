"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { StatCard } from "@/components/StatCard";
import { DetalhamentoBars } from "@/components/DetalhamentoBars";
import {
  CalendarIcon,
  UsersIcon,
  UserPlusIcon,
  HistoryIcon,
  ScissorsIcon,
  CashIcon,
  ClockIcon,
  WalletIcon,
  TagIcon,
  CloseIcon,
  UserXIcon,
} from "@/components/icons";
import { mockRelatorioAtendimentos, mockDetalhamento, type DimensaoDetalhamento } from "@/lib/financeiro-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

const DIMENSOES = ["cliente", "servico", "formaPagamento", "statusPagamento"] as const;

export function RelatorioAtendimentos() {
  const { t } = useLanguage();
  const r = t.financeiro.relatorio;
  const [dimensao, setDimensao] = useState<DimensaoDetalhamento | "profissional">("cliente");
  const dados = mockRelatorioAtendimentos;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-foreground">{r.titulo}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={CalendarIcon} label={r.campos.quantidadeAtendimentos} value={dados.quantidadeAtendimentos} />
        <StatCard icon={UsersIcon} label={r.campos.quantidadeClientesAtendidas} value={dados.quantidadeClientesAtendidas} />
        <StatCard icon={UserPlusIcon} label={r.campos.clientesNovas} value={dados.clientesNovas} />
        <StatCard icon={HistoryIcon} label={r.campos.clientesRecorrentes} value={dados.clientesRecorrentes} />
        <StatCard icon={ScissorsIcon} label={r.campos.servicosRealizados} value={dados.servicosRealizados} />
        <StatCard icon={CashIcon} label={r.campos.valorServicos} value={formatCurrency(dados.valorServicos)} />
        <StatCard icon={CashIcon} label={r.campos.totalRecebido} value={formatCurrency(dados.totalRecebido)} tone="brand" />
        <StatCard icon={ClockIcon} label={r.campos.totalPendente} value={formatCurrency(dados.totalPendente)} tone="warning" />
        <StatCard icon={WalletIcon} label={r.campos.gorjetas} value={formatCurrency(dados.gorjetas)} />
        <StatCard icon={TagIcon} label={r.campos.descontos} value={formatCurrency(dados.descontos)} />
        <StatCard icon={CashIcon} label={r.campos.ticketMedio} value={formatCurrency(dados.ticketMedio)} tone="brand" />
        <StatCard icon={CloseIcon} label={r.campos.cancelamentos} value={dados.cancelamentos} />
        <StatCard icon={UserXIcon} label={r.campos.ausencias} value={dados.ausencias} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">{r.detalharPor.titulo}</p>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-background p-1">
          {[...DIMENSOES, "profissional" as const].map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setDimensao(opcao)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                dimensao === opcao ? "bg-brand text-white" : "text-foreground/60 hover:text-foreground"
              } ${opcao === "profissional" ? "opacity-60" : ""}`}
            >
              {r.detalharPor[opcao]}
            </button>
          ))}
        </div>

        {dimensao === "profissional" ? (
          <p className="rounded-xl bg-muted px-3 py-3 text-sm text-foreground/60">
            {r.detalharPor.profissionalIndisponivel}
          </p>
        ) : (
          <DetalhamentoBars dados={mockDetalhamento[dimensao]} />
        )}
      </div>
    </div>
  );
}
