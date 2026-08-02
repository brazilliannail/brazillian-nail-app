import Link from "next/link";

/**
 * Cobre URLs sem rota correspondente em todo o app (convenção `not-found.js` do App Router) e
 * qualquer chamada a `notFound()` dentro de um segmento sem o próprio `not-found.tsx`. Renderiza
 * dentro do layout raiz (mesmo nível de `error.tsx`/`loading.tsx`), por isso não tem `<html>`/`<body>`
 * próprios — só `global-error.tsx` precisa disso.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Página não encontrada</h2>
        <p className="max-w-sm text-sm text-foreground/60">
          O endereço acessado não existe ou foi movido. Volte para a página inicial para continuar.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
