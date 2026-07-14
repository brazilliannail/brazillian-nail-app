type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "neutral" | "warning";
};

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand/10 text-brand",
  neutral: "bg-muted text-foreground/70",
  warning: "bg-status-aguardando/10 text-status-aguardando",
};

export function StatCard({ label, value, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:p-5 ${
        tone === "warning" ? "border-status-aguardando/30 bg-status-aguardando/5" : "border-border bg-surface"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-foreground/60">{label}</p>
        <p
          className={`mt-0.5 truncate text-xl font-semibold tracking-tight ${
            tone === "warning" ? "text-status-aguardando" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
