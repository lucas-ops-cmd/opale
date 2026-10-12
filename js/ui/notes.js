import { html, useState, useMemo, useEffect } from '../vendor/ui.js';
import { Icon, Modal, Switch, subjectOf } from './common.js';
import { SubjectSelect } from './views.js';
import { computeSemester, fmtNote, STATUS_LABEL as BLOC_STATUS, PASS } from '../grades.js';
import { defaultComponent } from '../model.js';
import { parts } from '../dates.js';

const SIM_KEY = 'opale-simulation';
const loadSim = () => { try { return JSON.parse(localStorage.getItem(SIM_KEY)) || []; } catch (_) { return []; } };
const saveSim = (list) => { try { localStorage.setItem(SIM_KEY, JSON.stringify(list)); } catch (_) { /* ignoré */ } };

// État de la simulation, partagé entre l'écran Notes et la fenêtre de saisie.
export function useSimulation() {
  const [on, setOn] = useState(false);
  const [list, setList] = useState(loadSim);
  useEffect(() => { saveSim(list); }, [list]);
  return {
    on, list, setOn,
    add: (g) => setList((l) => [...l, { ...g, id: 'sim-' + Math.random().toString(36).slice(2), simulated: true }]),
    update: (id, patch) => setList((l) => l.map((g) => (g.id === id ? { ...g, ...patch } : g))),
    remove: (id) => setList((l) => l.filter((g) => g.id !== id)),
    clear: () => setList([]),
  };
}

const statusChip = (s) => ({ ok: 'ok', secured: 'ok', validated: 'ok', warn: 'warn', danger: 'partiel', failed: 'partiel', empty: 'muted' }[s] || 'muted');
const barColor = (s) => ({ ok: 'var(--ok)', secured: 'var(--ok)', validated: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--pText)', failed: 'var(--pText)' }[s] || 'var(--mute)');

export function NotesView({ ctx }) {
  const cur = ctx.curriculum;
  const [semId, setSemId] = useState(() => {
    const m = parts(ctx.today).m;
    return (m >= 2 && m <= 7 && cur.semesters[1]) ? cur.semesters[1].id : cur.semesters[0].id;
  });
  const sem = cur.semesters.find((s) => s.id === semId) || cur.semesters[0];
  const simOn = ctx.sim.on, setSimOn = ctx.sim.setOn, sim = ctx.sim.list;
  const [blocId, setBlocId] = useState(null);

  const allGrades = useMemo(() => (simOn ? [...ctx.grades, ...sim] : ctx.grades), [simOn, ctx.grades, sim]);
  const res = useMemo(() => computeSemester(sem, allGrades), [sem, allGrades]);
  const selBloc = res.blocs.find((b) => b.id === blocId) || res.blocs.find((b) => b.status === 'warn' || b.status === 'danger') || res.blocs[0];

  let banner;
  if (res.validated === true) banner = `${sem.label} validé : tous les blocs sont à 10 ou plus.`;
  else if (res.validated === false) banner = `${sem.label} non validé en 1re session : au moins un bloc est sous 10.`;
  else if (!res.withNotes) banner = `Aucune note pour le moment. Saisis tes notes au fur et à mesure : l’appli calcule ce qu’il te faut.`;
  else banner = `${res.above} bloc${res.above > 1 ? 's' : ''} sur ${res.total} au-dessus de 10 (provisoire). Pour valider le semestre, les ${res.total} blocs doivent atteindre 10.`;

  return html`
    <div class="page-head">
      <div><div class="kicker">${cur.name || 'Mes notes'}</div><h1 class="serif">Mes notes</h1></div>
      <div class="head-actions">
        <div class="seg" role="group" aria-label="Semestre">
          ${cur.semesters.map((s) => html`<button aria-pressed=${s.id === sem.id ? 'true' : 'false'} onClick=${() => { setSemId(s.id); setBlocId(null); }}>${s.label}</button>`)}
        </div>
        <label class="btn" style=${{ gap: '10px' }}>
          <${Switch} checked=${simOn} onChange=${setSimOn} label="Mode simulation" />Simulation
        </label>
        <button class="btn primary" onClick=${() => ctx.actions.openGrade({ semester: sem.id })}><${Icon} name="plus" stroke=${2.2} />Saisir une note</button>
      </div>
    </div>

    <div class=${'banner glass' + (simOn ? ' sim-on' : '')}>
      <strong>${simOn ? 'Simulation · ' : ''}${sem.label}</strong><span class="mute">${banner}</span>
      ${simOn ? html`<span class="mute" style=${{ flex: '1 1 100%', fontSize: '13px' }}>
        Les notes ajoutées maintenant sont des hypothèses (pointillés), enregistrées sur cet appareil seulement.
        ${sim.length ? html` <button class="link-btn" onClick=${() => ctx.sim.clear()}>Effacer les ${sim.length} note${sim.length > 1 ? 's' : ''} simulée${sim.length > 1 ? 's' : ''}</button>` : null}</span>` : null}
    </div>

    <div class="blocs">
      ${res.blocs.map((b) => {
        const v = b.average ?? b.provisional;
        return html`<button class=${'bloc glass' + (selBloc && b.id === selBloc.id ? ' sel' : '')} onClick=${() => { setBlocId(b.id); if (window.matchMedia('(max-width: 860px)').matches) setTimeout(() => document.getElementById('bloc-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} aria-pressed=${selBloc && b.id === selBloc.id ? 'true' : 'false'}>
          <div class="head">
            <div><h2>${b.label}</h2><div class="mute" style=${{ fontSize: '13px', marginTop: '2px' }}>${b.ects} ECTS · ${b.ues.length} UE</div></div>
            <span class=${'chip ' + statusChip(b.status)}>${BLOC_STATUS[b.status]}</span>
          </div>
          <div class="avg"><span class="serif">${fmtNote(v)}</span><span class="mute">/20 ${b.complete ? '' : 'provisoire'}</span></div>
          <div class="bar"><div style=${{ width: `${Math.min(100, ((v ?? 0) / 20) * 100)}%`, background: barColor(b.status) }}></div><div class="mark" aria-hidden="true"></div></div>
          <div class="mute" style=${{ fontSize: '14px' }}>${blocMessage(b)}</div>
        </button>`;
      })}
    </div>

    ${selBloc ? html`<section class="glass panel" aria-labelledby="bloc-detail">
      <div class="panel-head">
        <h2 id="bloc-detail">${selBloc.label} · détail</h2>
        <span class="mute" style=${{ fontSize: '13px' }}>Clique sur « + » pour ajouter une note, sur une note pour la modifier</span>
      </div>
      ${selBloc.ues.map((ue) => html`
        ${ue.subs.length > 1 ? html`<div class="day-head" style=${{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span class="dot" style=${{ background: ue.color }}></span>${ue.label} · ${ue.ects} ECTS · moyenne ${ue.average != null ? fmtNote(ue.average) : ue.provisional != null ? fmtNote(ue.provisional) + ' (prov.)' : '—'}</div>` : null}
        ${ue.subs.map((s) => html`<${SubjectRow} ctx=${ctx} sub=${s} ue=${ue} />`)}`)}
    </section>` : null}`;
}

function blocMessage(b) {
  const n = b.remainingCount;
  switch (b.status) {
    case 'empty': return html`Il te faudra <strong style=${{ color: 'var(--ink)' }}>10/20</strong> de moyenne pour valider ce bloc.`;
    case 'validated': return 'Bloc validé.';
    case 'failed': return 'Bloc sous 10 : non validé en 1re session.';
    case 'secured': return `Bloc assuré quelles que soient tes ${n} épreuve${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}.`;
    case 'danger': return html`Il faudrait <strong style=${{ color: 'var(--ink)' }}>${fmtNote(b.needed)}/20</strong> sur les ${n} épreuve${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''} : hors d’atteinte.`;
    default: return html`Pour valider, il te faut <strong style=${{ color: 'var(--ink)' }}>${fmtNote(b.needed)}/20</strong> de moyenne sur tes ${n} épreuve${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''}.`;
  }
}

function SubjectRow({ ctx, sub, ue }) {
  const color = ue.color;
  let target;
  if (sub.complete) {
    target = html`<div class="target">Moyenne <strong>${fmtNote(sub.average)}</strong>${sub.average >= PASS ? ' ✓' : ''}</div>`;
  } else if (sub.needed <= 0) {
    target = html`<div class="target">10 déjà assuré</div>`;
  } else if (sub.needed > 20) {
    target = html`<div class="target" style=${{ color: 'var(--pText)' }}>Il faudrait ${fmtNote(sub.needed)} : compense avec les autres matières du bloc</div>`;
  } else {
    const rem = sub.remaining;
    target = html`<div class="target"><strong>${fmtNote(sub.needed)}</strong> ${rem.length === 1 ? `au ${rem[0]}` : `de moyenne sur ${rem.join(' et ')}`}<div class="hint">pour avoir 10 dans la matière</div></div>`;
  }
  return html`<div class="subject-row">
    <div>
      <div class="subject-name"><span class="dot" style=${{ background: color }}></span>${sub.label}</div>
      ${ue.subs.length > 1 ? html`<div class="hint" style=${{ marginLeft: '18px' }}>${sub.weight} % de l’UE</div>` : null}
    </div>
    <div class="evals">
      ${sub.evals.map((e) => html`<div class="eval">
        <div class="lbl"><span>${e.label} · ${e.weight} %</span>
          <button class="link-btn add-note" aria-label=${`Ajouter une note de ${e.label} en ${sub.label}`} onClick=${() => ctx.actions.openGrade({ subject: sub.code, component: e.key })}>+</button></div>
        <div class="val serif">${e.score != null ? fmtNote(e.score) : html`<span class="mute" style=${{ fontSize: '14px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>à venir</span>`}</div>
        ${e.notes.length > 1 || (e.notes.length === 1 && (e.notes[0].label || e.notes[0].simulated)) ? html`<div class="notes">
          ${e.notes.map((n) => html`<button class=${'note-pill' + (n.simulated ? ' sim' : '')} onClick=${() => ctx.actions.openGrade({ grade: n })}
            title=${n.simulated ? 'Note simulée' : 'Modifier'}>${n.label ? n.label + ' · ' : ''}${fmtNote(Number(n.value))}${Number(n.weight) !== 1 ? ` ×${Number(n.weight)}` : ''}</button>`)}
        </div>` : e.notes.length === 1 ? html`<div class="notes"><button class="note-pill" onClick=${() => ctx.actions.openGrade({ grade: e.notes[0] })}>Modifier</button></div>` : null}
      </div>`)}
    </div>
    ${target}
  </div>`;
}

// -----------------------------------------------------------------------------
// Saisie / modification d'une note
// -----------------------------------------------------------------------------
export function GradeDialog({ ctx, init, onClose }) {
  const g = init.grade;
  const task = init.task;
  const simOn = !!ctx.sim?.on;
  const startSubject = g?.subject || task?.subject || init.subject || '';
  const [subject, setSubject] = useState(startSubject && startSubject !== 'AUTRE' ? startSubject : '');
  const sub = subjectOf(ctx, subject);
  const [component, setComponent] = useState(g?.component || init.component || (sub ? defaultComponent(task, sub) : ''));
  const [value, setValue] = useState(g ? String(Number(g.value)).replace('.', ',') : '');
  const [weight, setWeight] = useState(g ? String(Number(g.weight)) : '1');
  const [label, setLabel] = useState(g?.label ?? task?.title ?? '');
  const [simulated, setSimulated] = useState(g ? !!g.simulated : simOn && !task);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const evals = sub?.evals || [];
  const changeSubject = (code) => {
    setSubject(code);
    const s = subjectOf(ctx, code);
    if (s && !s.evals.some((e) => e.key === component)) setComponent(defaultComponent(task, s));
  };

  const save = async () => {
    setErr('');
    const v = Number(String(value).replace(',', '.'));
    const w = Number(String(weight).replace(',', '.'));
    if (!sub) return setErr('Choisis la matière.');
    if (!component) return setErr('Choisis l’épreuve.');
    if (!(v >= 0 && v <= 20) || value === '') return setErr('La note doit être comprise entre 0 et 20.');
    if (!(w > 0)) return setErr('Le coefficient doit être positif.');
    const row = { subject, component, value: v, weight: w, label: label.trim() || null, task_id: task?.id || g?.task_id || null };
    setBusy(true);
    try {
      if (simulated) {
        if (g?.simulated) ctx.sim.update(g.id, row); else ctx.sim.add(row);
      } else if (g) {
        await ctx.actions.updateGrade(g.id, row);
      } else {
        await ctx.actions.addGrade(row);
      }
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      if (g.simulated) ctx.sim.remove(g.id); else await ctx.actions.deleteGrade(g.id);
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return html`<${Modal} title=${g ? 'Modifier la note' : 'Saisir une note'} onClose=${onClose} footer=${html`
      ${g ? html`<button class="btn danger" disabled=${busy} onClick=${remove}><${Icon} name="trash" size=${16} />Supprimer</button>` : html`<span></span>`}
      <button class="btn primary" disabled=${busy} onClick=${save} style=${{ minWidth: '150px' }}>${busy ? 'Enregistrement…' : 'Enregistrer'}</button>`}>
    ${task ? html`<div class="hint">Pour la tâche « ${task.title} ».</div>` : null}
    <div class="box">
      <div class="field"><label for="g-sub">Matière</label>
        <${SubjectSelect} ctx=${ctx} id="g-sub" className="input" value=${subject} onChange=${changeSubject} allLabel="— Choisir une matière —" /></div>
      ${sub ? html`<div class="field"><span class="lbl">Épreuve</span>
        <div class="seg full" role="group" aria-label="Épreuve">
          ${evals.map((e) => html`<button aria-pressed=${component === e.key ? 'true' : 'false'} onClick=${() => setComponent(e.key)}>${e.label} · ${e.weight} %</button>`)}
        </div></div>` : null}
      <div class="row">
        <div class="field"><label for="g-val">Note sur 20</label>
          <input id="g-val" class="input" type="text" inputmode="decimal" value=${value} placeholder="ex. 13,5"
            onInput=${(e) => setValue(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') save(); }} /></div>
        <div class="field"><label for="g-w">Coefficient dans l’épreuve</label>
          <input id="g-w" class="input" type="text" inputmode="decimal" value=${weight} onInput=${(e) => setWeight(e.target.value)} /></div>
      </div>
      <div class="hint">Plusieurs notes dans une même épreuve (ex. deux TP notés en CC) ? Ajoute-les une par une : l’appli en fait la moyenne avec ces coefficients.</div>
      <div class="field"><label for="g-lbl">Libellé (facultatif)</label>
        <input id="g-lbl" class="input" type="text" value=${label} placeholder="ex. TP n°1" onInput=${(e) => setLabel(e.target.value)} /></div>
      ${!g ? html`<div class="between"><span>Note simulée (hypothèse)</span><${Switch} checked=${simulated} onChange=${setSimulated} label="Note simulée" /></div>` : null}
    </div>
    ${err ? html`<div class="err" role="alert">${err}</div>` : null}
  <//>`;
}
