"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { ClockIcon, CheckIcon, DoubleCheckIcon, CloseIcon, PhoneIcon } from "@/components/icons";
import type { LembreteStatus } from "@/lib/lembretes-mock";

const STATUS_STYLES: Record<LembreteStatus, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  pendente: {
    badge: "bg-status-aguardando/10 text-status-aguardando ring-status-aguardando/30",
    icon: ClockIcon,
  },
  preparado: {
    badge: "bg-brand/10 text-brand ring-brand/30",
    icon: CheckIcon,
  },
  enviado: {
    badge: "bg-status-finalizado/10 text-status-finalizado ring-status-finalizado/30",
    icon: DoubleCheckIcon,
  },
  tratadoPessoalmente: {
    badge: "bg-status-confirmado/10 text-status-confirmado ring-status-confirmado/30",
    icon: CheckIcon,
  },
  ignorado: {
    badge: "bg-foreground/10 text-foreground/50 ring-foreground/20",
    icon: CloseIcon,
  },
  indisponivel: {
    badge: "bg-foreground/10 text-foreground/40 ring-foreground/10",
    icon: PhoneIcon,
  },
};

type LembreteStatusBadgeProps = {
  status: LembreteStatus;
  size?: "sm" | "md";
};

export function LembreteStatusBadge({ status, size = "md" }: LembreteStatusBadgeProps) {
  const { t } = useLanguage();
  const { badge, icon: Icon } = STATUS_STYLES[status];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-3 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClasses} ${badge}`}>
      <Icon className={iconSize} />
      {t.lembretes.statusLembreteLabel[status]}
    </span>
  );
}
