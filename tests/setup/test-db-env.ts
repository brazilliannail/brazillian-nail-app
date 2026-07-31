import { TEST_DATABASE_URL } from "./global-setup";

// Precisa rodar (via `setupFiles`) antes de qualquer teste importar "@/lib/db" — o adapter do
// Prisma lê DATABASE_URL no momento em que o módulo é carregado, não a cada chamada.
process.env.DATABASE_URL = TEST_DATABASE_URL;
