import { html, useState, useMemo } from '../vendor/ui.js';
import {
  Icon, TaskRow, KindChip, StatusChip, StatusButton, SubjectLine, PartnerBadge, Countdown, Empty, subjectOf,
} from './common.js';
import { KINDS, KIND_ORDER, STATUS_LABEL, isDone, effStatus, doneStatus, sortTasks, daysLeft } from '../model.js';
import {
  addDays, startOfWeek, isoWeek, fmtLong, fmtDayHeader, fmtShort, fmtTime, parts, monthGrid, fmtMonthYear, daysBetween, toISO,
} from '../dates.js';
import { fmtNote } from '../grades.js';

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const VIEWS = [
  { id: 'semaine', label: 'Semaine', icon: 'week' },
  { id: 'tableau', label: 'Tableau', icon: 'board' },
  { id: 'calendrier', label: 'Calendrier', icon: 'calendar' },
  { id: 'liste', label: 'Liste', icon: 'list' },
];

export function ViewSwitch({ ctx }) {
  return html`<div class="seg" role="group" aria-label="Choisir la vue">
    ${VIEWS.map((v) => html`<button aria-pressed=${ctx.view === v.id ? 'true' : 'false'} onClick=${() => ctx.setView(v.id)}>${v.label}</button>`)}
  </div>`;
}

function NewTaskButton({ ctx, defaults }) {
  return html`<button class="btn primary desktop-only" onClick=${() => ctx.actions.openEditor(null, defaults)}>
    <${Icon} name="plus" stroke=${2.2} />Nouvelle tâche</button>`;
}

function needsGrade(ctx, t) {
  return (t.kind === 'tp' || KINDS[t.kind]?.partiel) && !ctx.gradeByTask.has(t.id);
}

// -----------------------------------------------------------------------------
// Semaine
// -----------------------------------------------------------------------------
export function WeekView({ ctx }) {
  const [offset, setOffset] = useState(0);
  const { today, tasks, statuses } = ctx;
  const start = addDays(startOfWeek(today), 7 * offset);
  const end = addDays(start, 6);
  const st = (t) => effStatus(t, statuses);

  const inWeek = sortTasks(tasks.filter((t) => t.due_date >= start && t.due_date <= end));
  const overdue = offset === 0 ? sortTasks(tasks.filter((t) => t.due_date < today && !isDone(st(t)))) : [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    .map((d) => ({ d, list: inWeek.filter((t) => t.due_date === d) }))
    .filter((x) => x.list.length);

  const open = tasks.filter((t) => !isDone(st(t)));
  const aFaire = open.filter((t) => st(t) === 'a_faire' && t.due_date >= today).length;
  const enCours = open.filter((t) => st(t) === 'en_cours').length;
  const doneRecent = tasks.filter((t) => isDone(st(t)) && t.due_date >= addDays(today, -7)).length;
  const nextPartiel = sortTasks(open.filter((t) => KINDS[t.kind].partiel && t.due_date >= today))[0];

  const soon = open.filter((t) => { const d = daysLeft(t, today); return d >= 0 && d <= 7; });
  const soonPartiels = soon.filter((t) => KINDS[t.kind].partiel);
  const nextWeek = sortTasks(open.filter((t) => t.due_date > end && t.due_date <= addDays(end, 7)));
  const recentDone = sortTasks(tasks.filter((t) => isDone(st(t)))).reverse().slice(0, 5);
  const p = ctx.profile;

  const range = `du ${parts(start).d}${parts(start).m !== parts(end).m ? ' ' + MONTHS_FR[parts(start).m - 1] : ''} au ${parts(end).d} ${MONTHS_FR[parts(end).m - 1]}`;

  return html`
    <div class="page-head">
      <div>
        <div class="kicker">Semaine ${isoWeek(start)} · ${range}</div>
        <h1 class="serif">${offset === 0 ? fmtLong(today) : offset === 1 ? 'Semaine prochaine' : offset === -1 ? 'Semaine dernière' : `Semaine ${isoWeek(start)}`}</h1>
      </div>
      <div class="head-actions">
        <${ViewSwitch} ctx=${ctx} />
        <${NewTaskButton} ctx=${ctx} />
      </div>
    </div>

    <div class="stats">
      <div class="stat glass"><div class="serif">${aFaire}</div><div class="mute">À faire</div></div>
      <div class="stat glass"><div class="serif" style=${{ color: 'var(--warn)' }}>${enCours}</div><div class="mute">En cours</div></div>
      <div class="stat glass"><div class="serif" style=${{ color: 'var(--ok)' }}>${doneRecent}</div><div class="mute">Rendu / fait (7 j)</div></div>
      ${nextPartiel ? html`<button class="stat next glass" style=${{ textAlign: 'left', color: 'inherit' }} onClick=${() => ctx.actions.openEditor(nextPartiel)}>
        <div class="lbl">Prochain partiel</div>
        <div class="big">${fmtShort(nextPartiel.due_date)}${nextPartiel.due_time ? ' · ' + fmtTime(nextPartiel.due_time) : ''} <span class="mute" style=${{ fontSize: '14px' }}>(${daysLeft(nextPartiel, today) === 0 ? "aujourd'hui" : 'J-' + daysLeft(nextPartiel, today)})</span></div>
        <div class="mute" style=${{ fontSize: '13px' }}>${KINDS[nextPartiel.kind].short} · ${subjectOf(ctx, nextPartiel.subject)?.label || nextPartiel.subject_label || nextPartiel.title}${nextPartiel.sharing === 'duo' ? ' · en duo' : ''}</div>
      </button>` : html`<div class="stat next glass"><div class="lbl">Prochain partiel</div><div class="big">Aucun partiel prévu</div><div class="mute" style=${{ fontSize: '13px' }}>Profites-en.</div></div>`}
    </div>

    <div class="cols">
      <section class="col-main glass panel" aria-labelledby="t-week">
        <div class="panel-head">
          <h2 id="t-week">${offset === 0 ? 'Cette semaine' : 'Semaine du ' + fmtShort(start)}</h2>
          <div style=${{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            ${offset !== 0 ? html`<button class="btn small" onClick=${() => setOffset(0)}>Aujourd'hui</button>` : null}
            <button class="icon-btn" style=${{ width: '36px', height: '36px', borderRadius: '11px' }} onClick=${() => setOffset(offset - 1)} aria-label="Semaine précédente"><${Icon} name="chevL" /></button>
            <button class="icon-btn" style=${{ width: '36px', height: '36px', borderRadius: '11px' }} onClick=${() => setOffset(offset + 1)} aria-label="Semaine suivante"><${Icon} name="chevR" /></button>
          </div>
        </div>
        ${overdue.length ? html`<div class="day-head late">En retard</div>
          <div class="task-list">${overdue.map((t) => html`<${TaskRow} key=${t.id} ctx=${ctx} task=${t} showDate=${true} />`)}</div>` : null}
        ${days.map(({ d, list }) => html`
          <div class=${'day-head' + (d === today ? ' today' : '')}>${d === today ? "Aujourd'hui · " : ''}${fmtDayHeader(d)}</div>
          <div class="task-list">${list.map((t) => html`<${TaskRow} key=${t.id} ctx=${ctx} task=${t} />`)}</div>`)}
        ${!days.length && !overdue.length ? html`<${Empty}>Rien de prévu ${offset === 0 ? 'cette semaine' : 'sur cette semaine'}.
          <div style=${{ marginTop: '10px' }}><button class="btn small" onClick=${() => ctx.actions.openEditor(null, { due_date: offset === 0 ? today : start })}>Ajouter une tâche</button></div><//>` : null}
      </section>

      <aside class="col-side">
        <div class="glass panel" style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style=${{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style=${{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><${Icon} name="bell" /></div>
            <div><div style=${{ fontWeight: 700 }}>Récap du soir</div>
              <div class="mute" style=${{ fontSize: '13px' }}>${p.recap_enabled ? `Notification à ${fmtTime(p.recap_time)}` : 'Désactivé'}</div></div>
          </div>
          <p style=${{ margin: 0 }}>${soon.length
            ? html`${soon.length} tâche${soon.length > 1 ? 's' : ''} dans les 7 prochains jours${soonPartiels.length ? html`, dont <strong>${soonPartiels.length} partiel${soonPartiels.length > 1 ? 's' : ''}</strong>` : ''}.`
            : 'Rien dans les 7 prochains jours.'}</p>
          <div class="between" style=${{ paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '13px' }}>
            <span class="mute">Rappels de J-${p.default_remind_days} à J-1 · ${fmtTime(p.reminder_time)} par défaut</span>
            <button class="link-btn" onClick=${() => ctx.setView('reglages')}>Modifier</button>
          </div>
        </div>

        <div class="glass panel">
          <h2 style=${{ marginBottom: '6px' }}>${offset === 0 ? 'Semaine prochaine' : 'Semaine suivante'}</h2>
          ${nextWeek.length ? nextWeek.map((t) => html`<div class="mini-row" key=${t.id}>
              <span class="dot" style=${{ background: subjectOf(ctx, t.subject)?.color || '#ABAAC2' }}></span>
              <button class="grow" onClick=${() => ctx.actions.openEditor(t)}>
                <div class="t">${t.title}${t.series_id ? html`<${Icon} name="repeat" size=${13} label="Récurrente" />` : null}</div>
                <div class="s">${subjectOf(ctx, t.subject)?.short || t.subject_label || 'Sans matière'} · <span style=${KINDS[t.kind].partiel ? { color: 'var(--pText)', fontWeight: 600 } : null}>${KINDS[t.kind].label}</span></div>
              </button>
              <div class="mute" style=${{ fontSize: '13px' }}>${fmtShort(t.due_date).split(' ').slice(0, 2).join(' ')}</div>
            </div>`) : html`<div class="mute" style=${{ fontSize: '14px', padding: '6px 0' }}>Rien de prévu.</div>`}
        </div>

        <div class="glass panel">
          <h2 style=${{ marginBottom: '6px' }}>Terminées récemment</h2>
          ${recentDone.length ? recentDone.map((t) => html`<div class="mini-row" key=${t.id}>
              <span class="check-ok"><${Icon} name="check" size=${13} stroke=${2.6} /></span>
              <button class="grow" onClick=${() => ctx.actions.openEditor(t)}>
                <div class="t">${t.title}</div>
                <div class="s">${subjectOf(ctx, t.subject)?.short || t.subject_label || 'Sans matière'} · ${STATUS_LABEL[effStatus(t, statuses)]}</div>
              </button>
              ${ctx.gradeByTask.has(t.id)
                ? html`<span class="chip ok">${fmtNote(Number(ctx.gradeByTask.get(t.id).value))}</span>`
                : needsGrade(ctx, t) ? html`<button class="link-btn" onClick=${() => ctx.actions.openGrade({ task: t })}>Saisir la note</button>` : null}
            </div>`) : html`<div class="mute" style=${{ fontSize: '14px', padding: '6px 0' }}>Aucune tâche terminée pour l’instant.</div>`}
          <div style=${{ marginTop: '8px' }}><button class="link-btn" onClick=${() => ctx.setView('archives')}>Voir les archives</button></div>
        </div>
      </aside>
    </div>`;
}

// -----------------------------------------------------------------------------
// Filtres communs
// -----------------------------------------------------------------------------
export function SubjectSelect({ ctx, value, onChange, allLabel = 'Toutes les matières', id, className = 'select' }) {
  return html`<select id=${id} class=${className} value=${value} onChange=${(e) => onChange(e.target.value)} aria-label="Matière">
    ${allLabel !== null ? html`<option value="">${allLabel}</option>` : null}
    ${ctx.curriculum.semesters.map((sem) => html`<optgroup label=${sem.label}>
      ${sem.blocs.flatMap((b) => b.ues.flatMap((u) => u.subs.map((s) => html`<option value=${s.code}>${s.label}</option>`)))}
    </optgroup>`)}
    <option value="AUTRE">Autre / sans matière</option>
  </select>`;
}

function KindSelect({ value, onChange }) {
  return html`<select class="select" value=${value} onChange=${(e) => onChange(e.target.value)} aria-label="Type">
    <option value="">Tous les types</option>
    ${KIND_ORDER.map((k) => html`<option value=${k}>${KINDS[k].label}</option>`)}
  </select>`;
}

function applyFilters(tasks, subject, kind) {
  return tasks.filter((t) =>
    (!subject || (subject === 'AUTRE' ? !t.subject || t.subject === 'AUTRE' : t.subject === subject)) &&
    (!kind || t.kind === kind));
}

// -----------------------------------------------------------------------------
// Tableau
// -----------------------------------------------------------------------------
export function BoardView({ ctx }) {
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [over, setOver] = useState(null);
  const { today, statuses } = ctx;
  const st = (t) => effStatus(t, statuses);
  const list = sortTasks(applyFilters(ctx.tasks, subject, kind));
  const lanes = [
    { id: 'a_faire', title: 'À faire', items: list.filter((t) => st(t) === 'a_faire') },
    { id: 'en_cours', title: 'En cours', color: 'var(--warn)', items: list.filter((t) => st(t) === 'en_cours') },
    { id: 'done', title: 'Rendu / fait', color: 'var(--ok)', items: list.filter((t) => isDone(st(t)) && (allDone || t.due_date >= addDays(today, -14))).reverse() },
  ];
  const drop = (lane, e) => {
    e.preventDefault(); setOver(null);
    const t = ctx.tasks.find((x) => x.id === e.dataTransfer.getData('text/plain'));
    if (!t) return;
    const target = lane === 'done' ? doneStatus(t.kind) : lane;
    if (st(t) !== target) ctx.actions.setStatus(t, target);
  };
  const semCount = ctx.tasks.length;

  return html`
    <div class="page-head">
      <div><div class="kicker">${semCount} tâche${semCount > 1 ? 's' : ''} au total</div><h1 class="serif">Tableau</h1></div>
      <div class="head-actions"><${ViewSwitch} ctx=${ctx} /><${NewTaskButton} ctx=${ctx} /></div>
    </div>
    <div class="filters">
      <${SubjectSelect} ctx=${ctx} value=${subject} onChange=${setSubject} />
      <${KindSelect} value=${kind} onChange=${setKind} />
      <span style=${{ flex: '1 1 auto' }}></span>
      <span class="mute desktop-only" style=${{ fontSize: '13px' }}>Glisse une carte pour changer son statut</span>
    </div>
    <div class="board">
      ${lanes.map((lane) => html`<section class=${'lane glass' + (over === lane.id ? ' over' : '')} aria-label=${lane.title}
          onDragOver=${(e) => { e.preventDefault(); setOver(lane.id); }} onDragLeave=${() => setOver(null)} onDrop=${(e) => drop(lane.id, e)}>
        <div class="lane-head"><h2 style=${{ color: lane.color }}>${lane.title}</h2><span class="chip hi">${lane.items.length}</span></div>
        ${lane.items.map((t) => html`<${BoardCard} key=${t.id} ctx=${ctx} task=${t} status=${st(t)} />`)}
        ${!lane.items.length ? html`<div class="empty" style=${{ padding: '18px' }}>${lane.id === 'done' ? 'Rien de terminé récemment' : 'Rien ici'}</div>` : null}
        ${lane.id === 'done' ? html`<button class="link-btn" style=${{ padding: '4px' }} onClick=${() => setAllDone(!allDone)}>${allDone ? 'Seulement les 14 derniers jours' : 'Afficher toutes les terminées'}</button>` : null}
      </section>`)}
    </div>`;
}

function BoardCard({ ctx, task, status }) {
  const done = isDone(status);
  const nextLabel = status === 'a_faire' ? 'Commencer' : status === 'en_cours' ? (task.kind === 'tp' ? 'Marquer rendu' : 'Marquer fait') : 'Rouvrir';
  const next = status === 'a_faire' ? 'en_cours' : status === 'en_cours' ? doneStatus(task.kind) : 'a_faire';
  return html`<div class="bcard" draggable="true" onDragStart=${(e) => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; }}>
    <div class="top">
      <button class="ttl" style=${{ border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick=${() => ctx.actions.openEditor(task)}>${task.title}</button>
      ${done ? html`<${StatusChip} status=${status} />` : html`<${Countdown} task=${task} today=${ctx.today} small=${true} />`}
    </div>
    <${SubjectLine} ctx=${ctx} task=${task} withDate=${true} />
    <div class="actions">
      <${KindChip} kind=${task.kind} /><${PartnerBadge} ctx=${ctx} task=${task} />
      ${task.series_id ? html`<span class="chip hi"><${Icon} name="repeat" size=${12} stroke=${2} />Récurrente</span>` : null}
    </div>
    <div class="actions">
      <button class="btn small" onClick=${() => ctx.actions.setStatus(task, next)}>${nextLabel}</button>
      ${done && needsGrade(ctx, task) ? html`<button class="btn small dashed" onClick=${() => ctx.actions.openGrade({ task })}>+ Saisir la note</button>` : null}
      ${done && ctx.gradeByTask.has(task.id) ? html`<span class="chip ok">Note : ${fmtNote(Number(ctx.gradeByTask.get(task.id).value))}</span>` : null}
    </div>
  </div>`;
}

// -----------------------------------------------------------------------------
// Calendrier
// -----------------------------------------------------------------------------
export function CalendarView({ ctx }) {
  const { today, statuses } = ctx;
  const [month, setMonth] = useState(() => today.slice(0, 7) + '-01');
  const [sel, setSel] = useState(today);
  const grid = monthGrid(month);
  const m = parts(month).m;
  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of sortTasks(ctx.tasks)) {
      if (!map.has(t.due_date)) map.set(t.due_date, []);
      map.get(t.due_date).push(t);
    }
    return map;
  }, [ctx.tasks]);
  const shift = (n) => { const { y, m: mm } = parts(month); setMonth(toISO(y, mm + n, 1)); };
  const selList = byDay.get(sel) || [];

  return html`
    <div class="page-head">
      <div><div class="kicker">Vue mensuelle</div><h1 class="serif">Calendrier</h1></div>
      <div class="head-actions"><${ViewSwitch} ctx=${ctx} /><${NewTaskButton} ctx=${ctx} defaults=${{ due_date: sel }} /></div>
    </div>
    <div class="cols">
      <section class="col-main glass panel" style=${{ flexBasis: '640px' }}>
        <div class="cal-head">
          <h2>${fmtMonthYear(month)}</h2>
          <div style=${{ display: 'flex', gap: '6px' }}>
            <button class="btn small" onClick=${() => { setMonth(today.slice(0, 7) + '-01'); setSel(today); }}>Aujourd'hui</button>
            <button class="icon-btn" style=${{ width: '36px', height: '36px', borderRadius: '11px' }} onClick=${() => shift(-1)} aria-label="Mois précédent"><${Icon} name="chevL" /></button>
            <button class="icon-btn" style=${{ width: '36px', height: '36px', borderRadius: '11px' }} onClick=${() => shift(1)} aria-label="Mois suivant"><${Icon} name="chevR" /></button>
          </div>
        </div>
        <div class="cal" role="grid">
          ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => html`<div class="wd">${d}</div>`)}
          ${grid.map((d) => {
            const list = byDay.get(d) || [];
            const cls = 'cal-day' + (parts(d).m !== m ? ' out' : '') + (d === today ? ' today' : '') + (d === sel ? ' sel' : '');
            return html`<button class=${cls} onClick=${() => setSel(d)} onDblClick=${() => ctx.actions.openEditor(null, { due_date: d })}
                aria-label=${`${fmtShort(d)} : ${list.length} tâche${list.length > 1 ? 's' : ''}`}>
              <span class="n">${parts(d).d}</span>
              ${list.slice(0, 3).map((t) => {
                const done = isDone(effStatus(t, statuses));
                const s = subjectOf(ctx, t.subject);
                return html`<span class=${'cal-chip' + (done ? ' done' : '') + (KINDS[t.kind].partiel ? ' partiel' : '')}>
                  <span class="dot" style=${{ background: s?.color || '#ABAAC2', width: '6px', height: '6px' }}></span>${t.title}</span>`;
              })}
              ${list.length > 3 ? html`<span class="cal-more">+${list.length - 3}</span>` : null}
              <span class="cal-dots">${list.slice(0, 4).map((t) => html`<span class="dot" style=${{ width: '6px', height: '6px', background: KINDS[t.kind].partiel ? 'var(--pText)' : (subjectOf(ctx, t.subject)?.color || '#ABAAC2') }}></span>`)}</span>
            </button>`;
          })}
        </div>
      </section>
      <aside class="col-side">
        <div class="glass panel">
          <div class="panel-head"><h2>${fmtDayHeader(sel)}</h2>
            <button class="btn small" onClick=${() => ctx.actions.openEditor(null, { due_date: sel })}><${Icon} name="plus" size=${16} />Ajouter</button></div>
          <div class="task-list">
            ${selList.length ? selList.map((t) => html`<${TaskRow} key=${t.id} ctx=${ctx} task=${t} />`) : html`<${Empty}>Rien ce jour-là.<//>`}
          </div>
        </div>
      </aside>
    </div>`;
}

// -----------------------------------------------------------------------------
// Liste
// -----------------------------------------------------------------------------
export function ListView({ ctx }) {
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState('');
  const [group, setGroup] = useState('date');
  const [withDone, setWithDone] = useState(false);
  const { statuses, today } = ctx;
  const list = sortTasks(applyFilters(ctx.tasks, subject, kind).filter((t) => withDone || !isDone(effStatus(t, statuses))));

  let groups = [];
  if (group === 'date') {
    const map = new Map();
    for (const t of list) {
      const d = daysBetween(today, t.due_date);
      const key = d < 0 ? 'late' : d <= 6 ? 'week' : d <= 13 ? 'next' : t.due_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    groups = [...map.entries()].map(([k, items]) => ({
      key: k,
      title: k === 'late' ? 'En retard / passées' : k === 'week' ? '7 prochains jours' : k === 'next' ? 'Dans 1 à 2 semaines' : fmtMonthYear(k + '-01'),
      items,
    }));
  } else {
    const map = new Map();
    for (const t of list) {
      const key = t.subject || 'AUTRE';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    groups = [...map.entries()].map(([k, items]) => ({ key: k, title: subjectOf(ctx, k)?.label || items[0].subject_label || 'Sans matière', color: subjectOf(ctx, k)?.color, items }))
      .sort((a, b) => a.items[0].due_date.localeCompare(b.items[0].due_date));
  }

  return html`
    <div class="page-head">
      <div><div class="kicker">${list.length} tâche${list.length > 1 ? 's' : ''}${withDone ? '' : ' en cours ou à faire'}</div><h1 class="serif">Liste</h1></div>
      <div class="head-actions"><${ViewSwitch} ctx=${ctx} /><${NewTaskButton} ctx=${ctx} /></div>
    </div>
    <div class="filters">
      <div class="seg" role="group" aria-label="Regrouper">
        <button aria-pressed=${group === 'date' ? 'true' : 'false'} onClick=${() => setGroup('date')}>Par date</button>
        <button aria-pressed=${group === 'subject' ? 'true' : 'false'} onClick=${() => setGroup('subject')}>Par matière</button>
      </div>
      <${SubjectSelect} ctx=${ctx} value=${subject} onChange=${setSubject} />
      <${KindSelect} value=${kind} onChange=${setKind} />
      <label style=${{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
        <input type="checkbox" checked=${withDone} onChange=${(e) => setWithDone(e.target.checked)} />Inclure les terminées</label>
    </div>
    <section class="glass panel">
      ${groups.length ? groups.map((g) => html`
        <div class=${'day-head' + (g.key === 'late' ? ' late' : '')} style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          ${g.color ? html`<span class="dot" style=${{ background: g.color }}></span>` : null}${g.title}</div>
        <div class="task-list">${g.items.map((t) => html`<${TaskRow} key=${t.id} ctx=${ctx} task=${t} showDate=${true} />`)}</div>`)
      : html`<${Empty}>Aucune tâche ne correspond.<//>`}
    </section>`;
}

// -----------------------------------------------------------------------------
// Archives
// -----------------------------------------------------------------------------
export function ArchiveView({ ctx }) {
  const { statuses } = ctx;
  const done = sortTasks(ctx.tasks.filter((t) => isDone(effStatus(t, statuses)))).reverse();
  const map = new Map();
  for (const t of done) {
    const k = t.due_date.slice(0, 7);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return html`
    <div class="page-head">
      <div><div class="kicker">${done.length} tâche${done.length > 1 ? 's' : ''} terminée${done.length > 1 ? 's' : ''}</div><h1 class="serif">Archives</h1></div>
    </div>
    <section class="glass panel">
      ${done.length ? [...map.entries()].map(([k, items]) => html`
        <div class="day-head">${fmtMonthYear(k + '-01')}</div>
        <div class="task-list">${items.map((t) => html`<div class="task done" key=${t.id}>
          <${StatusButton} task=${t} status=${effStatus(t, statuses)} onCycle=${() => ctx.actions.setStatus(t, 'a_faire')} />
          <button class="task-body" onClick=${() => ctx.actions.openEditor(t)}>
            <div class="task-title">${t.title}</div>
            <${SubjectLine} ctx=${ctx} task=${t} withDate=${true} withTime=${false} />
          </button>
          <div class="task-chips" style=${{ display: 'flex' }}>
            <${StatusChip} status=${effStatus(t, statuses)} />
            ${ctx.gradeByTask.has(t.id)
              ? html`<span class="chip ok">${fmtNote(Number(ctx.gradeByTask.get(t.id).value))}/20</span>`
              : needsGrade(ctx, t) ? html`<button class="btn small dashed" onClick=${() => ctx.actions.openGrade({ task: t })}>+ Note</button>` : null}
          </div>
        </div>`)}</div>`)
      : html`<${Empty}>Les tâches rendues ou faites arriveront ici, pour vérifier en un coup d’œil ce qui est déjà fait.<//>`}
    </section>`;
}
