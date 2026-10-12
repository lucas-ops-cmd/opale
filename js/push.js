// Abonnement de l'appareil aux notifications (Web Push).

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyToBytes(b64) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(sub, keyBytes) {
  const k = sub?.options?.applicationServerKey;
  if (!k) return true;
  const a = new Uint8Array(k);
  return a.length === keyBytes.length && a.every((v, i) => v === keyBytes[i]);
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function enablePush(api) {
  if (!pushSupported()) throw new Error('Ce navigateur ne gère pas les notifications. Utilise Chrome.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Notifications bloquées : clique sur le cadenas à gauche de l’adresse › Notifications › Autoriser, puis réessaie.'
      : 'Autorisation refusée.');
  }
  const reg = await navigator.serviceWorker.ready;
  const { vapidPublicKey } = await api.callFunction('config');
  const key = keyToBytes(vapidPublicKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api.registerPush(sub);
  return sub;
}

export async function disablePush(api) {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await api.unregisterPush(sub.endpoint); } catch (_) { /* déjà supprimé */ }
  await sub.unsubscribe();
}
