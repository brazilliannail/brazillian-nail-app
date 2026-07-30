"use client";

import { useLanguage } from "@/components/LanguageProvider";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export type ItemDetalhamento = { label: string; valor: number };

type DetalhamentoBarsProps = {
  dados: ItemDetalhamento[];
};

/** Componente só de apresentação: recebe rótulos já resolvidos (nome, tradução etc.) pelo
 * chamador — nenhum cálculo financeiro nem lookup de i18n acontece aqui. */
export function DetalhamentoBars({ dados }: DetalhamentoBarsProps) {
  const { t } = useLanguage();

  if (dados.length === 0) {
    return <p className="text-sm text-foreground/60">{t.financeiro.vazio}</p>;
  }

  const maximo = Math.max(...dados.map((item) => item.valor), 1);

  return (
    <div className="flex flex-col gap-3">
      {dados.map((item) => (
        <div key={item.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/70">{item.label}</span>
            <span className="font-medium text-foreground">{formatCurrency(item.valor)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max((item.valor / maximo) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
