type Comparacao = {
  periodoAtual: string;
  periodoComparado: string;
  valorComparado: string;
  percentualTexto: string;
  direcao: "up" | "down" | "neutral";
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "neutral" | "warning";
  comparacao?: Comparacao;
};

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand/10 text-brand",
  neutral: "bg-muted text-foreground/70",
  warning: "bg-status-aguardando/10 text-status-aguardando",
};

const COMPARACAO_CLASSES: Record<Comparacao["direcao"], string> = {
  up: "text-status-finalizado",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-foreground/50",
};

const COMPARACAO_SETA: Record<Comparacao["direcao"], string> = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

export function StatCard({ label, value, icon: Icon, tone = "neutral", comparacao }: StatCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:p-5 ${
        tone === "warning" ? "border-status-aguardando/30 bg-status-aguardando/5" : "border-border bg-surface"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground/60">{label}</p>

        {comparacao && (
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/40">{comparacao.periodoAtual}</p>
        )}
        <p
          className={`break-words text-lg font-semibold tracking-tight sm:text-xl ${comparacao ? "" : "mt-0.5"} ${
            tone === "warning" ? "text-status-aguardando" : "text-foreground"
          }`}
        >
          {value}
        </p>

        {comparacao && (
          <div className="mt-2 border-t border-border pt-2">
            <p className="break-words text-[11px] font-medium uppercase tracking-wide text-foreground/40">
              {comparacao.periodoComparado}
            </p>
            <p className="break-words text-sm font-medium text-foreground/70">{comparacao.valorComparado}</p>
            <p className={`mt-1 break-words text-xs font-semibold ${COMPARACAO_CLASSES[comparacao.direcao]}`}>
              {COMPARACAO_SETA[comparacao.direcao]} {comparacao.percentualTexto}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
