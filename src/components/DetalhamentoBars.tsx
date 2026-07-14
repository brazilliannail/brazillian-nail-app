"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { ItemDetalhamento } from "@/lib/financeiro-mock";

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

type DetalhamentoBarsProps = {
  dados: ItemDetalhamento[];
};

export function DetalhamentoBars({ dados }: DetalhamentoBarsProps) {
  const { locale } = useLanguage();
  const maximo = Math.max(...dados.map((item) => item.valor), 1);

  return (
    <div className="flex flex-col gap-3">
      {dados.map((item) => {
        const label = locale === "pt" ? item.labelPt : item.labelEn;
        return (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/70">{label}</span>
              <span className="font-medium text-foreground">{formatCurrency(item.valor)}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max((item.valor / maximo) * 100, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
