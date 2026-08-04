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
    sessionDataTtl: 300,
    sameSite: "strict",
  },
  logLevel: "warn",
});
