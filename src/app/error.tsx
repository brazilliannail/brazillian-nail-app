"use client";

import { useEffect } from "react";

/**
 * Cobre erros de página/segmentos abaixo do layout raiz (que já rendeu com sucesso quando este
 * boundary é usado). Para erros no próprio layout raiz — ex.: falha ao ler o banco em
 * `RootLayout` —, ver `global-error.tsx`, que o App Router usa nesse caso em vez deste arquivo.
 */
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
        <p className="max-w-sm text-sm text-foreground/60">
          Não foi possível carregar esta página. Você pode tentar novamente — se o problema
          continuar, avise a equipe técnica.
        </p>
        {error.digest && (
          <p className="font-mono text-[11px] text-foreground/40">Referência: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98]"
      >
        Tentar novamente
      </button>
    </div>
  );
}
