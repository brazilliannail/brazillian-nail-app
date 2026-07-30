"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useAtendimentos } from "@/components/AtendimentosProvider";
import { useAgenda } from "@/components/AgendaProvider";
import { useClientes } from "@/components/ClientesProvider";
import { useLancamentosCaixa } from "@/components/FinanceiroProvider";
import { StatCard } from "@/components/StatCard";
import { DetalhamentoBars, type ItemDetalhamento } from "@/components/DetalhamentoBars";
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
import {
  calcularRelatorioAtendimentos,
  detalharPorCliente,
  detalharPorServico,
  detalharPorFormaPagamento,
  detalharPorStatusPagamento,
} from "@/lib/financeiro-service";
import type { DateRange } from "@/lib/financeiro-comparacao";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type DimensaoDetalhamento = "cliente" | "servico" | "formaPagamento" | "statusPagamento";

const DIMENSOES: DimensaoDetalhamento[] = ["cliente", "servico", "formaPagamento", "statusPagamento"];

type RelatorioAtendimentosProps = {
  range: DateRange;
};

/**
 * Relatório de atendimentos por período — todo indicador e todo detalhamento vêm de
 * `financeiro-service.ts` (nenhum cálculo financeiro acontece aqui). Rótulos (nome de cliente,
 * tradução de serviço/forma/status) são resolvidos neste componente porque dependem do idioma
 * ativo (`useLanguage`), que a camada de serviço (pura, sem React) não tem acesso.
 */
export function RelatorioAtendimentos({ range }: RelatorioAtendimentosProps) {
  const { locale, t } = useLanguage();
  const r = t.financeiro.relatorio;
  const { atendimentos } = useAtendimentos();
  const { agendamentos } = useAgenda();
  const { clientes } = useClientes();
  const lancamentosCaixa = useLancamentosCaixa();
  const [dimensao, setDimensao] = useState<DimensaoDetalhamento | "profissional">("cliente");

  const clientesPorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);

  const dados = useMemo(
    () => calcularRelatorioAtendimentos(atendimentos, agendamentos, lancamentosCaixa, range),
    [atendimentos, agendamentos, lancamentosCaixa, range],
  );

  const itensDetalhamento: ItemDetalhamento[] = useMemo(() => {
    switch (dimensao) {
      case "cliente":
        return detalharPorCliente(atendimentos, range)
          .map((item) => ({ label: clientesPorId.get(item.clienteId)?.nome ?? item.clienteId, valor: item.valor }))
          .sort((a, b) => b.valor - a.valor);
      case "servico":
        return detalharPorServico(atendimentos, range)
          .map((item) => ({ label: locale === "pt" ? item.nomePt : item.nomeEn, valor: item.valor }))
          .sort((a, b) => b.valor - a.valor);
      case "formaPagamento":
        return detalharPorFormaPagamento(lancamentosCaixa, range)
          .map((item) => ({
            label: item.forma ? t.financeiro.formaPagamentoLabel[item.forma] : t.financeiro.detalhes.formaPagamentoNaoDefinida,
            valor: item.valor,
          }))
          .sort((a, b) => b.valor - a.valor);
      case "statusPagamento":
        return detalharPorStatusPagamento(atendimentos, range)
          .map((item) => ({ label: t.financeiro.status[item.status], valor: item.valor }))
          .sort((a, b) => b.valor - a.valor);
      default:
        return [];
    }
  }, [dimensao, atendimentos, lancamentosCaixa, clientesPorId, locale, range, t]);

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
          <DetalhamentoBars dados={itensDetalhamento} />
        )}
      </div>
    </div>
  );
}
