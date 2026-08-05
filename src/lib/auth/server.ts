import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.DATABASE_NEON_AUTH_BASE_URL ?? process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl) {
  throw new Error("DATABASE_NEON_AUTH_BASE_URL nao foi configurada.");
}

if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error("NEON_AUTH_COOKIE_SECRET deve ter pelo menos 32 caracteres.");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    // 1h (era 300s/5min): com 5 minutos, qualquer ação (Server Action) feita depois desse
    // tempo desde o login era rejeitada pelo middleware como sessão ausente, mesmo com o login
    // exclusivo da Rosangela ainda válido — cada revalidação após o cache expirar dependia de
    // uma chamada de sessão upstream que não estava se completando com sucesso a tempo. Uma
    // sessão única de trabalho raramente passa 1h sem interação, então isto reduz bastante a
    // frequência desse problema sem abrir mão de uma revalidação periódica.
    sessionDataTtl: 3600,
    sameSite: "strict",
  },
  logLevel: "warn",
});
