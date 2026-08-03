"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { useFinancialVisibility, VALOR_OCULTO } from "@/components/FinancialVisibilityProvider";
import type { FormaPagamento } from "@/lib/atendimentos-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type FormaPagamentoBarsProps = {
  dados: { forma: FormaPagamento | null; valor: number }[];
};

export function FormaPagamentoBars({ dados }: FormaPagamentoBarsProps) {
  const { t } = useLanguage();
  const { visible } = useFinancialVisibility();
  const f = t.financeiro;
  const maximo = Math.max(...dados.map((item) => item.valor), 1);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-foreground">{f.formasPagamento.titulo}</p>
      {dados.length === 0 ? (
        <p className="text-sm text-foreground/60">{f.vazio}</p>
      ) : (
      <div className="flex flex-col gap-3">
        {dados.map((item) => (
          <div key={item.forma ?? "naoDefinida"} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/70">
                {item.forma ? f.formaPagamentoLabel[item.forma] : f.detalhes.formaPagamentoNaoDefinida}
              </span>
              <span className="font-medium text-foreground">{visible ? formatCurrency(item.valor) : VALOR_OCULTO}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: visible ? `${Math.max((item.valor / maximo) * 100, 4)}%` : "4%" }}
              />
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
