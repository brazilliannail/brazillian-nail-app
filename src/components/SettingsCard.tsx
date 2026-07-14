type SettingsCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsCard({ icon: Icon, title, description, children }: SettingsCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-foreground/60">{description}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
