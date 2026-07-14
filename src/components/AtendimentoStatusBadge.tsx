"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { PlayIcon, DoubleCheckIcon, CheckIcon, ClockIcon, GiftIcon, CloseIcon, HistoryIcon } from "@/components/icons";
import type { AtendimentoStatus } from "@/lib/atendimentos-mock";

const STATUS_STYLES: Record<AtendimentoStatus, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  emAndamento: {
    badge: "bg-status-em-atendimento/10 text-status-em-atendimento ring-status-em-atendimento/30",
    icon: PlayIcon,
  },
  finalizadoPago: {
    badge: "bg-status-finalizado/10 text-status-finalizado ring-status-finalizado/30",
    icon: DoubleCheckIcon,
  },
  finalizadoParcial: {
    badge: "bg-status-confirmado/10 text-status-confirmado ring-status-confirmado/30",
    icon: CheckIcon,
  },
  finalizadoPendente: {
    badge: "bg-status-aguardando/10 text-status-aguardando ring-status-aguardando/30",
    icon: ClockIcon,
  },
  finalizadoCortesia: {
    badge: "bg-brand/10 text-brand ring-brand/30",
    icon: GiftIcon,
  },
  cancelado: {
    badge: "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/40",
    icon: CloseIcon,
  },
  estornado: {
    badge: "bg-muted text-foreground/60 ring-border",
    icon: HistoryIcon,
  },
};

type AtendimentoStatusBadgeProps = {
  status: AtendimentoStatus;
  size?: "sm" | "md";
};

export function AtendimentoStatusBadge({ status, size = "md" }: AtendimentoStatusBadgeProps) {
  const { t } = useLanguage();
  const { badge, icon: Icon } = STATUS_STYLES[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-3 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClasses} ${badge}`}>
      <Icon className={iconSize} />
      {t.atendimentos.status[status]}
    </span>
  );
}
