// Vocabulaire commun de l'appli : types de tâches, statuts, aides.
import { daysBetween } from './dates.js';

export const KINDS = {
  partiel_cc: { label: 'Partiel · CC', short: 'CC', partiel: true },
  partiel_ct: { label: 'Partiel · CT', short: 'CT', partiel: true },
  tp: { label: 'TP à rendre', short: 'TP', partiel: false },
  exercice: { label: 'Exercice', short: 'Exo', partiel: false },
};
export const KIND_ORDER = ['partiel_cc', 'partiel_ct', 'tp', 'exercice'];

export const STATUS_LABEL = { a_faire: 'À faire', en_cours: 'En cours', rendu: 'Rendu', fait: 'Fait' };
export const SHARING = {
  shared: { label: 'Partagée', help: 'Visible par ton binôme, chacun garde son propre statut.' },
  duo: { label: 'Duo', help: 'Visible par ton binôme, statut commun : si l’un la coche, elle est cochée pour les deux.' },
  perso: { label: 'Perso', help: 'Visible par toi seul.' },
};

export const doneStatus = (kind) => (kind === 'tp' ? 'rendu' : 'fait');
export const isDone = (s) => s === 'rendu' || s === 'fait';

export function effStatus(task, statuses) {
  if (task.sharing === 'duo') return task.duo_status || 'a_faire';
  return statuses[task.id] || 'a_faire';
}

export function nextStatus(task, current) {
  if (current === 'a_faire') return 'en_cours';
  if (current === 'en_cours') return doneStatus(task.kind);
  return 'a_faire';
}

// Épreuve par défaut quand on saisit la note d'une tâche.
export function defaultComponent(task, sub) {
  const keys = (sub?.evals || []).map((e) => e.key);
  const want = task?.kind === 'partiel_ct' ? 'ct' : (keys.includes('cc') ? 'cc' : keys[0]);
  return keys.includes(want) ? want : keys[0];
}

export function sortTasks(list) {
  return [...list].sort((a, b) =>
    a.due_date.localeCompare(b.due_date) ||
    (a.due_time || '99').localeCompare(b.due_time || '99') ||
    a.title.localeCompare(b.title));
}

export function daysLeft(task, today) {
  return daysBetween(today, task.due_date);
}
