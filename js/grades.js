// Calcul des moyennes selon la MCC.
// Principe : chaque épreuve d'un bloc a un coefficient c = ECTS de l'UE × poids matière × poids épreuve.
// Moyenne du bloc = Σ c·note / Σ c. Les blocs ne se compensent pas : il faut 10 dans chacun.

export const PASS = 10;

// Moyenne pondérée des notes d'une épreuve (un CC peut contenir plusieurs notes).
export function evalScore(notes) {
  if (!notes || notes.length === 0) return null;
  let sw = 0, s = 0;
  for (const n of notes) {
    const w = Number(n.weight) > 0 ? Number(n.weight) : 1;
    sw += w;
    s += w * Number(n.value);
  }
  return sw > 0 ? s / sw : null;
}

function indexGrades(grades) {
  const idx = new Map();
  for (const g of grades || []) {
    const k = g.subject + '|' + g.component;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(g);
  }
  return idx;
}

export function computeSub(sub, idx) {
  const evals = sub.evals.map((e) => {
    const notes = idx.get(sub.code + '|' + e.key) || [];
    return { key: e.key, label: e.label, weight: Number(e.weight), notes, score: evalScore(notes) };
  });
  let known = 0, knownW = 0, remW = 0;
  for (const e of evals) {
    if (e.score == null) remW += e.weight;
    else { known += e.weight * e.score; knownW += e.weight; }
  }
  const totalW = knownW + remW;
  const complete = remW === 0;
  return {
    code: sub.code,
    label: sub.label,
    weight: Number(sub.weight),
    evals,
    hasNotes: knownW > 0,
    complete,
    average: complete && totalW > 0 ? known / totalW : null,
    provisional: knownW > 0 ? known / knownW : null,
    // Note qu'il faut en moyenne sur les épreuves restantes pour avoir 10 dans la matière.
    needed: remW > 0 ? (PASS * totalW - known) / remW : null,
    remaining: evals.filter((e) => e.score == null).map((e) => e.label),
  };
}

export function computeBloc(bloc, idx) {
  let total = 0, K = 0, R = 0, remainingCount = 0, knownCount = 0;
  const ues = bloc.ues.map((ue) => {
    const subs = ue.subs.map((sub) => computeSub(sub, idx));
    let uK = 0, uKw = 0, uR = 0;
    for (const s of subs) {
      for (const e of s.evals) {
        const c = Number(ue.ects) * (s.weight / 100) * (e.weight / 100);
        total += c;
        if (e.score == null) { R += c; uR += c; remainingCount++; }
        else { K += c * e.score; uK += c * e.score; uKw += c; knownCount++; }
      }
    }
    return {
      code: ue.code,
      label: ue.label,
      ects: Number(ue.ects),
      color: ue.color,
      subs,
      provisional: uKw > 0 ? uK / uKw : null,
      average: uR === 0 && uKw > 0 ? uK / uKw : null,
    };
  });
  const ects = bloc.ues.reduce((s, u) => s + Number(u.ects), 0);
  const knownW = total - R;
  const provisional = knownW > 1e-9 ? K / knownW : null;
  const complete = R < 1e-9;
  const average = complete && total > 0 ? K / total : null;
  const needed = !complete ? (PASS * total - K) / R : null;
  let status;
  if (knownCount === 0) status = 'empty';
  else if (complete) status = average >= PASS - 1e-9 ? 'validated' : 'failed';
  else if (needed <= 0) status = 'secured';
  else if (needed <= PASS + 1e-9) status = 'ok';
  else if (needed <= 20 + 1e-9) status = 'warn';
  else status = 'danger';
  return { id: bloc.id, label: bloc.label, ects, ues, provisional, average, needed, complete, remainingCount, knownCount, status };
}

export function computeSemester(sem, grades) {
  const idx = indexGrades(grades);
  const blocs = sem.blocs.map((b) => computeBloc(b, idx));
  const withNotes = blocs.filter((b) => b.provisional != null);
  const above = withNotes.filter((b) => (b.average ?? b.provisional) >= PASS - 1e-9).length;
  const allComplete = blocs.every((b) => b.complete);
  return {
    id: sem.id,
    label: sem.label,
    blocs,
    above,
    total: blocs.length,
    withNotes: withNotes.length,
    validated: allComplete ? blocs.every((b) => b.status === 'validated') : null,
  };
}

export const STATUS_LABEL = {
  empty: 'Pas encore de note',
  validated: 'Validé',
  failed: 'Non validé',
  secured: 'Déjà assuré',
  ok: 'En bonne voie',
  warn: 'À surveiller',
  danger: 'Rattrapage probable',
};

export function fmtNote(x) {
  if (x == null || Number.isNaN(x)) return '—';
  const v = Math.round(x * 100) / 100;
  return v.toFixed(2).replace('.', ',');
}
