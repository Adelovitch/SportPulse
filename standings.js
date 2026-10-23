'use strict';
(function(){
 const el=id=>document.getElementById(id),selector=el('standingsLeague'),body=el('standingsBody'),status=el('standingsStatus'),updated=el('standingsUpdated');
 const make=(tag,value)=>{const n=document.createElement(tag);n.textContent=String(value);return n;};
 const label=name=>name==='Bundesliga'?'Bundesliga · 1re division':name==='2. Bundesliga'?'2. Bundesliga · 2e division':name;
 const sportSelect=el('standingsSport'),footballPanel=el('footballStandingsContent'),f1Panel=el('f1-championnat'),basketPanel=el('basketStandingsContent'),leagueLabel=el('standingsLeagueLabel');
 let leagues={};
 let pendingCompetition=null;
 function showSport(){
  const discipline=sportSelect.value;
  footballPanel.hidden=discipline!=='Football';
  f1Panel.hidden=discipline!=='Formule 1';
  basketPanel.hidden=discipline!=='Basketball';
  leagueLabel.hidden=discipline!=='Football';
  if(discipline==='Football')render();
  else status.textContent=discipline==='Formule 1'?'Classements pilotes et constructeurs fournis par Jolpica-F1.':'Classement NBA indisponible via la source actuelle.';
  if(discipline!=='Football')updated.textContent='';
 }
 document.addEventListener('sportpulse:filters',event=>{
  const {sport,competition}=event.detail||{};
  if(sport==='Football'||sport==='Formule 1'||sport==='Basketball'){
   sportSelect.value=sport;
   if(sport==='Football'&&competition&&competition!=='all'){
    pendingCompetition=competition;
    if(leagues[competition])selector.value=competition;
    else {
     const missingOption=document.createElement('option');missingOption.value=competition;missingOption.textContent=competition+' · classement indisponible';
     const existing=[...selector.options].find(o=>o.value===competition);
     if(!existing)selector.append(missingOption);
     selector.value=competition;
    }
   }
   showSport();
  }
 });
 sportSelect.addEventListener('change',showSport);
 function render(){
  body.replaceChildren();
  const league=leagues[selector.value];
  if(!league){status.textContent='Pas de classement disponible pour cette compétition.';updated.textContent='';return;}
  status.textContent=league.scope;
  const t=Date.parse(league.updatedAt||'');
  updated.textContent=(Number.isFinite(t)?'Dernière collecte : '+new Date(t).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'}):'Date de collecte indisponible')+' · Source : '+league.provider;
  for(const [i,team] of league.teams.entries()){
   const tr=document.createElement('tr');
   const position=team.rank??i+1;
   tr.append(make('td',position));
   const nameCell=document.createElement('td');
   const link=make('button',team.team);link.type='button';link.className='teamProfileLink';link.title='Afficher la fiche de '+team.team;
   link.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('sportpulse:team',{detail:{team,competition:selector.value,position,provider:league.provider}})));
   if(typeof team.logo==='string'){try{const url=new URL(team.logo);if(url.protocol==='https:'){const img=document.createElement('img');img.className='standingsLogo';img.src=url.href;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});nameCell.append(img);}}catch{}}
   nameCell.append(link);tr.append(nameCell);
   [team.played,team.won,team.drawn,team.lost,team.goalDifference,team.points].forEach(v=>tr.append(make('td',v??'—')));
   const form=document.createElement('td');form.className='formCell';
   if(Array.isArray(team.form)&&team.form.length){
    team.form.forEach(entry=>{const badge=make('span',entry.outcome);badge.className='formItem '+(entry.outcome==='V'?'formWin':entry.outcome==='D'?'formLoss':'formDraw');badge.title=entry.opponent+' : '+entry.goalsFor+'–'+entry.goalsAgainst;form.append(badge);});
   }else form.textContent='—';
   tr.append(form);body.append(tr);
  }
 }
 const load=file=>fetch(file,{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error(file+' unavailable');return r.json();});
 Promise.allSettled([load('./data/analytics.json'),load('./data/football_data.json')]).then(results=>{
  const local=results[0].status==='fulfilled'?results[0].value:null;
  const international=results[1].status==='fulfilled'?results[1].value:null;
  if(local?.source==='OpenLigaDB'&&local.leagues){
   for(const [name,v] of Object.entries(local.leagues)){
    if(Array.isArray(v.teams))leagues[name]={teams:v.teams,scope:v.scope||'Classement calculé par SportPulse (non officiel).',updatedAt:local.updatedAt,provider:'OpenLigaDB / SportPulse'};
   }
  }
  if(international?.source==='football-data.org'&&international.tables){
   for(const [name,teams] of Object.entries(international.tables)){
    if(Array.isArray(teams)&&teams.length)leagues[name]={teams,scope:'Classement fourni par football-data.org. La forme récente des équipes n’est pas disponible dans cette source.',updatedAt:international.updatedAt,provider:'football-data.org'};
   }
  }
  const names=Object.keys(leagues).sort((a,b)=>a.localeCompare(b,'fr'));
  if(!names.length)throw Error('No tables');
  const selected=pendingCompetition||selector.value;
  selector.replaceChildren();
  names.forEach(name=>{const option=make('option',label(name));option.value=name;selector.append(option);});
  if(selected&&!names.includes(selected)&&pendingCompetition){const option=make('option',selected+' · classement indisponible');option.value=selected;selector.append(option);}
  selector.value=[...selector.options].some(o=>o.value===selected)?selected:(names.includes('Ligue 1')?'Ligue 1':names[0]);
  showSport();
 }).catch(()=>{
  selector.replaceChildren(make('option','Données indisponibles'));
  body.replaceChildren();status.textContent='Classements momentanément indisponibles.';updated.textContent='';
 });
 selector.addEventListener('change',()=>{pendingCompetition=null;render();});
})();
