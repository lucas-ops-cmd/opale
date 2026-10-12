// Accès aux données : Supabase en vrai, ou stockage local en « mode démo »
// (quand config.js n'est pas encore rempli).
import { createClient } from './vendor/supabase.js';
import { addDays, todayISO } from './dates.js';

const CFG = self.OPALE_CONFIG || {};
export const DEMO = !CFG.supabaseUrl || !CFG.supabaseKey;
const FN_URL = DEMO ? null : `${CFG.supabaseUrl.replace(/\/$/, '')}/functions/v1/notify`;

const PROFILE_DEFAULTS = {
  partner_email: null, reminder_time: '20:30:00', default_remind_days: 7, recap_enabled: true,
  recap_time: '20:30:00', timezone: 'Europe/Paris', theme: 'dark', start_view: 'semaine', curriculum: null,
};

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
function supabaseBackend() {
  const sb = createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  const check = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  let session = null;

  return {
    demo: false,
    async getSession() {
      const { data } = await sb.auth.getSession();
      session = data.session;
      return session;
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((_e, s) => { session = s; cb(s); });
    },
    async signInGoogle() {
      const redirectTo = location.origin + location.pathname;
      check(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }));
    },
    async signIn(email, password) { check(await sb.auth.signInWithPassword({ email, password })); },
    async signUp(email, password, name) {
      const data = check(await sb.auth.signUp({
        email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin + location.pathname },
      }));
      return { needsConfirmation: !data.session };
    },
    async resetPassword(email) {
      check(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
    },
    async signOut() { await sb.auth.signOut(); },

    async loadAll() {
      const uid = session.user.id;
      const [profile, tasks, statuses, grades, partner] = await Promise.all([
        sb.from('profiles').select('*').eq('id', uid).maybeSingle().then(check),
        sb.from('tasks').select('*').order('due_date').then(check),
        sb.from('task_status').select('task_id, status').eq('user_id', uid).then(check),
        sb.from('grades').select('*').order('created_at').then(check),
        sb.rpc('get_partner').then(check),
      ]);
      let prof = profile;
      if (!prof) {
        prof = check(await sb.from('profiles').insert({
          id: uid, email: session.user.email.toLowerCase(),
          display_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        }).select().single());
      }
      return {
        me: { id: uid, email: session.user.email },
        profile: { ...PROFILE_DEFAULTS, ...prof },
        partner: (partner && partner[0]) || null,
        tasks,
        statuses: Object.fromEntries(statuses.map((s) => [s.task_id, s.status])),
        grades,
      };
    },
    async saveProfile(patch) {
      check(await sb.from('profiles').update(patch).eq('id', session.user.id));
    },
    async createTasks(rows) { return check(await sb.from('tasks').insert(rows).select()); },
    async updateTask(id, patch) { check(await sb.from('tasks').update(patch).eq('id', id)); },
    async deleteTask(id) { check(await sb.from('tasks').delete().eq('id', id)); },
    async deleteSeries(seriesId, fromDate) {
      check(await sb.from('tasks').delete().eq('series_id', seriesId).gte('due_date', fromDate).eq('owner_id', session.user.id));
    },
    async setStatus(task, status) {
      if (task.sharing === 'duo') check(await sb.from('tasks').update({ duo_status: status }).eq('id', task.id));
      else check(await sb.from('task_status').upsert({ task_id: task.id, user_id: session.user.id, status, updated_at: new Date().toISOString() }));
    },
    async addGrade(g) { return check(await sb.from('grades').insert(g).select().single()); },
    async updateGrade(id, patch) { check(await sb.from('grades').update(patch).eq('id', id)); },
    async deleteGrade(id) { check(await sb.from('grades').delete().eq('id', id)); },

    subscribe(onChange) {
      const ch = sb.channel('opale-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_status' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, onChange)
        .subscribe();
      return () => sb.removeChannel(ch);
    },

    async callFunction(action, body = {}, { auth = false } = {}) {
      const headers = { 'Content-Type': 'application/json', apikey: CFG.supabaseKey };
      if (auth && session) headers.Authorization = `Bearer ${session.access_token}`;
      let res;
      try {
        res = await fetch(FN_URL, { method: 'POST', headers, body: JSON.stringify({ action, ...body }) });
      } catch (e) {
        throw new Error('La fonction « notify » est injoignable. A-t-elle bien été déployée avec ce nom ?');
      }
      const txt = await res.text();
      let data = {};
      try { data = JSON.parse(txt); } catch (_) { data = { error: txt }; }
      if (res.status === 401 && !auth) {
        const err = new Error('La fonction « notify » refuse les appels : désactive « Verify JWT » dans ses réglages Supabase.');
        err.code = 'jwt';
        throw err;
      }
      if (res.status === 404 && !data.error) throw new Error('La fonction « notify » est introuvable. Vérifie son nom dans Supabase.');
      if (!res.ok) throw new Error(data.error || data.msg || data.message || `Erreur ${res.status}`);
      return data;
    },
    async registerPush(sub) {
      const j = sub.toJSON();
      check(await sb.rpc('register_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent }));
    },
    async unregisterPush(endpoint) {
      check(await sb.from('push_subscriptions').delete().eq('endpoint', endpoint));
    },
    async countPushDevices() {
      const data = check(await sb.from('push_subscriptions').select('id, user_agent, created_at'));
      return data;
    },
  };
}

// ---------------------------------------------------------------------------
// Mode démo (localStorage)
// ---------------------------------------------------------------------------
function demoBackend() {
  const KEY = 'opale-demo-v1';
  const ME = '00000000-0000-0000-0000-00000000000a';
  const BUDDY = '00000000-0000-0000-0000-00000000000b';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  let listeners = [];

  function seed() {
    const t = todayISO();
    const task = (o) => ({
      id: uuid(), owner_id: ME, subject: null, subject_label: null, due_time: null, sharing: 'shared', duo_status: 'a_faire',
      remind_days: 7, remind_time: null, recurrence: 'none', series_id: null, created_at: new Date().toISOString(), ...o,
    });
    const tasks = [
      task({ title: 'TP n°2', subject: 'KMIX9AF1', subject_label: 'Cybersécurité', kind: 'tp', due_date: addDays(t, 2), due_time: '23:59:00' }),
      task({ title: 'CC n°1', subject: 'KMIX9AB1', subject_label: 'Architectures Cloud', kind: 'partiel_cc', due_date: addDays(t, 3), due_time: '10:00:00', sharing: 'duo' }),
      task({ title: 'Exercices OLAP', subject: 'KMIX9AC1', subject_label: "Systèmes d'information décisionnels", kind: 'exercice', due_date: addDays(t, 4) }),
      task({ title: 'TP n°3', subject: 'KMIX9AH1', subject_label: 'IA : apprentissage automatique', kind: 'tp', due_date: addDays(t, 6), due_time: '23:59:00' }),
      task({ title: 'Étude de cas', subject: 'KMIF9AJU', subject_label: 'Marketing', kind: 'tp', due_date: addDays(t, 7), owner_id: BUDDY }),
      task({ title: 'Exercices DevOps', subject: 'KMIX9AB2', subject_label: 'Pilotage de projets DevOps', kind: 'exercice', due_date: addDays(t, 7), recurrence: 'weekly' }),
      task({ title: 'CC n°1', subject: 'KMIX9AE1', subject_label: "Intégration d'applications d'entreprise", kind: 'partiel_cc', due_date: addDays(t, 8) }),
      task({ title: 'Contrôle terminal', subject: 'KMIX9AD1', subject_label: 'Nouveaux paradigmes de la donnée', kind: 'partiel_ct', due_date: addDays(t, 63), due_time: '09:00:00' }),
      task({ title: 'Synthèse', subject: 'KMIF9AIU', subject_label: 'Intelligence économique', kind: 'tp', due_date: addDays(t, -2) }),
      task({ title: 'Exercices chapitre 2', subject: 'KMIX9AG1', subject_label: "Management d'équipe", kind: 'exercice', due_date: addDays(t, -1), sharing: 'perso' }),
    ];
    const statuses = { [tasks[0].id]: 'en_cours', [tasks[8].id]: 'rendu', [tasks[9].id]: 'fait' };
    const g = (subject, component, value, label) => ({ id: uuid(), user_id: ME, subject, component, value, weight: 1, label, task_id: null, created_at: new Date().toISOString() });
    const grades = [
      g('KMIX9AA1', 'cc', 13, 'CC'), g('KMIX9AB1', 'cc', 11, 'CC'), g('KMIX9AB2', 'cc', 14.5, 'CC'),
      g('KMIX9AC1', 'cc', 12, 'TP noté'), g('KMIX9AC1', 'cc', 9, 'CC n°1'), g('KMIX9AG1', 'cc', 15, 'CC'),
      g('KMIX9AG2', 'cp', 16, 'CP'), g('KMIX9AD1', 'cc', 9, 'CC'), g('KMIX9AE1', 'cc', 12, 'CC'),
      g('KMIX9AF1', 'cc', 7, 'TP n°1'), g('KMIX9AF1', 'cc', 10, 'CC n°1'),
      g('KMIF9AIU', 'cc', 14, 'CC'), g('KMIF9AJU', 'cc', 12.5, 'CC'),
    ];
    return {
      session: null,
      profile: { id: ME, email: 'moi@demo.fr', display_name: 'Moi', ...PROFILE_DEFAULTS, partner_email: 'binome@demo.fr' },
      tasks, statuses, grades,
    };
  }

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (_) { return seed(); } };
  let db = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) { /* stockage indisponible */ } listeners.forEach((f) => f()); };

  return {
    demo: true,
    async getSession() { return db.session; },
    onAuthChange(cb) { this._cb = cb; },
    async signInGoogle() { db.session = { user: { id: ME, email: db.profile.email } }; save(); this._cb?.(db.session); },
    async signIn() { return this.signInGoogle(); },
    async signUp() { await this.signInGoogle(); return { needsConfirmation: false }; },
    async resetPassword() {},
    async signOut() { db.session = null; save(); this._cb?.(null); },
    async loadAll() {
      return {
        me: { id: ME, email: db.profile.email },
        profile: db.profile,
        partner: db.profile.partner_email ? { id: BUDDY, email: db.profile.partner_email, display_name: 'Binôme (démo)', linked: true } : null,
        tasks: JSON.parse(JSON.stringify(db.tasks)),
        statuses: { ...db.statuses },
        grades: JSON.parse(JSON.stringify(db.grades)),
      };
    },
    async saveProfile(patch) { Object.assign(db.profile, patch); save(); },
    async createTasks(rows) {
      const created = rows.map((r) => ({ id: uuid(), owner_id: ME, duo_status: 'a_faire', created_at: new Date().toISOString(), ...r }));
      db.tasks.push(...created); save(); return created;
    },
    async updateTask(id, patch) { const t = db.tasks.find((x) => x.id === id); if (t) Object.assign(t, patch); save(); },
    async deleteTask(id) { db.tasks = db.tasks.filter((t) => t.id !== id); save(); },
    async deleteSeries(seriesId, fromDate) { db.tasks = db.tasks.filter((t) => !(t.series_id === seriesId && t.due_date >= fromDate)); save(); },
    async setStatus(task, status) {
      if (task.sharing === 'duo') { const t = db.tasks.find((x) => x.id === task.id); if (t) t.duo_status = status; }
      else db.statuses[task.id] = status;
      save();
    },
    async addGrade(g) { const row = { id: uuid(), user_id: ME, created_at: new Date().toISOString(), weight: 1, ...g }; db.grades.push(row); save(); return row; },
    async updateGrade(id, patch) { const g = db.grades.find((x) => x.id === id); if (g) Object.assign(g, patch); save(); },
    async deleteGrade(id) { db.grades = db.grades.filter((g) => g.id !== id); save(); },
    subscribe(cb) { listeners.push(cb); return () => { listeners = listeners.filter((f) => f !== cb); }; },
    async callFunction(action) {
      if (action === 'status') return { ok: true, configured: true, lastTick: new Date().toISOString(), demo: true };
      throw new Error('Les notifications nécessitent la connexion à Supabase (mode démo).');
    },
    async registerPush() { throw new Error('Mode démo : configure Supabase pour activer les notifications.'); },
    async unregisterPush() {},
    async countPushDevices() { return []; },
    reset() { db = seed(); db.session = { user: { id: ME, email: db.profile.email } }; save(); },
  };
}

export const api = DEMO ? demoBackend() : supabaseBackend();
