'use strict';
// Les scores proviennent d'un JSON statique créé par GitHub Actions. Aucun secret côté client.
(function () {
  const status = document.getElementById('liveStatus');
  const target = document.getElementById('liveMatches');
  const stamp = document.getElementById('liveUpdated');
  const source = document.getElementById('liveSource');
  const make = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content !== undefined) el.textContent = String(content);
    return el;
  };
  fetch('./data/matches.json', {cache:'no-cache'})
    .then(async res => {
      if (!res.ok) throw new Error('Snapshot absent');
      return res.json();
    })
    .then(data => {
      if (!data || data.source !== 'OpenLigaDB' || !Array.isArray(data.matches)) throw new Error('Format inattendu');
      const time = Date.parse(data.updatedAt || '');
      const age = Date.now() - time;
      const old = !Number.isFinite(time) || age > 12 * 3600 * 1000;
      status.textContent = old
        ? 'Résultats disponibles, mais dernière collecte ancienne. Vérifiez la date ci-dessous.'
        : 'Résultats disponibles — mise à jour périodique (non temps réel).';
      stamp.textContent = Number.isFinite(time)
        ? 'Dernière collecte : ' + new Date(time).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'})
        : 'Date de collecte non disponible';
      source.replaceChildren(make('span','','Source : '));
      const link = make('a','','OpenLigaDB');
      link.href = 'https://www.openligadb.de/';
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      source.append(link);
      target.replaceChildren();
      if (!data.matches.length) {
        target.append(make('p','','Aucune rencontre dans la période couverte par la collecte.'));
        return;
      }
      for (const match of data.matches) {
        const card = make('article','match');
        const top = make('div','matchtop');
        const dt = Date.parse(match.utcDate);
        const date = Number.isFinite(dt) ? new Date(dt).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}) : 'Horaire inconnu';
        top.append(make('span','',match.competition || 'Compétition'),make('span','',date));
        const teams = make('div','teams');
        teams.append(make('span','',match.home || 'Équipe inconnue'),
          make('strong','',match.score || '–'),make('span','',match.away || 'Équipe inconnue'));
        const bottom = make('div','matchbottom');
        bottom.append(make('span','',match.status === 'FINISHED' ? 'Terminé' : 'Prévu / en cours (statut non direct)'),
          make('span','tag','Football'));
        card.append(top,teams,bottom);
        target.append(card);
      }
    })
    .catch(() => {
      status.textContent = 'Données réelles non encore collectées ou momentanément indisponibles.';
      stamp.textContent = 'La collecte GitHub Actions doit être exécutée une première fois.';
      target.replaceChildren();
      source.textContent = 'Source prévue : OpenLigaDB';
    });
})();
