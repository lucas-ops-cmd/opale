// Maquette des enseignements : M2 MIAGE IAN voie Alternance (MCC 2025/2026).
// Structure : semestre → blocs → UE (ECTS) → matières (poids dans l'UE, en %) → épreuves (poids, en %).
// Ce fichier est la valeur par défaut ; chaque utilisateur peut la remplacer dans Réglages › Avancé.

const CC_CT = () => [
  { key: 'cc', label: 'CC', weight: 50 },
  { key: 'ct', label: 'CT', weight: 50 },
];

export const DEFAULT_CURRICULUM = {
  name: 'M2 MIAGE IAN · Alternance',
  semesters: [
    {
      id: 'S1',
      label: 'Semestre 1',
      blocs: [
        {
          id: 'ISI', label: 'Bloc ISI',
          ues: [
            { code: 'KMIF9AAU', label: "Architecture d'entreprise", ects: 3, color: '#7AA2FF', subs: [
              { code: 'KMIX9AA1', label: "Architecture d'entreprise", short: "Archi. d'entreprise", weight: 100, aliases: ["archi d'entreprise", 'architecture d entreprise', 'archi entreprise', 'archi'], evals: CC_CT() },
            ] },
            { code: 'KMIF9ABU', label: 'Cloud et DevOps', ects: 3, color: '#8EDCFF', subs: [
              { code: 'KMIX9AB1', label: 'Architectures Cloud', short: 'Archi. Cloud', weight: 50, aliases: ['cloud', 'architectures cloud', 'archi cloud'], evals: CC_CT() },
              { code: 'KMIX9AB2', label: 'Pilotage de projets DevOps', short: 'Pilotage DevOps', weight: 50, aliases: ['devops', 'pilotage'], evals: CC_CT() },
            ] },
            { code: 'KMIF9ACU', label: "Systèmes d'information décisionnels", ects: 3, color: '#FFC874', subs: [
              { code: 'KMIX9AC1', label: "Systèmes d'information décisionnels", short: 'SI décisionnels', weight: 100, aliases: ['sid', 'decisionnel', 'decisionnels', 'bi', 'olap', 'si decisionnel'], evals: CC_CT() },
            ] },
            { code: 'KMIF9AGU', label: 'Management et entrepreneuriat', ects: 3, color: '#E8B1FF', subs: [
              { code: 'KMIX9AG1', label: "Management d'équipe", short: "Management d'équipe", weight: 50, aliases: ['management', 'manag', 'management d equipe'], evals: CC_CT() },
              { code: 'KMIX9AG2', label: 'Projet professionnel et entrepreneuriat', short: 'Projet pro', weight: 50, aliases: ['projet pro', 'projet professionnel', 'entrepreneuriat'], evals: [
                { key: 'cp', label: 'CP', weight: 75 },
                { key: 'ct', label: 'CT', weight: 25 },
              ] },
            ] },
          ],
        },
        {
          id: 'STI', label: 'Bloc STI',
          ues: [
            { code: 'KMIF9ADU', label: 'Nouveaux paradigmes de la donnée', ects: 3, color: '#F5E27A', subs: [
              { code: 'KMIX9AD1', label: 'Nouveaux paradigmes de la donnée', short: 'Nouveaux paradigmes', weight: 100, aliases: ['paradigmes', 'paradigme', 'nouveaux paradigmes', 'nosql'], evals: CC_CT() },
            ] },
            { code: 'KMIF9AEU', label: "Intégration d'applications d'entreprise", ects: 3, color: '#B9AEFF', subs: [
              { code: 'KMIX9AE1', label: "Intégration d'applications d'entreprise", short: "Intégration d'applis", weight: 100, aliases: ['integration', 'integ', 'eai'], evals: CC_CT() },
            ] },
            { code: 'KMIF9AFU', label: 'Cybersécurité', ects: 3, color: '#F49AC1', subs: [
              { code: 'KMIX9AF1', label: 'Cybersécurité', short: 'Cybersécurité', weight: 100, aliases: ['cyber', 'cybersecurite', 'secu', 'securite'], evals: CC_CT() },
            ] },
            { code: 'KMIF9AHU', label: 'IA : apprentissage automatique', ects: 3, color: '#C3E88D', subs: [
              { code: 'KMIX9AH1', label: 'IA : apprentissage automatique', short: 'IA / Machine learning', weight: 100, aliases: ['ia', 'machine learning', 'ml', 'apprentissage', 'apprentissage automatique'], evals: CC_CT() },
            ] },
          ],
        },
        {
          id: 'SPE', label: 'Bloc SPE',
          ues: [
            { code: 'KMIF9AIU', label: 'Intelligence économique', ects: 3, color: '#7FD6C8', subs: [
              { code: 'KMIF9AIU', label: 'Intelligence économique', short: 'Intelligence éco.', weight: 100, aliases: ['intelligence economique', 'intelligence eco', 'intel eco', 'ie', 'veille'], evals: CC_CT() },
            ] },
            { code: 'KMIF9AJU', label: 'Marketing', ects: 3, color: '#FFB37A', subs: [
              { code: 'KMIF9AJU', label: 'Marketing', short: 'Marketing', weight: 100, aliases: ['marketing', 'mkt'], evals: CC_CT() },
            ] },
          ],
        },
      ],
    },
    {
      id: 'S2',
      label: 'Semestre 2',
      blocs: [
        {
          id: 'THEO', label: 'Bloc Théo',
          ues: [
            { code: 'KMIFAAEU', label: 'Informatique pervasive', ects: 3, color: '#8EDCFF', subs: [
              { code: 'KMIXAAE1', label: 'Informatique pervasive', short: 'Info. pervasive', weight: 100, aliases: ['pervasive', 'informatique pervasive', 'iot'], evals: CC_CT() },
            ] },
            { code: 'KMIFAABU', label: 'Valorisation, certification des données', ects: 3, color: '#C3E88D', subs: [
              { code: 'KMIXAAB1', label: 'Gestion de la confiance de la donnée', short: 'Confiance de la donnée', weight: 50, aliases: ['confiance', 'gestion de la confiance', 'certification'], evals: CC_CT() },
              { code: 'KMIXAAB2', label: 'Valorisation de la donnée', short: 'Valorisation', weight: 50, aliases: ['valorisation'], evals: CC_CT() },
            ] },
            { code: 'KMIFAADU', label: 'Gestion des contrats et avant-vente', ects: 3, color: '#FFC874', subs: [
              { code: 'KMIFAAD1', label: 'Gestion des contrats', short: 'Gestion des contrats', weight: 50, aliases: ['contrats', 'contrat', 'avant vente', 'avant-vente'], evals: CC_CT() },
              { code: 'KMIFAAD3', label: 'Droit des affaires numériques', short: 'Droit des affaires', weight: 50, aliases: ['droit', 'droit des affaires'], evals: CC_CT() },
            ] },
            { code: 'KMIFAACU', label: 'Méthodes analytiques pour le Big Data', ects: 3, color: '#B9AEFF', subs: [
              { code: 'KMIXAAC1', label: 'Méthodes analytiques pour le Big Data', short: 'Big Data', weight: 100, aliases: ['big data', 'bigdata', 'methodes analytiques', 'analytique'], evals: CC_CT() },
            ] },
          ],
        },
        {
          id: 'PRO', label: 'Bloc Pro',
          ues: [
            { code: 'KMIFAAAU', label: 'Professionnalisation et stage', ects: 18, color: '#F49AC1', subs: [
              { code: 'KMIXAAA1', label: 'Mission en entreprise', short: 'Mission en entreprise', weight: 100, aliases: ['mission', 'mission en entreprise', 'alternance', 'entreprise'], evals: [
                { key: 'rapport', label: 'Rapport', weight: 50 },
                { key: 'soutenance', label: 'Soutenance', weight: 25 },
                { key: 'tuteur', label: 'Évaluation tuteur', weight: 25 },
              ] },
            ] },
          ],
        },
      ],
    },
  ],
};

export const OTHER_SUBJECT = { code: 'AUTRE', label: 'Autre', short: 'Autre', color: '#ABAAC2', aliases: [] };

// Liste à plat des matières (pour les menus, les couleurs, la saisie rapide).
export function flattenSubjects(cur) {
  const out = [];
  for (const sem of cur.semesters) {
    for (const bloc of sem.blocs) {
      for (const ue of bloc.ues) {
        for (const sub of ue.subs) {
          out.push({
            code: sub.code,
            label: sub.label,
            short: sub.short || sub.label,
            color: sub.color || ue.color || '#ABAAC2',
            aliases: sub.aliases || [],
            evals: sub.evals,
            semester: sem.id,
            semesterLabel: sem.label,
            bloc: bloc.id,
            blocLabel: bloc.label,
            ue: ue.code,
            ueLabel: ue.label,
          });
        }
      }
    }
  }
  return out;
}

// Vérifie une MCC saisie à la main (Réglages › Avancé). Renvoie une liste d'erreurs (vide si OK).
export function validateCurriculum(cur) {
  const errors = [];
  if (!cur || !Array.isArray(cur.semesters) || cur.semesters.length === 0) {
    return ['Il faut au moins un semestre (clé "semesters").'];
  }
  const codes = new Set();
  for (const sem of cur.semesters) {
    if (!sem.id || !sem.label) errors.push('Chaque semestre a besoin de "id" et "label".');
    if (!Array.isArray(sem.blocs) || !sem.blocs.length) { errors.push(`${sem.label || sem.id} : aucun bloc.`); continue; }
    for (const bloc of sem.blocs) {
      if (!bloc.id || !bloc.label) errors.push('Chaque bloc a besoin de "id" et "label".');
      if (!Array.isArray(bloc.ues) || !bloc.ues.length) { errors.push(`${bloc.label || bloc.id} : aucune UE.`); continue; }
      for (const ue of bloc.ues) {
        if (!(ue.ects > 0)) errors.push(`${ue.label || ue.code} : "ects" doit être > 0.`);
        if (!Array.isArray(ue.subs) || !ue.subs.length) { errors.push(`${ue.label || ue.code} : aucune matière.`); continue; }
        const sw = ue.subs.reduce((s, x) => s + (Number(x.weight) || 0), 0);
        if (Math.abs(sw - 100) > 0.01) errors.push(`${ue.label} : les poids des matières font ${sw} % au lieu de 100 %.`);
        for (const sub of ue.subs) {
          if (!sub.code || !sub.label) errors.push('Chaque matière a besoin de "code" et "label".');
          if (codes.has(sub.code)) errors.push(`Code de matière en double : ${sub.code}.`);
          codes.add(sub.code);
          if (!Array.isArray(sub.evals) || !sub.evals.length) { errors.push(`${sub.label} : aucune épreuve.`); continue; }
          const ew = sub.evals.reduce((s, e) => s + (Number(e.weight) || 0), 0);
          if (Math.abs(ew - 100) > 0.01) errors.push(`${sub.label} : les épreuves font ${ew} % au lieu de 100 %.`);
          const keys = new Set();
          for (const e of sub.evals) {
            if (!e.key || !e.label) errors.push(`${sub.label} : chaque épreuve a besoin de "key" et "label".`);
            if (keys.has(e.key)) errors.push(`${sub.label} : épreuve en double (${e.key}).`);
            keys.add(e.key);
          }
        }
      }
    }
  }
  return errors;
}
