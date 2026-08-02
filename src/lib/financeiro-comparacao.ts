import { addDays } from "@/lib/date";

export type Periodo = "hoje" | "semana" | "mes" | "ano" | "personalizado";

export type ComparacaoOpcao =
  | "ontem"
  | "mesmoDiaSemanaPassada"
  | "mesmoDiaAnoPassado"
  | "semanaPassada"
  | "mesmaSemanaAnoPassado"
  | "mesPassado"
  | "mesmoMesAnoPassado"
  | "anoPassado"
  | "mesmoPeriodoAnoPassado"
  | "periodoAnteriorEquivalente"
  | "escolherOutroPeriodo"
  | "semComparacao";

export const OPCOES_COMPARACAO_POR_PERIODO: Record<Periodo, ComparacaoOpcao[]> = {
  hoje: ["ontem", "mesmoDiaSemanaPassada", "mesmoDiaAnoPassado", "semComparacao"],
  semana: ["semanaPassada", "mesmaSemanaAnoPassado", "semComparacao"],
  mes: ["mesPassado", "mesmoMesAnoPassado", "semComparacao"],
  ano: ["anoPassado", "semComparacao"],
  personalizado: ["mesmoPeriodoAnoPassado", "periodoAnteriorEquivalente", "escolherOutroPeriodo", "semComparacao"],
};

export const COMPARACAO_PADRAO_POR_PERIODO: Record<Periodo, ComparacaoOpcao> = {
  hoje: "ontem",
  semana: "semanaPassada",
  mes: "mesPassado",
  ano: "anoPassado",
  personalizado: "semComparacao",
};

export type DateRange = { start: Date; end: Date };

export function toISODate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromISODate(iso: string) {
  const [yyyy, mm, dd] = iso.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function addYears(date: Date, amount: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  return next;
}

function diffInDays(a: Date, b: Date) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Retorna o período principal. Para períodos "rolantes" (hoje/semana/mes/ano), o fim nunca
 * ultrapassa hoje — ou seja, o período reflete apenas os dias já decorridos. */
export function getMainRange(periodo: Periodo, today: Date, customStart?: Date, customEnd?: Date): DateRange {
  const hoje = startOfDay(today);

  switch (periodo) {
    case "hoje":
      return { start: hoje, end: hoje };
    case "semana":
      return { start: startOfWeek(hoje), end: hoje };
    case "mes":
      return { start: startOfMonth(hoje), end: hoje };
    case "ano":
      return { start: startOfYear(hoje), end: hoje };
    case "personalizado": {
      const rawStart = customStart ? startOfDay(customStart) : hoje;
      const rawEnd = customEnd ? startOfDay(customEnd) : hoje;
      const end = rawEnd > hoje ? hoje : rawEnd;
      const start = rawStart > end ? end : rawStart;
      return { start, end };
    }
    default:
      return { start: hoje, end: hoje };
  }
}

/** Retorna o período de comparação, respeitando a mesma quantidade de dias já decorridos no
 * período principal — nunca compara um período parcial com um período anterior completo. */
export function getCompareRange(
  periodo: Periodo,
  comparacao: ComparacaoOpcao,
  mainRange: DateRange,
  compareCustom?: DateRange,
): DateRange | null {
  const elapsedDays = diffInDays(mainRange.start, mainRange.end) + 1;

  switch (comparacao) {
    case "semComparacao":
      return null;

    case "ontem":
      return { start: addDays(mainRange.start, -1), end: addDays(mainRange.end, -1) };

    case "semanaPassada":
      return { start: addDays(mainRange.start, -7), end: addDays(mainRange.end, -7) };

    case "mesmoDiaSemanaPassada":
      return { start: addDays(mainRange.start, -7), end: addDays(mainRange.end, -7) };

    case "mesmoDiaAnoPassado":
    case "mesmoPeriodoAnoPassado":
      return { start: addYears(mainRange.start, -1), end: addYears(mainRange.end, -1) };

    case "mesmaSemanaAnoPassado":
      return { start: addDays(mainRange.start, -364), end: addDays(mainRange.end, -364) };

    case "mesPassado": {
      const prevMonthStart = new Date(mainRange.start.getFullYear(), mainRange.start.getMonth() - 1, 1);
      const sliceLength = Math.min(elapsedDays, daysInMonth(prevMonthStart.getFullYear(), prevMonthStart.getMonth()));
      return { start: prevMonthStart, end: addDays(prevMonthStart, sliceLength - 1) };
    }

    case "mesmoMesAnoPassado": {
      const prevYearMonthStart = new Date(mainRange.start.getFullYear() - 1, mainRange.start.getMonth(), 1);
      const sliceLength = Math.min(
        elapsedDays,
        daysInMonth(prevYearMonthStart.getFullYear(), prevYearMonthStart.getMonth()),
      );
      return { start: prevYearMonthStart, end: addDays(prevYearMonthStart, sliceLength - 1) };
    }

    case "anoPassado": {
      const prevYearStart = new Date(mainRange.start.getFullYear() - 1, 0, 1);
      const daysInPrevYear = isLeapYear(prevYearStart.getFullYear()) ? 366 : 365;
      const sliceLength = Math.min(elapsedDays, daysInPrevYear);
      return { start: prevYearStart, end: addDays(prevYearStart, sliceLength - 1) };
    }

    case "periodoAnteriorEquivalente": {
      const end = addDays(mainRange.start, -1);
      const start = addDays(end, -(elapsedDays - 1));
      return { start, end };
    }

    case "escolherOutroPeriodo":
      return compareCustom ?? null;

    default:
      return null;
  }
}

export type Direcao = "up" | "down" | "neutral";

export function calcularVariacao(atual: number, anterior: number): { percentual: number | null; direcao: Direcao } {
  if (anterior === 0) {
    if (atual === 0) return { percentual: 0, direcao: "neutral" };
    return { percentual: null, direcao: "up" };
  }
  const variacao = ((atual - anterior) / Math.abs(anterior)) * 100;
  if (Math.abs(variacao) < 0.05) return { percentual: variacao, direcao: "neutral" };
  return { percentual: variacao, direcao: variacao > 0 ? "up" : "down" };
}
