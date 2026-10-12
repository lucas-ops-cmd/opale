// Dates « locales » manipulées comme des chaînes AAAA-MM-JJ, sans décalage de fuseau.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function utc(iso) {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromIso, toIso) {
  return Math.round((utc(toIso) - utc(fromIso)) / 86400000);
}

export function addDays(iso, n) {
  const { y, m, d } = parts(iso);
  return toISO(y, m, d + n);
}

// 0 = lundi … 6 = dimanche
export function weekday(iso) {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso) {
  return addDays(iso, -weekday(iso));
}

export function isoWeek(iso) {
  const thursday = addDays(iso, 3 - weekday(iso));
  const { y } = parts(thursday);
  const jan4 = toISO(y, 1, 4);
  return 1 + Math.round(daysBetween(startOfWeek(jan4), startOfWeek(thursday)) / 7);
}

const F = (o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...o });
const fWeekdayShort = F({ weekday: 'short' });
const fWeekdayLong = F({ weekday: 'long' });
const fMonthShort = F({ month: 'short' });
const fMonthLong = F({ month: 'long' });

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// « lun. 12 oct. »
export function fmtShort(iso) {
  const dt = new Date(utc(iso));
  return `${fWeekdayShort.format(dt)} ${parts(iso).d} ${fMonthShort.format(dt)}`;
}

// « Lundi 12 octobre »
export function fmtLong(iso) {
  const dt = new Date(utc(iso));
  return `${cap(fWeekdayLong.format(dt))} ${parts(iso).d} ${fMonthLong.format(dt)}`;
}

// « Mercredi 14 oct. »
export function fmtDayHeader(iso) {
  const dt = new Date(utc(iso));
  return `${cap(fWeekdayLong.format(dt))} ${parts(iso).d} ${fMonthShort.format(dt)}`;
}

export function fmtMonthYear(iso) {
  const dt = new Date(utc(iso));
  return `${cap(fMonthLong.format(dt))} ${parts(iso).y}`;
}

export function fmtTime(t) {
  if (!t) return '';
  return t.slice(0, 5);
}

// Libellé relatif : « Aujourd'hui », « Demain », « J-3 », « En retard »
export function relLabel(days) {
  if (days < 0) return 'En retard';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `J-${days}`;
}

// Fin de semestre par défaut pour les tâches récurrentes.
export function semesterEnd(iso) {
  const { y, m } = parts(iso);
  if (m >= 8) return toISO(y + 1, 1, 31);
  if (m === 1) return toISO(y, 1, 31);
  return toISO(y, 6, 30);
}

export function monthGrid(iso) {
  // Renvoie les 6 semaines (42 jours) couvrant le mois de iso, en commençant un lundi.
  const { y, m } = parts(iso);
  const first = toISO(y, m, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
