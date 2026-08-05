import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

/**
 * Contorna um bug do pacote `@neondatabase/auth` (0.4.2-beta, o mais recente disponível):
 * `handleAuthRequest` (src/server/proxy/request.ts do pacote) encaminha o MÉTODO e o CORPO da
 * requisição original para o endpoint upstream de verificação de sessão — que só aceita GET.
 * Isso faz qualquer Server Action (sempre um POST) ser tratada como "sessão ausente" e
 * redirecionada para o login, mesmo com um cookie de sessão válido (a navegação por GET não é
 * afetada, porque nesse caso a biblioteca usa um atalho local que não depende dessa chamada).
 *
 * Contorno: para métodos diferentes de GET/HEAD, a sessão é verificada com uma requisição-sonda
 * GET equivalente (mesma URL e cookies, sem corpo) — a requisição real só é bloqueada se essa
 * sonda também indicar sessão ausente. Qualquer cookie de sessão renovado pela sonda é repassado
 * para a resposta real. Remover este contorno quando o pacote publicar uma correção.
 */
export default async function middleware(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return authMiddleware(request);
  }

  const probeRequest = new NextRequest(request.url, {
    method: "GET",
    headers: request.headers,
  });
  const probeResponse = await authMiddleware(probeRequest);

  if (probeResponse && probeResponse.status >= 300 && probeResponse.status < 400) {
    return probeResponse;
  }

  const response = NextResponse.next();
  for (const cookie of probeResponse?.headers.getSetCookie() ?? []) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
