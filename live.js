'use strict';
// Affiche uniquement les données réelles fournies par notre backend Cloudflare.
(function () {
  const status = document.getElementById('liveStatus');
  const target = document.getElementById('liveMatches');
  const stamp = document.getElementById('liveUpdated');
  const source = document.getElementById('liveSource');
  const endpoint = String(window.SPORTPULSE_API_URL || '').replace(/\/+$/, '');
  if (!endpoint || !/^https:\/\//i.test(endpoint)) {
    status.textContent = 'Source réelle non configurée : consultez le README. Les rencontres plus bas sont fictives.';
    return;
  }
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 9000);
  fetch(endpoint + '/api/matches', { signal: ctrl.signal })
    .then(async response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); })
    .then(payload => {
      if (!payload || !Array.isArray(payload.matches) || payload.source !== 'football-data.org') throw Error('Format inattendu');
      status.textContent = payload.stale ? 'Données en cache : une actualisation a échoué.' : 'Résultats récupérés auprès de la source indiquée.';
      stamp.textContent = payload.updatedAt ? 'Dernière collecte : ' + new Date(payload.updatedAt).toLocaleString('fr-FR', {timeZone:'Europe/Paris'}) : 'Heure de collecte inconnue';
      source.textContent = 'Data provided by football-data.org';
      target.replaceChildren();
      if (!payload.matches.length) { target.appendChild(make('p','','Aucun match dans la fenêtre couverte par cette source.')); return; }
      payload.matches.slice(0,80).forEach(match => {
        const card=make('article','match');
        const top=make('div','matchtop');
        top.append(make('span','',match.competition || 'Compétition'),make('span','',match.utcDate ? new Date(match.utcDate).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}) : 'Horaire inconnu'));
        const teams=make('div','teams');teams.append(make('span','',match.home||'Équipe inconnue'),make('strong','',match.score||'–'),make('span','',match.away||'Équipe inconnue'));
        const bottom=make('div','matchbottom');bottom.append(make('span','',match.status||'Statut indisponible'),make('span','tag','Football'));
        card.append(top,teams,bottom);target.append(card);
      });
    }).catch(() => { status.textContent='Résultats réels indisponibles. Aucun score fictif n’est présenté comme réel.'; })
    .finally(() => clearTimeout(timeout));
  function make(tag, cls, text) { const e=document.createElement(tag); if(cls)e.className=cls; if(text!==undefined)e.textContent=String(text);return e; }
})();
