"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { CheckIcon, ClockIcon, GiftIcon } from "@/components/icons";
import type { StatusPagamento } from "@/lib/financeiro-mock";

const STATUS_STYLES: Record<StatusPagamento, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  recebido: {
    badge: "bg-status-finalizado/10 text-status-finalizado ring-status-finalizado/30",
    icon: CheckIcon,
  },
  parcial: {
    badge: "bg-status-confirmado/10 text-status-confirmado ring-status-confirmado/30",
    icon: CheckIcon,
  },
  pendente: {
    badge: "bg-status-aguardando/10 text-status-aguardando ring-status-aguardando/30",
    icon: ClockIcon,
  },
  cortesia: {
    badge: "bg-brand/10 text-brand ring-brand/30",
    icon: GiftIcon,
  },
};

type FinanceiroStatusBadgeProps = {
  status: StatusPagamento;
  size?: "sm" | "md";
};

export function FinanceiroStatusBadge({ status, size = "md" }: FinanceiroStatusBadgeProps) {
  const { t } = useLanguage();
  const { badge, icon: Icon } = STATUS_STYLES[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-3 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClasses} ${badge}`}>
      <Icon className={iconSize} />
      {t.financeiro.status[status]}
    </span>
  );
}
