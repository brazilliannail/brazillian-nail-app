export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand"
      />
      <p className="text-sm text-foreground/60">Carregando...</p>
    </div>
  );
}
