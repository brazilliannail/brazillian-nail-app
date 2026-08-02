import { addDays, formatDateMMDDYYYY } from "@/lib/date";

// Âncora bem no futuro, longe de qualquer data fixa usada por outras suítes (ex.:
// pagamentos-ledger.test.ts usa "01/15/2026") e do "amanhã" dinâmico usado por lembretes.test.ts.
const ANCORA = new Date(2027, 5, 1);

let diasContador = 0;

/** Data única (MM/DD/YYYY) por chamada, para que testes de conflito de horário não colidam entre
 * si nem com datas usadas por outras suítes que compartilham o mesmo banco de teste. */
export function proximaDataAgendaTeste(): string {
  const data = addDays(ANCORA, diasContador);
  diasContador += 1;
  return formatDateMMDDYYYY(data);
}
