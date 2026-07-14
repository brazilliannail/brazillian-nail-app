type ToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-foreground/55">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "justify-end bg-brand" : "justify-start bg-muted"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
    </div>
  );
}
