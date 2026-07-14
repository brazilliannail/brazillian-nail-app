"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { ClockIcon, CheckIcon, PlayIcon, DoubleCheckIcon } from "@/components/icons";
import type { StatusKey } from "@/lib/mock-data";

const STATUS_STYLES: Record<StatusKey, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  aguardando: {
    badge: "bg-status-aguardando/10 text-status-aguardando ring-status-aguardando/30",
    icon: ClockIcon,
  },
  confirmado: {
    badge: "bg-status-confirmado/10 text-status-confirmado ring-status-confirmado/30",
    icon: CheckIcon,
  },
  emAtendimento: {
    badge: "bg-status-em-atendimento/10 text-status-em-atendimento ring-status-em-atendimento/30",
    icon: PlayIcon,
  },
  finalizado: {
    badge: "bg-status-finalizado/10 text-status-finalizado ring-status-finalizado/30",
    icon: DoubleCheckIcon,
  },
};

type StatusBadgeProps = {
  status: StatusKey;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { t } = useLanguage();
  const { badge, icon: Icon } = STATUS_STYLES[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-3 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClasses} ${badge}`}>
      <Icon className={iconSize} />
      {t.status[status]}
    </span>
  );
}
