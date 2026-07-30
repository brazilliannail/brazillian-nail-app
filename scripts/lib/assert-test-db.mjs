import path from "node:path";

const ALLOWED_DIR = "prisma/test-db";
const MAIN_DB_RELATIVE = "prisma/brazillian-nail.db";

/**
 * Garante que DATABASE_URL só pode apontar para um arquivo dentro de
 * prisma/test-db/. Lança erro (sem tocar em nada) em qualquer outro caso,
 * inclusive se apontar para o banco principal.
 */
export function assertTestDatabaseUrl(rawUrl, projectRoot) {
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL não definida. Verifique se .env.testing foi carregado."
    );
  }

  if (!rawUrl.startsWith("file:")) {
    throw new Error(
      `DATABASE_URL inválida para SQLite: "${rawUrl}" (esperado prefixo "file:").`
    );
  }

  const rawPath = rawUrl.slice("file:".length);
  const resolved = path.resolve(projectRoot, rawPath);

  const mainDbPath = path.resolve(projectRoot, MAIN_DB_RELATIVE);
  if (resolved === mainDbPath) {
    throw new Error(
      `BLOQUEADO: DATABASE_URL aponta para o banco principal (${mainDbPath}). ` +
        "Testes nunca podem usar esse arquivo."
    );
  }

  const allowedDir = path.resolve(projectRoot, ALLOWED_DIR);
  const relativeToAllowed = path.relative(allowedDir, resolved);
  const isInsideAllowedDir =
    relativeToAllowed !== "" &&
    !relativeToAllowed.startsWith("..") &&
    !path.isAbsolute(relativeToAllowed);

  if (!isInsideAllowedDir) {
    throw new Error(
      `BLOQUEADO: DATABASE_URL (${resolved}) está fora de ${allowedDir}. ` +
        `Bancos de teste só podem viver dentro de ${ALLOWED_DIR}/.`
    );
  }

  return resolved;
}
