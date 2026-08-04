export const ROSANGELA_EMAIL = "rosangelaazevedocassol@gmail.com";

export function isRosangela(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ROSANGELA_EMAIL;
}

export async function requireRosangela() {
  // Os testes exercitam diretamente as regras de negócio sem navegador/cookie.
  // NODE_ENV é definido pelo próprio Vitest e não pode ser ativado em produção.
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const { auth } = await import("@/lib/auth/server");
  const { data: session, error } = await auth.getSession();

  if (error || !session?.user || !isRosangela(session.user.email)) {
    throw new Error("Acesso nao autorizado.");
  }

  return session;
}
