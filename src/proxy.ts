import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

// Diagnóstico temporário (sem alterar comportamento nenhum): quando o middleware redireciona
// (sessão não reconhecida), registra nos logs da Vercel só os NOMES dos cookies presentes e o
// tamanho do cabeçalho — nunca os valores — para investigar por que /despesas está caindo no
// login mesmo com sessão válida. Remover depois de identificar a causa.
export default async function middleware(request: NextRequest) {
  const response = await authMiddleware(request);

  if (response && response.status >= 300 && response.status < 400) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookieNames = cookieHeader
      .split(";")
      .map((c) => c.split("=")[0]?.trim())
      .filter(Boolean);
    console.error(
      "[diag-sessao]",
      JSON.stringify({
        method: request.method,
        path: new URL(request.url).pathname,
        cookieHeaderBytes: cookieHeader.length,
        cookieNames,
        location: response.headers.get("location"),
        nextAction: request.headers.get("next-action") ?? null,
        routerStateTreeBytes: request.headers.get("next-router-state-tree")?.length ?? 0,
        origin: request.headers.get("origin"),
        host: request.headers.get("host"),
      }),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
