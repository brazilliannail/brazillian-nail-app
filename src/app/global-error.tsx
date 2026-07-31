"use client";

import "./globals.css";

/**
 * Cobre erros no próprio layout raiz (ex.: falha ao ler o banco em `RootLayout`, que busca
 * clientes/serviços/agenda/atendimentos/caixa antes de renderizar). Substitui o layout inteiro
 * quando ativo, por isso precisa das próprias tags `<html>`/`<body>` e do próprio import de
 * `globals.css` — nenhum provider ou estilo do layout raiz está disponível aqui.
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt">
      <body
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center antialiased"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-semibold">Não foi possível carregar o aplicativo</h2>
          <p className="max-w-sm text-sm opacity-60">
            Algo impediu o carregamento inicial — pode ser uma falha temporária. Tente novamente
            em instantes; se persistir, avise a equipe técnica.
          </p>
        </div>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
          style={{ background: "var(--brand)" }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
