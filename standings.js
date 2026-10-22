'use strict';
(function(){
 const el=id=>document.getElementById(id), selector=el('standingsLeague'),body=el('standingsBody'),status=el('standingsStatus'),updated=el('standingsUpdated');
 let data=null;
 const make=(tag,value)=>{const node=document.createElement(tag);node.textContent=String(value);return node;};
 function render(){
   body.replaceChildren();
   const league=data?.leagues?.[selector.value];
   if(!league){status.textContent='Pas de classement disponible pour cette compétition.';return;}
   status.textContent=league.scope||'Classement calculé, non officiel.';
   league.teams.forEach((team,i)=>{
     const tr=document.createElement('tr');
     const values=[i+1,team.team,team.played,team.won,team.drawn,team.lost,team.goalDifference,team.points];
     values.forEach(v=>tr.append(make('td',v)));
     const form=document.createElement('td');form.className='formCell';
     (team.form||[]).forEach(entry=>{
       const badge=make('span',entry.outcome);badge.className='formItem '+(entry.outcome==='V'?'formWin':entry.outcome==='D'?'formLoss':'formDraw');
       badge.title=entry.opponent+' : '+entry.goalsFor+'–'+entry.goalsAgainst;
       form.append(badge);
     });
     tr.append(form);body.append(tr);
   });
 }
 fetch('./data/analytics.json',{cache:'no-cache'})
   .then(async response=>{if(!response.ok)throw Error('Not yet collected');return response.json();})
   .then(payload=>{
      if(payload?.source!=='OpenLigaDB'||!payload.leagues)throw Error('Invalid data');
      data=payload;selector.replaceChildren();
      Object.keys(data.leagues).sort((a,b)=>a.localeCompare(b,'fr')).forEach(name=>{
         const option=make('option',name==='Bundesliga'?'Bundesliga · 1re division':name==='2. Bundesliga'?'2. Bundesliga · 2e division':name);option.value=name;selector.append(option);
      });
      if(data.leagues.Bundesliga)selector.value='Bundesliga';
      const date=Date.parse(data.updatedAt||'');
      updated.textContent=Number.isFinite(date)?'Statistiques mises à jour : '+new Date(date).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'}):'Actualisation non datée';
      render();
   }).catch(()=>{selector.replaceChildren(make('option','Données indisponibles'));status.textContent='Les statistiques apparaîtront après la première collecte réussie.';updated.textContent='';});
 selector.addEventListener('change',render);
})();
