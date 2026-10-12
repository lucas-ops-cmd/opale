import { html, useState, useMemo } from '../vendor/ui.js';
import { Icon, Modal, subjectOf } from './common.js';
import { SubjectSelect } from './views.js';
import { KINDS, KIND_ORDER, SHARING, STATUS_LABEL, effStatus, doneStatus } from '../model.js';
import { parseQuick } from '../quickadd.js';
import { addDays, daysBetween, fmtShort, fmtTime, semesterEnd } from '../dates.js';

const hhmm = (t) => (t ? t.slice(0, 5) : '');

export function TaskEditor({ ctx, task, defaults = {}, onClose }) {
  const editing = !!task;
  const isOwner = !task || task.owner_id === ctx.me.id;
  const p = ctx.profile;
  const [quick, setQuick] = useState('');
  const [detected, setDetected] = useState(null);
  const [f, setF] = useState(() => ({
    title: task?.title || '',
    subject: task?.subject || defaults.subject || '',
    kind: task?.kind || defaults.kind || 'tp',
    due_date: task?.due_date || defaults.due_date || addDays(ctx.today, 7),
    due_time: hhmm(task?.due_time) || defaults.due_time || '',
    sharing: task?.sharing || (ctx.partner?.linked ? 'shared' : 'shared'),
    remind_days: task?.remind_days ?? p.default_remind_days ?? 7,
    custom_time: !!task?.remind_time,
    remind_time: hhmm(task?.remind_time) || hhmm(p.reminder_time) || '20:30',
    recurrence: 'none',
    until: semesterEnd(task?.due_date || defaults.due_date || ctx.today),
    status: task ? effStatus(task, ctx.statuses) : 'a_faire',
  }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const onQuick = (text) => {
    setQuick(text);
    if (!text.trim()) { setDetected(null); return; }
    const r = parseQuick(text, ctx.today, ctx.subjects);
    setDetected(r);
    const patch = {};
    if (r.title) patch.title = r.title;
    if (r.subject) patch.subject = r.subject;
    if (r.kind) patch.kind = r.kind;
    if (r.due_date) patch.due_date = r.due_date;
    if (r.due_time) patch.due_time = r.due_time;
    set(patch);
  };

  const sub = subjectOf(ctx, f.subject);
  const reminderSummary = useMemo(() => {
    if (!f.due_date) return '';
    if (Number(f.remind_days) === 0) return 'Pas de rappel pour cette tâche.';
    const time = f.custom_time ? f.remind_time : hhmm(p.reminder_time);
    const last = addDays(f.due_date, -1);
    let first = addDays(f.due_date, -Number(f.remind_days));
    if (daysBetween(ctx.today, last) < 0) return 'Échéance trop proche : aucun rappel ne sera envoyé.';
    if (daysBetween(ctx.today, first) < 0) first = ctx.today;
    const n = daysBetween(first, last) + 1;
    return `${n} rappel${n > 1 ? 's' : ''} : ${n > 1 ? `du ${fmtShort(first)} au ${fmtShort(last)}` : `le ${fmtShort(first)}`}, ${n > 1 ? 'chaque soir ' : ''}à ${time}. Aucun rappel le jour J.`;
  }, [f.due_date, f.remind_days, f.custom_time, f.remind_time, p.reminder_time, ctx.today]);

  const occurrences = useMemo(() => {
    if (editing || f.recurrence === 'none' || !f.due_date) return [f.due_date];
    const step = f.recurrence === 'weekly' ? 7 : 14;
    const out = [];
    for (let d = f.due_date; d <= f.until && out.length < 40; d = addDays(d, step)) out.push(d);
    return out;
  }, [editing, f.recurrence, f.due_date, f.until]);

  const save = async () => {
    setErr('');
    if (!f.due_date) return setErr('Choisis une date d’échéance.');
    const title = f.title.trim() || `${KINDS[f.kind].label}${sub ? ' · ' + sub.short : ''}`;
    const row = {
      title,
      subject: f.subject || null,
      subject_label: sub?.label || null,
      kind: f.kind,
      due_time: f.due_time || null,
      sharing: f.sharing,
      remind_days: Number(f.remind_days),
      remind_time: f.custom_time ? f.remind_time : null,
    };
    setBusy(true);
    try {
      if (editing) {
        await ctx.actions.updateTask(task, { ...row, due_date: f.due_date }, f.status);
      } else {
        const series = occurrences.length > 1 ? (crypto.randomUUID ? crypto.randomUUID() : null) : null;
        const rows = occurrences.map((d) => ({ ...row, due_date: d, recurrence: series ? f.recurrence : 'none', series_id: series }));
        await ctx.actions.createTasks(rows);
      }
      onClose();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (scope) => {
    setBusy(true);
    try {
      await ctx.actions.deleteTask(task, scope);
      onClose();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const doneLabel = STATUS_LABEL[doneStatus(f.kind)];

  return html`<${Modal} title=${editing ? 'Modifier la tâche' : 'Nouvelle tâche'} onClose=${onClose} footer=${html`
      ${editing && isOwner ? (confirmDel
        ? html`<div class="row" style=${{ flex: '1 1 100%' }}>
            <span class="err" style=${{ flex: '1 1 100%' }}>Supprimer définitivement${task.series_id ? ' ?' : ' cette tâche ?'}</span>
            <button class="btn danger" disabled=${busy} onClick=${() => remove('one')}>${task.series_id ? 'Seulement celle-ci' : 'Supprimer'}</button>
            ${task.series_id ? html`<button class="btn danger" disabled=${busy} onClick=${() => remove('series')}>Celle-ci et les suivantes</button>` : null}
            <button class="btn" onClick=${() => setConfirmDel(false)}>Annuler</button>
          </div>`
        : html`<button class="btn danger" onClick=${() => setConfirmDel(true)}><${Icon} name="trash" size=${16} />Supprimer</button>`)
        : html`<span></span>`}
      ${confirmDel ? null : html`<button class="btn primary" disabled=${busy} onClick=${save} style=${{ minWidth: '170px' }}>
        ${busy ? 'Enregistrement…' : editing ? 'Enregistrer' : occurrences.length > 1 ? `Ajouter ${occurrences.length} tâches` : 'Ajouter la tâche'}</button>`}`}>

    ${!editing ? html`<div class="box accent">
      <label for="quick" class="box-title" style=${{ color: 'var(--accent)', fontSize: '13px' }}><${Icon} name="sparkle" size=${16} />Saisie rapide</label>
      <input id="quick" class="input" type="text" value=${quick} placeholder="ex. TP cyber à rendre mercredi 23h59"
        onInput=${(e) => onQuick(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') save(); }} autocomplete="off" />
      ${detected ? html`<div class="hint">Détecté automatiquement :</div>
        <div style=${{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          ${detected.subject ? html`<span class="chip hi"><span class="dot" style=${{ background: subjectOf(ctx, detected.subject)?.color }}></span>${subjectOf(ctx, detected.subject)?.label}</span>` : html`<span class="chip muted">Matière ?</span>`}
          ${detected.kind ? html`<span class="chip hi">${KINDS[detected.kind].label}</span>` : null}
          ${detected.due_date ? html`<span class="chip hi">${fmtShort(detected.due_date)}${detected.due_time ? ' · ' + detected.due_time : ''}</span>` : html`<span class="chip muted">Date ?</span>`}
        </div>` : html`<div class="hint">Tape une phrase : matière, type et date sont reconnus. Tu peux tout corriger dessous.</div>`}
    </div>
    <div class="divider">ou remplis à la main</div>` : null}

    <div class="box">
      <div class="field"><label for="f-title">Titre</label>
        <input id="f-title" class="input" type="text" value=${f.title} maxlength="200" placeholder=${`${KINDS[f.kind].label}${sub ? ' · ' + sub.short : ''}`} onInput=${(e) => set({ title: e.target.value })} /></div>
      <div class="field"><label for="f-subject">Matière</label>
        <${SubjectSelect} ctx=${ctx} id="f-subject" className="input" value=${f.subject} onChange=${(v) => set({ subject: v })} allLabel="— Choisir une matière —" /></div>
      <div class="field"><span class="lbl">Type</span>
        <div class="grid2" role="group" aria-label="Type de tâche">
          ${KIND_ORDER.map((k) => html`<button class="opt" aria-pressed=${f.kind === k ? 'true' : 'false'} onClick=${() => set({ kind: k })}>${KINDS[k].label}</button>`)}
        </div></div>
      <div class="row">
        <div class="field" style=${{ flex: '3 1 160px' }}><label for="f-date">Échéance</label>
          <input id="f-date" class="input" type="date" value=${f.due_date} onInput=${(e) => set({ due_date: e.target.value })} /></div>
        <div class="field" style=${{ flex: '2 1 110px' }}><label for="f-time">Heure (facultatif)</label>
          <input id="f-time" class="input" type="time" value=${f.due_time} onInput=${(e) => set({ due_time: e.target.value })} /></div>
      </div>
      ${editing ? html`<div class="field"><span class="lbl">Statut${task.sharing === 'duo' ? ' (commun au duo)' : ''}</span>
        <div class="seg full" role="group" aria-label="Statut">
          ${['a_faire', 'en_cours', doneStatus(f.kind)].map((s) => html`<button aria-pressed=${f.status === s || (s === doneStatus(f.kind) && (f.status === 'rendu' || f.status === 'fait')) ? 'true' : 'false'} onClick=${() => set({ status: s })}>${s === doneStatus(f.kind) ? doneLabel : STATUS_LABEL[s]}</button>`)}
        </div></div>` : null}
    </div>

    <div class="box">
      <div class="box-title"><span style=${{ color: 'var(--accent)', display: 'flex' }}><${Icon} name="bell" /></span>Rappels sur l’ordinateur</div>
      <div class="between">
        <span>Commencer à</span>
        <div class="stepper">
          <button aria-label="Moins de jours" onClick=${() => set({ remind_days: Math.max(0, Number(f.remind_days) - 1) })}>−</button>
          <span class="serif">${Number(f.remind_days) === 0 ? '—' : `J-${f.remind_days}`}</span>
          <button aria-label="Plus de jours" onClick=${() => set({ remind_days: Math.min(30, Number(f.remind_days) + 1) })}>+</button>
        </div>
      </div>
      <div class="between">
        <div><div>Chaque jour jusqu’à J-1, à</div>
          <div class="hint">${f.custom_time ? 'Heure choisie pour cette tâche' : `Heure par défaut (${hhmm(p.reminder_time)})`}</div></div>
        ${f.custom_time
          ? html`<div style=${{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input class="input" type="time" style=${{ width: '120px' }} value=${f.remind_time} onInput=${(e) => set({ remind_time: e.target.value })} aria-label="Heure du rappel" />
              <button class="link-btn" onClick=${() => set({ custom_time: false })}>Par défaut</button></div>`
          : html`<button class="btn" onClick=${() => set({ custom_time: true })}>${hhmm(p.reminder_time)}</button>`}
      </div>
      <div class="hint" style=${{ padding: '10px 12px', borderRadius: '12px', background: 'var(--glass2)' }}>${reminderSummary}</div>
    </div>

    <div class="box">
      <div class="field"><span class="lbl">Partage</span>
        <div class="seg full" role="group" aria-label="Partage">
          ${Object.entries(SHARING).filter(([k]) => isOwner || k !== 'perso').map(([k, v]) => html`<button aria-pressed=${f.sharing === k ? 'true' : 'false'} onClick=${() => set({ sharing: k })}>${v.label}</button>`)}
        </div>
        <div class="hint">${SHARING[f.sharing].help}${!ctx.partner?.linked && f.sharing !== 'perso' ? ' (Aucun binôme lié pour l’instant : voir Réglages.)' : ''}</div>
      </div>
      ${!editing ? html`<div class="row">
        <div class="field"><label for="f-rec">Répéter</label>
          <select id="f-rec" class="input" value=${f.recurrence} onChange=${(e) => set({ recurrence: e.target.value })}>
            <option value="none">Jamais</option><option value="weekly">Chaque semaine</option><option value="biweekly">Toutes les 2 semaines</option>
          </select></div>
        ${f.recurrence !== 'none' ? html`<div class="field"><label for="f-until">Jusqu’au</label>
          <input id="f-until" class="input" type="date" value=${f.until} onInput=${(e) => set({ until: e.target.value })} /></div>` : null}
      </div>
      ${f.recurrence !== 'none' ? html`<div class="hint">${occurrences.length} tâche${occurrences.length > 1 ? 's' : ''} seront créées${occurrences.length >= 40 ? ' (maximum 40)' : ''}.</div>` : null}` : task.series_id ? html`<div class="hint"><${Icon} name="repeat" size=${13} /> Fait partie d’une série récurrente.</div>` : null}
      ${editing && !isOwner ? html`<div class="hint">Ajoutée par ton binôme.</div>` : null}
    </div>
    ${err ? html`<div class="err" role="alert">${err}</div>` : null}
  <//>`;
}
