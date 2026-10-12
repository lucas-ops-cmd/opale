import { html, useEffect, useRef } from '../vendor/ui.js';
import { KINDS, STATUS_LABEL, isDone, effStatus, daysLeft } from '../model.js';
import { fmtShort, fmtTime, relLabel } from '../dates.js';

const PATHS = {
  week: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M9 9v12M15 9v12M3 15h18"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  notes: '<path d="M3 20h18M6 17v-6M11 17V6M16 17V9"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.2 3.2 0 0 1 0 6.4M18 14c2 .7 3 3 3 6"/>',
  repeat: '<path d="M4 12a7 7 0 0 1 12-5l3 3M20 12a7 7 0 0 1-12 5l-3-3"/><path d="M19 4v6h-6M5 20v-6h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
};

export function Icon({ name, size = 18, stroke = 1.8, label }) {
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round"
    aria-hidden=${label ? undefined : 'true'} role=${label ? 'img' : undefined} aria-label=${label}
    dangerouslySetInnerHTML=${{ __html: PATHS[name] || '' }}></svg>`;
}

export function KindChip({ kind }) {
  const k = KINDS[kind];
  return html`<span class=${'chip' + (k?.partiel ? ' partiel' : '')}>${k?.label || kind}</span>`;
}

export function StatusChip({ status }) {
  const cls = status === 'en_cours' ? 'warn' : isDone(status) ? 'ok' : 'muted';
  return html`<span class=${'chip ' + cls}>${STATUS_LABEL[status]}</span>`;
}

export function StatusButton({ task, status, onCycle }) {
  const cls = status === 'en_cours' ? 'en_cours' : isDone(status) ? 'done' : '';
  return html`<button class="status-btn" onClick=${(e) => { e.stopPropagation(); onCycle(task); }}
      aria-label=${`Statut de « ${task.title} » : ${STATUS_LABEL[status]}. Changer`}
      title=${STATUS_LABEL[status] + ' — cliquer pour changer'}>
    <span class=${'ring ' + cls}>${isDone(status) ? html`<${Icon} name="check" size=${13} stroke=${3} />` : null}</span>
  </button>`;
}

export function subjectOf(ctx, code) {
  return ctx.subjectMap.get(code) || null;
}

export function SubjectLine({ ctx, task, withDate = false, withTime = true }) {
  const s = subjectOf(ctx, task.subject);
  const color = s?.color || '#ABAAC2';
  const name = s?.short || task.subject_label || 'Sans matière';
  const time = task.due_time ? (task.kind === 'tp' ? ` · avant ${fmtTime(task.due_time)}` : ` · ${fmtTime(task.due_time)}`) : '';
  return html`<div class="task-meta"><span class="dot" style=${{ background: color }}></span>
    <span class="txt">${name}${withDate ? ` · ${fmtShort(task.due_date)}` : ''}${withTime ? time : ''}</span></div>`;
}

export function PartnerBadge({ ctx, task }) {
  if (task.sharing === 'duo') return html`<span class="chip hi" title="Tâche en duo : statut commun"><${Icon} name="users" size=${13} stroke=${2} />Duo</span>`;
  if (task.owner_id !== ctx.me.id) return html`<span class="chip hi" title="Ajoutée par ton binôme">${initials(ctx.partner?.display_name || 'B')}</span>`;
  if (task.sharing === 'perso') return html`<span class="chip muted" title="Visible par toi seul"><${Icon} name="lock" size=${12} stroke=${2} />Perso</span>`;
  return null;
}

export function initials(name) {
  const words = (name || '?').replace(/\(.*?\)/g, ' ').split(/[\s@._-]+/).filter((w) => /\p{L}/u.test(w));
  return (words.map((w) => w.match(/\p{L}/u)[0]).join('').slice(0, 2) || '?').toUpperCase();
}

export function Countdown({ task, today, small }) {
  const d = daysLeft(task, today);
  if (d < 0) return html`<div class="countdown late">En retard</div>`;
  return html`<div class=${'countdown serif' + (small ? ' small' : '')}>${d === 0 ? 'Auj.' : d === 1 ? 'Dem.' : `J-${d}`}</div>`;
}

export function TaskRow({ ctx, task, showDate = false }) {
  const status = effStatus(task, ctx.statuses);
  const done = isDone(status);
  return html`<div class=${'task' + (done ? ' done' : '')}>
    <${StatusButton} task=${task} status=${status} onCycle=${ctx.actions.cycleStatus} />
    <button class="task-body" onClick=${() => ctx.actions.openEditor(task)} aria-label=${`Modifier « ${task.title} »`}>
      <div class="task-title">${task.title}
        ${task.recurrence !== 'none' && task.series_id ? html`<${Icon} name="repeat" size=${14} label="Récurrente" />` : null}
        <span class="mobile-only">${KINDS[task.kind]?.partiel ? html`<${KindChip} kind=${task.kind} />` : null}</span>
      </div>
      <${SubjectLine} ctx=${ctx} task=${task} withDate=${showDate} />
    </button>
    <div class="task-chips">
      <${PartnerBadge} ctx=${ctx} task=${task} />
      <${KindChip} kind=${task.kind} />
      ${status !== 'a_faire' ? html`<${StatusChip} status=${status} />` : null}
    </div>
    ${done ? null : html`<${Countdown} task=${task} today=${ctx.today} />`}
  </div>`;
}

export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector('input, select, textarea, button:not(.close-btn)');
    if (first && window.matchMedia('(min-width: 861px)').matches) first.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return html`<div class="overlay" onMouseDown=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="sheet" role="dialog" aria-modal="true" aria-label=${title} ref=${ref} style=${wide ? { maxWidth: '760px' } : null}>
      <div class="sheet-head">
        <h2 class="serif">${title}</h2>
        <button class="icon-btn plain close-btn" onClick=${onClose} aria-label="Fermer"><${Icon} name="close" /></button>
      </div>
      ${children}
      ${footer ? html`<div class="sheet-foot">${footer}</div>` : null}
    </div>
  </div>`;
}

export function Switch({ checked, onChange, label }) {
  return html`<button class="switch" role="switch" aria-checked=${checked ? 'true' : 'false'} aria-label=${label}
    onClick=${() => onChange(!checked)}></button>`;
}

export function Empty({ children }) {
  return html`<div class="empty">${children}</div>`;
}

export { relLabel };
