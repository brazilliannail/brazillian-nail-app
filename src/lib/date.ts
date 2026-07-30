export function formatDateMMDDYYYY(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Converte uma data para o formato aceito por <input type="date"> (yyyy-mm-dd). */
export function formatDateISO(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Interpreta uma data no formato yyyy-mm-dd (de <input type="date">). */
export function parseDateISO(value: string) {
  const [yyyy, mm, dd] = value.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/** Interpreta uma data no formato MM/DD/YYYY usado no restante do app. */
export function parseDateMMDDYYYY(value: string) {
  const [mm, dd, yyyy] = value.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/** Converte uma data ISO (yyyy-mm-dd, formato armazenado no banco) para MM/DD/YYYY (formato usado na UI). */
export function isoToMMDDYYYY(iso: string) {
  return formatDateMMDDYYYY(parseDateISO(iso));
}

/** Converte uma data MM/DD/YYYY (formato usado na UI) para ISO (yyyy-mm-dd, formato armazenado no banco). */
export function mmddyyyyToISO(value: string) {
  return formatDateISO(parseDateMMDDYYYY(value));
}

/** Formata minutos desde a meia-noite como "9:00 AM" / "2:30 PM". */
export function formatMinutesAsTime(minutes: number) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

/** Interpreta um horário "9:00 AM" / "2:30 PM" de volta para minutos desde a meia-noite. */
export function parseTimeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return 0;
  const [, hh, mm, period] = match;
  let hours = parseInt(hh, 10) % 12;
  if (period.toUpperCase() === "PM") hours += 12;
  return hours * 60 + parseInt(mm, 10);
}

/** Combina uma data (dia/mês/ano) com um horário em minutos desde a meia-noite. */
export function combineDateAndMinutes(date: Date, minutes: number) {
  const result = new Date(date);
  result.setHours(0, minutes, 0, 0);
  return result;
}

/** Verdadeiro se o momento informado já passou em relação a agora. */
export function isMomentoPassado(momento: Date) {
  return momento.getTime() < Date.now();
}

/**
 * Verdadeiro se o horário (em minutos desde a meia-noite) de um agendamento no
 * dia `referencia` já passou. Só se aplica quando `referencia` é o dia de hoje —
 * dias diferentes de hoje não têm "horário passado" em relação ao agora.
 */
export function isHorarioAgendamentoPassado(referencia: Date, inicioMin: number) {
  if (!isSameDay(referencia, new Date())) return false;
  return isMomentoPassado(combineDateAndMinutes(referencia, inicioMin));
}
