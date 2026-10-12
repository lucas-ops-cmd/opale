import { html, render, useState, useEffect, useMemo, useRef } from './vendor/ui.js';
import { api, DEMO } from './store.js';
import { DEFAULT_CURRICULUM, flattenSubjects, validateCurriculum } from './curriculum.js';
import { todayISO } from './dates.js';
import { KINDS, effStatus, nextStatus, isDone, STATUS_LABEL } from './model.js';
import { Icon, initials } from './ui/common.js';
import { WeekView, BoardView, CalendarView, ListView, ArchiveView, VIEWS } from './ui/views.js';
import { TaskEditor } from './ui/editor.js';
import { NotesView, GradeDialog, useSimulation } from './ui/notes.js';
import { SettingsView } from './ui/settings.js';

const AGENDA = new Set(VIEWS.map((v) => v.id));
const ALL_VIEWS = new Set([...AGENDA, 'notes', 'archives', 'reglages']);

// -----------------------------------------------------------------------------
// Connexion
// -----------------------------------------------------------------------------
function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(() => {
    const q = new URLSearchParams(location.search + '&' + location.hash.slice(1));
    const e = q.get('error_description');
    return e ? { ok: false, text: decodeURIComponent(e.replace(/\+/g, ' ')) } : null;
  });
  const [busy, setBusy] = useState(false);

  const go = async (f) => {
    setBusy(true); setMsg(null);
    try { await f(); } catch (e) { setMsg({ ok: false, text: translateAuth(e.message) }); }
    setBusy(false);
  };
  const submit = (e) => {
    e.preventDefault();
    if (mode === 'login') go(() => api.signIn(email.trim(), password));
    else if (mode === 'signup') go(async () => {
      if (password.length < 6) throw new Error('Mot de passe : 6 caractères minimum.');
      const r = await api.signUp(email.trim(), password, name.trim());
      if (r.needsConfirmation) setMsg({ ok: true, text: 'Compte créé. Ouvre le lien reçu par email pour le confirmer, puis connecte-toi.' });
    });
    else go(async () => { await api.resetPassword(email.trim()); setMsg({ ok: true, text: 'Si un compte existe, un email de réinitialisation a été envoyé.' }); });
  };

  return html`<div class="orbs" aria-hidden="true"><div class="o1"></div><div class="o2"></div><div class="o3"></div></div>
  <main class="login">
    <div class="card glass">
      <div style=${{ display: 'flex', alignItems: 'center', gap: '14px' }}><div class="gem" style=${{ width: '44px', height: '44px', borderRadius: '14px' }}></div><h1 class="serif">Opale</h1></div>
      <p class="mute" style=${{ margin: 0 }}>Tes rendus, contrôles et deadlines au même endroit, sur le téléphone et l’ordinateur.</p>
      ${DEMO ? html`
        <button class="btn primary" onClick=${() => api.signInGoogle()}>Entrer dans la démo</button>
        <div class="hint">Mode démo : Supabase n’est pas encore configuré (fichier config.js). Les données restent sur cet appareil.</div>`
      : html`
        <button class="btn google" disabled=${busy} onClick=${() => go(() => api.signInGoogle())}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continuer avec Google</button>
        <div class="divider">ou avec un email</div>
        <form onSubmit=${submit} style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          ${mode === 'signup' ? html`<div class="field"><label for="l-name">Prénom</label><input id="l-name" class="input" value=${name} onInput=${(e) => setName(e.target.value)} autocomplete="given-name" /></div>` : null}
          <div class="field"><label for="l-email">Email</label><input id="l-email" class="input" type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} autocomplete="email" /></div>
          ${mode !== 'reset' ? html`<div class="field"><label for="l-pw">Mot de passe</label><input id="l-pw" class="input" type="password" required value=${password} onInput=${(e) => setPassword(e.target.value)} autocomplete=${mode === 'signup' ? 'new-password' : 'current-password'} /></div>` : null}
          <button class="btn primary" type="submit" disabled=${busy}>${mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}</button>
        </form>
        <div class="between" style=${{ fontSize: '13px' }}>
          ${mode === 'login'
            ? html`<button class="link-btn" onClick=${() => setMode('signup')}>Créer un compte</button><button class="link-btn" onClick=${() => setMode('reset')}>Mot de passe oublié ?</button>`
            : html`<button class="link-btn" onClick=${() => setMode('login')}>J’ai déjà un compte</button>`}
        </div>`}
      ${msg ? html`<div class=${msg.ok ? 'okmsg' : 'err'} role="alert">${msg.text}</div>` : null}
    </div>
  </main>`;
}

function translateAuth(m = '') {
  if (/Invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(m)) return 'Email pas encore confirmé : ouvre le lien reçu par email (ou désactive « Confirm email » dans Supabase).';
  if (/already registered/i.test(m)) return 'Un compte existe déjà avec cet email.';
  if (/provider is not enabled/i.test(m)) return 'La connexion Google n’est pas encore activée dans Supabase (voir le guide, étape optionnelle). Utilise l’email en attendant.';
  if (/rate limit/i.test(m)) return 'Trop de tentatives, réessaie dans quelques minutes.';
  return m;
}

// -----------------------------------------------------------------------------
// Application
// -----------------------------------------------------------------------------
function Sidebar({ ctx }) {
  const item = (id, label, icon) => html`<button class="nav-item" aria-current=${ctx.view === id ? 'page' : undefined} onClick=${() => ctx.setView(id)}>
    <${Icon} name=${icon} />${label}</button>`;
  const partner = ctx.partner;
  return html`<nav class="sidebar glass" aria-label="Navigation principale">
    <div class="brand"><div class="gem" aria-hidden="true"></div><div class="serif">Opale</div></div>
    <div class="nav-label" style=${{ paddingTop: '6px' }}>Vues</div>
    ${item('semaine', 'Cette semaine', 'week')}
    ${item('tableau', 'Tableau', 'board')}
    ${item('calendrier', 'Calendrier', 'calendar')}
    ${item('liste', 'Liste', 'list')}
    <div class="nav-label">Suivi</div>
    ${item('notes', 'Mes notes', 'notes')}
    ${item('archives', 'Archives', 'archive')}
    ${item('reglages', 'Réglages', 'settings')}
    <div class="nav-spacer"></div>
    <button class="buddy" style=${{ textAlign: 'left', color: 'inherit' }} onClick=${() => ctx.setView('reglages')}>
      <div class="avatars">
        <div class="avatar" style=${{ background: '#B9AEFF', color: '#120E2C' }}>${initials(ctx.profile.display_name || 'Moi')}</div>
        ${partner?.linked ? html`<div class="avatar" style=${{ background: '#7FD6C8', color: '#0C2622' }}>${initials(partner.display_name || partner.email)}</div>` : null}
      </div>
      <div style=${{ fontWeight: 600 }}>${partner?.linked ? `Partagé avec ${partner.display_name || partner.email}` : 'Pas encore de binôme'}</div>
      <div class="mute" style=${{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span class="dot" style=${{ width: '7px', height: '7px', background: ctx.syncOk ? 'var(--ok)' : 'var(--warn)' }}></span>
        ${ctx.syncOk ? 'Synchronisé' : 'Hors ligne'}</div>
    </button>
  </nav>`;
}

function BottomNav({ ctx }) {
  const b = (id, label, icon, active) => html`<button aria-current=${active ? 'page' : undefined} onClick=${() => ctx.setView(id)}><${Icon} name=${icon} size=${20} />${label}</button>`;
  return html`<nav class="bottomnav glass" aria-label="Navigation">
    ${b(AGENDA.has(ctx.view) ? ctx.view : (ctx.profile.start_view || 'semaine'), 'Agenda', 'week', AGENDA.has(ctx.view))}
    ${b('notes', 'Notes', 'notes', ctx.view === 'notes')}
    ${b('archives', 'Archives', 'archive', ctx.view === 'archives')}
    ${b('reglages', 'Réglages', 'settings', ctx.view === 'reglages')}
  </nav>`;
}

function Toasts({ toasts, dismiss }) {
  return html`<div class="toasts" aria-live="polite">
    ${toasts.map((t) => html`<div class="toast" key=${t.id}>
      <span class="grow">${t.text}</span>
      ${t.action ? html`<button class="btn small" onClick=${() => { t.action.run(); dismiss(t.id); }}>${t.action.label}</button>` : null}
      <button class="icon-btn plain" style=${{ width: '32px', height: '32px' }} onClick=${() => dismiss(t.id)} aria-label="Fermer"><${Icon} name="close" size=${16} /></button>
    </div>`)}
  </div>`;
}

function applyTheme(theme) {
  const dark = theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A0C16' : '#E8E6F3');
}

function App() {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [view, setViewState] = useState(() => (ALL_VIEWS.has(location.hash.slice(1)) ? location.hash.slice(1) : null));
  const [editor, setEditor] = useState(null);
  const [gradeDlg, setGradeDlg] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [today, setToday] = useState(todayISO());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [syncOk, setSyncOk] = useState(true);
  const sim = useSimulation();
  const reloadTimer = useRef(null);

  const toast = (text, action) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((l) => [...l.slice(-2), { id, text, action }]);
    setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), action ? 8000 : 3500);
  };
  const dismiss = (id) => setToasts((l) => l.filter((t) => t.id !== id));

  const reload = async () => {
    try {
      const d = await api.loadAll();
      setData(d); setSyncOk(true); setLoadError(null);
      setViewState((v) => v || (AGENDA.has(d.profile.start_view) ? d.profile.start_view : 'semaine'));
    } catch (e) {
      setSyncOk(false);
      if (!data) setLoadError(e.message);
    }
  };
  const scheduleReload = () => { clearTimeout(reloadTimer.current); reloadTimer.current = setTimeout(reload, 400); };

  useEffect(() => {
    api.getSession().then(setSession).catch(() => setSession(null));
    api.onAuthChange((s) => setSession(s));
    const onBip = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', onBip);
    const onHash = () => { const h = location.hash.slice(1); if (ALL_VIEWS.has(h)) setViewState(h); };
    window.addEventListener('hashchange', onHash);
    const tick = setInterval(() => setToday(todayISO()), 60000);
    navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.type === 'refresh') scheduleReload(); });
    return () => { window.removeEventListener('beforeinstallprompt', onBip); window.removeEventListener('hashchange', onHash); clearInterval(tick); };
  }, []);

  useEffect(() => {
    if (!session) { setData(null); return undefined; }
    reload();
    const unsub = api.subscribe(scheduleReload);
    const onFocus = () => { setToday(todayISO()); scheduleReload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const poll = setInterval(scheduleReload, 120000);
    return () => { unsub?.(); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); clearInterval(poll); };
  }, [session?.user?.id]);

  const theme = data?.profile?.theme || 'dark';
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const f = () => applyTheme(theme);
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, [theme]);

  const curriculum = useMemo(() => {
    const c = data?.profile?.curriculum;
    return c && validateCurriculum(c).length === 0 ? c : DEFAULT_CURRICULUM;
  }, [data?.profile?.curriculum]);
  const subjects = useMemo(() => flattenSubjects(curriculum), [curriculum]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.code, s])), [subjects]);

  if (session === undefined) return null;
  if (!session) return html`<${Login} />`;
  if (!data) {
    return html`<div class="orbs" aria-hidden="true"><div class="o1"></div><div class="o2"></div><div class="o3"></div></div>
      <main class="login"><div class="card glass">
        <div style=${{ display: 'flex', alignItems: 'center', gap: '14px' }}><div class="gem"></div><div class="serif" style=${{ fontSize: '32px' }}>Opale</div></div>
        ${loadError ? html`<div class="err">Impossible de charger tes données : ${loadError}</div>
          <div class="hint">Le script setup.sql a-t-il bien été exécuté dans Supabase ?</div>
          <div class="row"><button class="btn" onClick=${reload}>Réessayer</button><button class="btn" onClick=${() => api.signOut()}>Se déconnecter</button></div>`
        : html`<div class="mute">Chargement…</div>`}
      </div></main>`;
  }

  const setView = (v) => { setViewState(v); if (location.hash.slice(1) !== v) history.pushState(null, '', '#' + v); window.scrollTo({ top: 0 }); };

  const patchData = (f) => setData((d) => (d ? f(d) : d));
  const fail = (e) => { toast('Erreur : ' + (e.message || e)); reload(); };

  const actions = {
    openEditor: (task, defaults) => setEditor({ task, defaults }),
    openGrade: (init) => setGradeDlg(init),
    cycleStatus: (task) => actions.setStatus(task, nextStatus(task, effStatus(task, data.statuses))),
    setStatus: async (task, status) => {
      patchData((d) => (task.sharing === 'duo'
        ? { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, duo_status: status } : t)) }
        : { ...d, statuses: { ...d.statuses, [task.id]: status } }));
      try { await api.setStatus(task, status); } catch (e) { return fail(e); }
      if (isDone(status)) {
        const gradable = task.kind === 'tp' || KINDS[task.kind].partiel;
        const hasGrade = data.grades.some((g) => g.task_id === task.id);
        toast(`« ${task.title} » : ${STATUS_LABEL[status].toLowerCase()} ✓${task.sharing === 'duo' ? ' (pour vous deux)' : ''}`,
          gradable && !hasGrade ? { label: 'Saisir la note', run: () => setGradeDlg({ task }) } : null);
      }
    },
    createTasks: async (rows) => {
      await api.createTasks(rows);
      toast(rows.length > 1 ? `${rows.length} tâches ajoutées.` : 'Tâche ajoutée.');
      reload();
    },
    updateTask: async (task, patch, status) => {
      await api.updateTask(task.id, patch);
      if (status && status !== effStatus(task, data.statuses)) await api.setStatus({ ...task, ...patch }, status);
      toast('Modifications enregistrées.');
      reload();
    },
    deleteTask: async (task, scope) => {
      if (scope === 'series' && task.series_id) await api.deleteSeries(task.series_id, task.due_date);
      else await api.deleteTask(task.id);
      toast('Supprimé.');
      reload();
    },
    addGrade: async (g) => { await api.addGrade(g); toast('Note enregistrée.'); reload(); },
    updateGrade: async (id, patch) => { await api.updateGrade(id, patch); reload(); },
    deleteGrade: async (id) => { await api.deleteGrade(id); reload(); },
    saveProfile: async (patch) => {
      patchData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
      try { await api.saveProfile(patch); } catch (e) { return fail(e); }
      if ('partner_email' in patch || 'curriculum' in patch) reload();
    },
    install: async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); },
  };

  const gradeByTask = new Map(data.grades.filter((g) => g.task_id).map((g) => [g.task_id, g]));
  const ctx = {
    ...data, today, curriculum, subjects, subjectMap, gradeByTask, view: view || 'semaine', setView, actions, sim, installPrompt, syncOk,
  };

  let content;
  switch (ctx.view) {
    case 'tableau': content = html`<${BoardView} ctx=${ctx} />`; break;
    case 'calendrier': content = html`<${CalendarView} ctx=${ctx} />`; break;
    case 'liste': content = html`<${ListView} ctx=${ctx} />`; break;
    case 'notes': content = html`<${NotesView} ctx=${ctx} />`; break;
    case 'archives': content = html`<${ArchiveView} ctx=${ctx} />`; break;
    case 'reglages': content = html`<${SettingsView} ctx=${ctx} />`; break;
    default: content = html`<${WeekView} ctx=${ctx} />`;
  }

  return html`
    <div class="orbs" aria-hidden="true"><div class="o1"></div><div class="o2"></div><div class="o3"></div></div>
    <div class="shell">
      <${Sidebar} ctx=${ctx} />
      <main class="main">
        ${DEMO ? html`<div class="demo-banner glass"><span><strong>Mode démo</strong> · données d’exemple enregistrées sur cet appareil.</span><span class="mute">Remplis config.js pour synchroniser téléphone et ordinateur.</span></div>` : null}
        ${content}
      </main>
    </div>
    <${BottomNav} ctx=${ctx} />
    ${ctx.view !== 'reglages' ? html`<button class="fab" aria-label=${ctx.view === 'notes' ? 'Saisir une note' : 'Nouvelle tâche'}
      onClick=${() => (ctx.view === 'notes' ? setGradeDlg({}) : setEditor({ task: null }))}><${Icon} name="plus" size=${26} stroke=${2.2} /></button>` : null}
    ${editor ? html`<${TaskEditor} ctx=${ctx} task=${editor.task} defaults=${editor.defaults} onClose=${() => setEditor(null)} />` : null}
    ${gradeDlg ? html`<${GradeDialog} ctx=${ctx} init=${gradeDlg} onClose=${() => setGradeDlg(null)} />` : null}
    <${Toasts} toasts=${toasts} dismiss=${dismiss} />`;
}

render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* hors HTTPS : pas d'installation */ });
}
