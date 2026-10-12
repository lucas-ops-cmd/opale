// Saisie rapide : « TP cyber à rendre mercredi 23h59 » → titre, matière, type, date, heure.
import { addDays, weekday, toISO, parts, daysBetween } from './dates.js';

export function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[,;!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WEEKDAYS = {
  lundi: 0, lun: 0, mardi: 1, mar: 1, mercredi: 2, mer: 2, jeudi: 3, jeu: 3,
  vendredi: 4, ven: 4, samedi: 5, sam: 5, dimanche: 6, dim: 6,
};
const MONTHS = {
  janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10,
  novembre: 11, nov: 11, decembre: 12, dec: 12,
};
const NUMBERS = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, quinze: 15 };
const CONNECTORS = new Set(['pour', 'le', 'avant', 'a', 'au', 'vers', 'd', 'ici', 'du', 'de', 'en', 'pr', 'jusqu', 'jusque']);

const KIND_RULES = [
  ['partiel_ct', ['ct', 'controle terminal', 'terminal', 'examen', 'exam', 'final', 'partiel ct']],
  ['partiel_cc', ['cc', 'controle continu', 'partiel', 'controle', 'interro', 'qcm', 'ds', 'evaluation']],
  ['tp', ['tp', 'tps']],
  ['exercice', ['exo', 'exos', 'exercice', 'exercices', 'td', 'tds', 'lecture', 'reviser', 'revisions']],
  ['tp', ['a rendre', 'rendre', 'rendu', 'projet', 'dm', 'devoir', 'rapport', 'dossier']],
];

function hasPhrase(text, phrase) {
  return new RegExp(`(^| )${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`).test(text);
}

function nextWeekday(today, wd, strictlyAfter = true) {
  let diff = (wd - weekday(today) + 7) % 7;
  if (diff === 0 && strictlyAfter) diff = 7;
  return addDays(today, diff);
}

function resolveDayMonth(today, d, m, y) {
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return null;
  if (y) {
    if (y < 100) y += 2000;
    return toISO(y, m, d);
  }
  const ty = parts(today).y;
  let iso = toISO(ty, m, d);
  if (daysBetween(today, iso) < -31) iso = toISO(ty + 1, m, d); // date passée depuis longtemps → année suivante
  return iso;
}

export function parseQuick(input, today, subjects) {
  const raw = input.trim();
  const origTokens = raw.split(/\s+/).filter(Boolean);
  const toks = origTokens.map((t) => norm(t).replace(/\s+/g, ' '));
  const used = new Array(toks.length).fill(false);
  let date = null, time = null;

  const consumeConnectorsBefore = (i) => {
    let j = i - 1;
    while (j >= 0 && !used[j] && CONNECTORS.has(toks[j].split(' ').pop())) { used[j] = true; j--; }
  };

  // Heure
  for (let i = 0; i < toks.length && !time; i++) {
    const t = toks[i];
    let m;
    if ((m = t.match(/^(\d{1,2})h(\d{2})?$/)) || (m = t.match(/^(\d{1,2})[:](\d{2})$/))) {
      const h = Number(m[1]), mi = Number(m[2] || 0);
      if (h <= 23 && mi <= 59) { time = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; used[i] = true; consumeConnectorsBefore(i); }
    } else if (t === 'midi') { time = '12:00'; used[i] = true; consumeConnectorsBefore(i); }
    else if (t === 'minuit') { time = '23:59'; used[i] = true; consumeConnectorsBefore(i); }
  }

  // Date
  for (let i = 0; i < toks.length && !date; i++) {
    if (used[i]) continue;
    const t = toks[i];
    const nxt = toks[i + 1];
    let m;
    if (t === 'aujourd hui' || t === 'aujourdhui' || t === 'auj') { date = today; used[i] = true; }
    else if (t === 'ce' && nxt === 'soir') { date = today; used[i] = used[i + 1] = true; }
    else if (t === 'demain') { date = addDays(today, 1); used[i] = true; }
    else if (t === 'apres-demain' || (t === 'apres' && nxt === 'demain')) {
      date = addDays(today, 2); used[i] = true; if (t === 'apres') used[i + 1] = true;
    }
    else if (t === 'dans' && nxt && (/^\d+$/.test(nxt) || NUMBERS[nxt]) && toks[i + 2]) {
      const n = /^\d+$/.test(nxt) ? Number(nxt) : NUMBERS[nxt];
      const unit = toks[i + 2];
      if (/^jours?$/.test(unit)) date = addDays(today, n);
      else if (/^semaines?$/.test(unit)) date = addDays(today, 7 * n);
      if (date) { used[i] = used[i + 1] = used[i + 2] = true; }
    }
    else if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/))) {
      date = resolveDayMonth(today, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null);
      if (date) used[i] = true;
    }
    else if (/^\d{1,2}$/.test(t) && nxt && MONTHS[nxt.replace(/\.$/, '')]) {
      date = resolveDayMonth(today, Number(t), MONTHS[nxt.replace(/\.$/, '')], null);
      if (date) { used[i] = used[i + 1] = true; }
    }
    else if (WEEKDAYS[t.replace(/\.$/, '')] !== undefined) {
      const wd = WEEKDAYS[t.replace(/\.$/, '')];
      used[i] = true;
      // « mercredi 14 » ou « mercredi 14 oct »
      if (nxt && /^\d{1,2}$/.test(nxt)) {
        const d = Number(nxt);
        const mon = toks[i + 2] && MONTHS[toks[i + 2].replace(/\.$/, '')];
        used[i + 1] = true;
        if (mon) used[i + 2] = true;
        if (mon) date = resolveDayMonth(today, d, mon, null);
        else {
          // prochain jour portant ce numéro
          let cand = today;
          for (let k = 0; k < 62; k++) { cand = addDays(today, k); if (parts(cand).d === d) break; }
          date = cand;
        }
      } else {
        date = nextWeekday(today, wd, true);
        if (nxt === 'prochain' || nxt === 'prochaine') used[i + 1] = true;
        if (nxt === 'en' && toks[i + 2] === '8') { date = addDays(date, 7); used[i + 1] = used[i + 2] = true; }
      }
    }
    else if (t === 'le' && nxt && /^\d{1,2}$/.test(nxt) && !(toks[i + 2] && MONTHS[toks[i + 2]])) {
      const d = Number(nxt);
      let cand = today;
      for (let k = 0; k < 62; k++) { cand = addDays(today, k); if (parts(cand).d === d) break; }
      date = cand; used[i] = used[i + 1] = true;
    }
    if (date) consumeConnectorsBefore(i);
  }

  const text = norm(raw);

  // Type
  let kind = null;
  for (const [k, words] of KIND_RULES) {
    if (words.some((w) => hasPhrase(text, w))) { kind = k; break; }
  }

  // Matière : l'alias le plus long trouvé gagne.
  let subject = null, best = 0;
  for (const s of subjects) {
    for (const a of [s.label, s.short, ...(s.aliases || [])]) {
      if (!a) continue;
      const na = norm(a);
      if (na.length > best && hasPhrase(text, na)) { best = na.length; subject = s.code; }
    }
  }

  // « à rendre » ne fait pas partie du titre
  for (let i = 0; i < toks.length - 1; i++) {
    if ((toks[i] === 'a') && toks[i + 1] === 'rendre') { used[i] = used[i + 1] = true; }
  }

  let titleTokens = origTokens.filter((_, i) => !used[i]);
  while (titleTokens.length && CONNECTORS.has(norm(titleTokens[titleTokens.length - 1]))) titleTokens.pop();
  while (titleTokens.length && CONNECTORS.has(norm(titleTokens[0]))) titleTokens.shift();
  let title = titleTokens.join(' ').replace(/[,;:\-–]+$/, '').trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, subject, kind, due_date: date, due_time: time };
}
