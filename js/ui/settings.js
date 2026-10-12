import { html, useState, useEffect } from '../vendor/ui.js';
import { Icon, Switch } from './common.js';
import { VIEWS } from './views.js';
import { api, DEMO } from '../store.js';
import { pushSupported, currentSubscription, enablePush, disablePush } from '../push.js';
import { DEFAULT_CURRICULUM, validateCurriculum } from '../curriculum.js';

const hhmm = (t) => (t ? t.slice(0, 5) : '');

function Section({ title, icon, children }) {
  return html`<section class="glass panel" style=${{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <h2 style=${{ display: 'flex', alignItems: 'center', gap: '10px' }}>${icon ? html`<span style=${{ color: 'var(--accent)', display: 'flex' }}><${Icon} name=${icon} /></span>` : null}${title}</h2>
    ${children}
  </section>`;
}

export function SettingsView({ ctx }) {
  const p = ctx.profile;
  const save = (patch) => ctx.actions.saveProfile(patch);
  return html`
    <div class="page-head"><div><div class="kicker">${ctx.me.email}</div><h1 class="serif">Réglages</h1></div></div>
    <div class="cols">
      <div class="col-main" style=${{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <${NotificationSettings} ctx=${ctx} />
        <${Section} title="Binôme" icon="users"><${PartnerSettings} ctx=${ctx} /><//>
        <${Section} title="Affichage" icon="week">
          <div class="field"><span class="lbl">Thème</span>
            <div class="seg full" role="group" aria-label="Thème">
              ${[['dark', 'Sombre'], ['light', 'Clair'], ['auto', 'Automatique']].map(([k, l]) => html`<button aria-pressed=${p.theme === k ? 'true' : 'false'} onClick=${() => save({ theme: k })}>${l}</button>`)}
            </div></div>
          <div class="field"><span class="lbl">Vue à l’ouverture</span>
            <div class="seg full" role="group" aria-label="Vue à l’ouverture">
              ${VIEWS.map((v) => html`<button aria-pressed=${p.start_view === v.id ? 'true' : 'false'} onClick=${() => save({ start_view: v.id })}>${v.label}</button>`)}
            </div></div>
        <//>
      </div>
      <div class="col-side">
        <${Section} title="Compte" icon="lock"><${AccountSettings} ctx=${ctx} /><//>
        <${Section} title="Installer l’application" icon="download"><${InstallHelp} ctx=${ctx} /><//>
        <${Section} title="Avancé : matières et coefficients" icon="settings"><${CurriculumEditor} ctx=${ctx} /><//>
      </div>
    </div>`;
}

function NotificationSettings({ ctx }) {
  const p = ctx.profile;
  const [state, setState] = useState({ loading: true });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fn, setFn] = useState(null);

  const refresh = async () => {
    const sub = await currentSubscription().catch(() => null);
    setState({ loading: false, sub, perm: 'Notification' in window ? Notification.permission : 'unsupported' });
  };
  const checkFn = async () => {
    try {
      const s = await api.callFunction('status');
      setFn({ ok: true, ...s });
    } catch (e) { setFn({ ok: false, error: e.message }); }
  };
  useEffect(() => { refresh(); if (!DEMO) checkFn(); }, []);

  const run = async (f, okText) => {
    setBusy(true); setMsg(null);
    try { await f(); if (okText) setMsg({ ok: true, text: okText }); } catch (e) { setMsg({ ok: false, text: e.message || String(e) }); }
    setBusy(false); refresh(); if (!DEMO) checkFn();
  };

  const minutesAgo = fn?.lastTick ? Math.round((Date.now() - new Date(fn.lastTick).getTime()) / 60000) : null;
  return html`<${Section} title="Notifications" icon="bell">
    <div class="box">
      <div class="between">
        <div><div style=${{ fontWeight: 600 }}>Sur cet appareil</div>
          <div class="hint">${!pushSupported() ? 'Non pris en charge par ce navigateur : utilise Chrome.'
            : state.loading ? '…'
            : state.sub ? 'Activées : les rappels arriveront ici.'
            : state.perm === 'denied' ? 'Bloquées dans le navigateur (cadenas à gauche de l’adresse › Notifications).'
            : 'Désactivées.'}</div></div>
        ${pushSupported() ? (state.sub
          ? html`<div class="row" style=${{ flex: '0 0 auto' }}>
              <button class="btn small" disabled=${busy} onClick=${() => run(() => api.callFunction('test', {}, { auth: true }).then((r) => {
                if (!r.sent) throw new Error('Envoi échoué' + (r.errors?.length ? ' : ' + r.errors[0] : '.'));
              }), 'Notification de test envoyée.')}>Tester</button>
              <button class="btn small" disabled=${busy} onClick=${() => run(() => disablePush(api), 'Notifications désactivées sur cet appareil.')}>Désactiver</button></div>`
          : html`<button class="btn primary small" disabled=${busy || DEMO} onClick=${() => run(() => enablePush(api), 'Notifications activées. Clique sur « Tester » pour vérifier.')}>Activer</button>`) : null}
      </div>
      ${msg ? html`<div class=${msg.ok ? 'okmsg' : 'err'} role="status">${msg.text}</div>` : null}
      ${DEMO ? html`<div class="hint">Mode démo : les notifications fonctionneront une fois Supabase configuré (voir le guide).</div>` : null}
      ${!DEMO && fn ? html`<div class="hint">${fn.ok
        ? (minutesAgo != null && minutesAgo <= 3 ? html`<span style=${{ color: 'var(--ok)' }}>● </span>Planificateur actif (dernier passage il y a ${minutesAgo < 1 ? 'moins d’une minute' : minutesAgo + ' min'}).`
          : fn.lastTick ? html`<span style=${{ color: 'var(--warn)' }}>● </span>Planificateur silencieux depuis ${minutesAgo} min : vérifie le script SQL.`
          : html`<span style=${{ color: 'var(--warn)' }}>● </span>Planificateur pas encore démarré : active les notifications ci-dessus, il se lance dans la minute.`)
        : html`<span style=${{ color: 'var(--danger)' }}>● </span>${fn.error}`}</div>` : null}
      <div class="hint">Sur Windows, laisse Chrome tourner en arrière-plan (Paramètres de Chrome › Système › « Continuer à exécuter les applications en arrière-plan ») pour recevoir les rappels même fenêtre fermée.</div>
    </div>

    <div class="between">
      <div><div>Heure des rappels par défaut</div><div class="hint">Modifiable tâche par tâche</div></div>
      <input class="input" type="time" style=${{ width: '130px' }} value=${hhmm(p.reminder_time)} aria-label="Heure des rappels par défaut"
        onChange=${(e) => e.target.value && ctx.actions.saveProfile({ reminder_time: e.target.value })} />
    </div>
    <div class="between">
      <div><div>Premier rappel par défaut</div><div class="hint">Puis un rappel chaque jour jusqu’à J-1</div></div>
      <div class="stepper">
        <button aria-label="Moins" onClick=${() => ctx.actions.saveProfile({ default_remind_days: Math.max(1, p.default_remind_days - 1) })}>−</button>
        <span class="serif">J-${p.default_remind_days}</span>
        <button aria-label="Plus" onClick=${() => ctx.actions.saveProfile({ default_remind_days: Math.min(30, p.default_remind_days + 1) })}>+</button>
      </div>
    </div>
    <div class="between">
      <div><div>Récap du soir</div><div class="hint">Les tâches des 7 prochains jours, en une notification</div></div>
      <div style=${{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        ${p.recap_enabled ? html`<input class="input" type="time" style=${{ width: '130px' }} value=${hhmm(p.recap_time)} aria-label="Heure du récap"
          onChange=${(e) => e.target.value && ctx.actions.saveProfile({ recap_time: e.target.value })} />` : null}
        <${Switch} checked=${p.recap_enabled} onChange=${(v) => ctx.actions.saveProfile({ recap_enabled: v })} label="Récap du soir" />
      </div>
    </div>
  <//>`;
}

function PartnerSettings({ ctx }) {
  const [email, setEmail] = useState(ctx.profile.partner_email || '');
  const [msg, setMsg] = useState(null);
  const partner = ctx.partner;
  const saveEmail = async () => {
    setMsg(null);
    const v = email.trim().toLowerCase();
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setMsg({ ok: false, text: 'Adresse email invalide.' });
    if (v && v === ctx.me.email.toLowerCase()) return setMsg({ ok: false, text: 'C’est ta propre adresse.' });
    try { await ctx.actions.saveProfile({ partner_email: v || null }); setMsg({ ok: true, text: v ? 'Enregistré.' : 'Binôme retiré.' }); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  let status;
  if (!ctx.profile.partner_email) status = 'Aucun binôme pour l’instant. Saisis l’email de son compte Opale.';
  else if (partner?.linked) status = html`<span style=${{ color: 'var(--ok)' }}>● </span>Lié avec <strong>${partner.display_name || partner.email}</strong> : vos tâches partagées et duo sont synchronisées.`;
  else if (partner?.id) status = html`<span style=${{ color: 'var(--warn)' }}>● </span>En attente : ${partner.email} doit aussi saisir <strong>${ctx.me.email}</strong> dans ses réglages.`;
  else status = html`<span style=${{ color: 'var(--warn)' }}>● </span>Aucun compte Opale avec cet email pour l’instant. Ton binôme doit créer son compte, puis saisir <strong>${ctx.me.email}</strong>.`;
  return html`
    <div class="hint" style=${{ fontSize: '14px' }}>${status}</div>
    <div class="row" style=${{ alignItems: 'flex-end' }}>
      <div class="field" style=${{ flex: '3 1 220px' }}><label for="partner">Email de ton binôme</label>
        <input id="partner" class="input" type="email" value=${email} placeholder="prenom.nom@exemple.fr" onInput=${(e) => setEmail(e.target.value)} /></div>
      <button class="btn" style=${{ flex: '0 0 auto' }} onClick=${saveEmail}>Enregistrer</button>
    </div>
    ${msg ? html`<div class=${msg.ok ? 'okmsg' : 'err'}>${msg.text}</div>` : null}
    <div class="hint">Les tâches « Partagée » et « Duo » sont visibles par vous deux ; les tâches « Perso » et les notes restent privées.</div>`;
}

function AccountSettings({ ctx }) {
  const [name, setName] = useState(ctx.profile.display_name || '');
  return html`
    <div class="field"><label for="dname">Prénom affiché</label>
      <div class="row"><input id="dname" class="input" type="text" value=${name} onInput=${(e) => setName(e.target.value)} />
        <button class="btn" style=${{ flex: '0 0 auto' }} onClick=${() => ctx.actions.saveProfile({ display_name: name.trim() || null })}>OK</button></div></div>
    <div class="hint">Connecté en tant que ${ctx.me.email}${DEMO ? ' (démo)' : ''}.</div>
    <div class="row">
      <button class="btn" onClick=${() => api.signOut()}><${Icon} name="logout" size=${16} />Se déconnecter</button>
      ${DEMO ? html`<button class="btn" onClick=${() => { api.reset(); location.reload(); }}>Réinitialiser la démo</button>` : null}
    </div>`;
}

function InstallHelp({ ctx }) {
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  if (standalone) return html`<div class="hint" style=${{ fontSize: '14px' }}><span style=${{ color: 'var(--ok)' }}>● </span>Opale est installée sur cet appareil.</div>`;
  return html`
    ${ctx.installPrompt ? html`<button class="btn primary" onClick=${ctx.actions.install}><${Icon} name="download" size=${16} />Installer Opale</button>` : null}
    <div class="hint" style=${{ fontSize: '14px' }}>
      <strong>Sur l’ordinateur (Chrome)</strong> : icône « Installer » à droite de la barre d’adresse, ou menu ⋮ › Caster, enregistrer et partager › Installer la page en tant qu’application.<br />
      <strong>Sur Android (Chrome)</strong> : menu ⋮ › « Ajouter à l’écran d’accueil » › Installer.
    </div>`;
}

function CurriculumEditor({ ctx }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const custom = !!ctx.profile.curriculum;
  const start = () => { setText(JSON.stringify(ctx.curriculum, null, 2)); setMsg(null); setOpen(true); };
  const save = async () => {
    let cur;
    try { cur = JSON.parse(text); } catch (e) { return setMsg({ ok: false, text: 'JSON invalide : ' + e.message }); }
    const errors = validateCurriculum(cur);
    if (errors.length) return setMsg({ ok: false, text: errors.slice(0, 4).join(' ') });
    try { await ctx.actions.saveProfile({ curriculum: cur }); setMsg({ ok: true, text: 'MCC enregistrée.' }); setOpen(false); } catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const reset = async () => { await ctx.actions.saveProfile({ curriculum: null }); setMsg({ ok: true, text: 'MCC d’origine restaurée.' }); setOpen(false); };
  return html`
    <div class="hint" style=${{ fontSize: '14px' }}>${custom ? 'Tu utilises une MCC personnalisée.' : `MCC utilisée : ${DEFAULT_CURRICULUM.name} (2025/2026).`}
      Si un coefficient change, tu peux le corriger ici : matières, poids dans l’UE (%) et poids des épreuves (%).</div>
    ${open ? html`
      <textarea class="input" spellcheck="false" value=${text} onInput=${(e) => setText(e.target.value)} aria-label="MCC au format JSON"></textarea>
      <div class="row"><button class="btn primary" onClick=${save}>Enregistrer</button><button class="btn" onClick=${() => setOpen(false)}>Annuler</button></div>`
    : html`<div class="row"><button class="btn" onClick=${start}>Modifier la MCC</button>
        ${custom ? html`<button class="btn" onClick=${reset}>Revenir à l’originale</button>` : null}</div>`}
    ${msg ? html`<div class=${msg.ok ? 'okmsg' : 'err'}>${msg.text}</div>` : null}`;
}
