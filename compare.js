'use strict';
(function(){
 const el=id=>document.getElementById(id);
 const league=el('compareLeague'),left=el('compareTeamA'),right=el('compareTeamB'),table=el('compareBody'),note=el('compareNote');
 const discipline=el('compareSport'),footballPanel=el('compareFootballPanel'),otherPanel=el('compareOtherPanel'),leagueLabel=el('compareLeagueLabel');
 let leagues={},fixtures=[],pendingLeague=null,loaded=false;
 function showDiscipline(){
  const isFootball=discipline.value==='Football';
  footballPanel.hidden=!isFootball;otherPanel.hidden=isFootball;
  leagueLabel.hidden=!isFootball;
  document.querySelectorAll('.compareFootballOnly').forEach(node=>{node.hidden=!isFootball;});
  if(isFootball){if(loaded)populate();return;}
  document.dispatchEvent(new CustomEvent('sportpulse:compare-multisport',{detail:{sport:discipline.value}}));
  note.textContent='Analyse descriptive des données disponibles, sans prédictions.';
 }
 document.addEventListener('sportpulse:filters',event=>{
  const selectedSport=event.detail?.sport,selectedLeague=event.detail?.competition;
  if(!['Football','Formule 1','Basketball'].includes(selectedSport))return;
  discipline.value=selectedSport;
  if(selectedSport==='Football'&&selectedLeague&&selectedLeague!=='all'){
   pendingLeague=selectedLeague;
   if(loaded){
    if(![...league.options].some(o=>o.value===selectedLeague))league.append(option(selectedLeague+' · classement indisponible',selectedLeague));
    league.value=selectedLeague;
   }
  }
  showDiscipline();
 });
 discipline.addEventListener('change',showDiscipline);
 const load=file=>fetch(file,{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('missing');return r.json();});
 const option=(label,value)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 const fmt=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
 const num=v=>v===null||v===undefined?NaN:Number(v);
 const avg=(team,field)=>num(team.played)>0?num(team[field])/num(team.played):NaN;
 const percent=team=>num(team.played)>0?100*num(team.won)/num(team.played):NaN;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]/g,'');
 const finished=m=>m.status==='FINISHED'&&/^\d+\s*[–-]\s*\d+$/.test(m.score||'');
 const parsed=m=>m.score.split(/\s*[–-]\s*/).map(Number);
 const matching=(name,m)=>norm(name)===norm(m.home)||norm(name)===norm(m.away);
 const record=(team,side)=>{
  const arr=fixtures.filter(m=>m.competition===league.value&&finished(m)&&matching(team.team,m)&&(side==='home'?norm(team.team)===norm(m.home):norm(team.team)===norm(m.away)));
  let wins=0,draws=0,losses=0;
  for(const m of arr){const [h,a]=parsed(m),forUs=side==='home'?h:a,against=side==='home'?a:h;if(forUs>against)wins++;else if(forUs===against)draws++;else losses++;}
  return arr.length?wins+' V · '+draws+' N · '+losses+' D ('+arr.length+' matchs)':'—';
 };
 const pairings=(a,b)=>fixtures.filter(m=>m.competition===league.value&&(matching(a.team,m)&&matching(b.team,m))).sort((x,y)=>Date.parse(y.utcDate)-Date.parse(x.utcDate));
 function populate(){
  const teams=leagues[league.value]?.teams||[];
  const priorA=left.selectedIndex>=0?left.value:null,priorB=right.selectedIndex>=0?right.value:null;
  left.replaceChildren();right.replaceChildren();
  teams.forEach((t,i)=>{left.append(option(t.team,String(i)));right.append(option(t.team,String(i)));});
  if(teams.length){
   left.value=priorA!==null&&Number(priorA)>=0&&Number(priorA)<teams.length?priorA:'0';
   right.value=priorB!==null&&Number(priorB)>=0&&Number(priorB)<teams.length&&priorB!==left.value?priorB:String(Math.min(1,teams.length-1));
  }
  render();
 }
 function render(){
  table.replaceChildren();
  const info=leagues[league.value],teams=info?.teams||[];
  if(!teams.length){note.textContent='Classements non disponibles pour cette compétition.';return;}
  if(left.value===right.value){note.textContent='Choisissez deux équipes différentes.';return;}
  const a=teams[Number(left.value)],b=teams[Number(right.value)];
  if(!a||!b)return;
  const rows=[
   ['Classement',a.rank??teams.indexOf(a)+1,b.rank??teams.indexOf(b)+1],
   ['Points',a.points,b.points],
   ['Matchs joués',a.played,b.played],
   ['Victoires',a.won,b.won],['Nuls',a.drawn,b.drawn],['Défaites',a.lost,b.lost],
   ['Taux de victoires',fmt(percent(a))+' %',fmt(percent(b))+' %'],
   ['Buts marqués',a.gf,b.gf],['Buts encaissés',a.ga,b.ga],
   ['Différence de buts',a.goalDifference,b.goalDifference],
   ['Buts marqués / match',fmt(avg(a,'gf')),fmt(avg(b,'gf'))],
   ['Buts encaissés / match',fmt(avg(a,'ga')),fmt(avg(b,'ga'))],
   ['Forme (5 derniers)',form(a),form(b)],
   ['Domicile (extrait)',record(a,'home'),record(b,'home')],
   ['Extérieur (extrait)',record(a,'away'),record(b,'away')]
  ];
  const head=document.createElement('tr');
  [a.team,'Indicateur',b.team].forEach(v=>{const th=document.createElement('th');th.textContent=v;head.append(th);});
  table.append(head);
  rows.forEach(([label,x,y])=>{const tr=document.createElement('tr');[x??'—',label,y??'—'].forEach((v,i)=>{const td=document.createElement('td');td.textContent=String(v);if(i===1)td.className='compareMetric';tr.append(td);});table.append(tr);});
  const meetings=pairings(a,b),played=meetings.filter(finished),next=meetings.filter(m=>!finished(m)&&Date.parse(m.utcDate)>=Date.now()-3600000).sort((x,y)=>Date.parse(x.utcDate)-Date.parse(y.utcDate));
  const formatDate=d=>new Date(d).toLocaleDateString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',year:'numeric'});
  const h2h=document.getElementById('compareH2H');
  h2h.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='Confrontations directes — matchs collectés';h2h.append(heading);
  if(!played.length&&!next.length){const p=document.createElement('p');p.textContent='Aucune confrontation disponible dans la fenêtre actuellement collectée.';h2h.append(p);}
  for(const m of [...played.slice(0,5),...next.slice(0,2)]){
   const row=document.createElement('div');row.className='teamFixture';
   const time=document.createElement('span');time.textContent=formatDate(m.utcDate);
   const fixture=document.createElement('strong');fixture.textContent=m.home+' '+(finished(m)?m.score:'—')+' '+m.away;
   row.append(time,fixture);h2h.append(row);
  }
  note.textContent='Les bilans domicile/extérieur et confrontations directes utilisent les résultats conservés dans l’historique SportPulse et les rencontres disponibles. L’historique commence avec les données effectivement récupérées et reste incomplet pour les saisons antérieures. Comparaison descriptive des chiffres du classement ('+info.provider+'). Le classement allemand est calculé et non officiel. Les cinq derniers résultats ne sont montrés que si la source les fournit. Aucune probabilité de victoire n’est déduite de cette comparaison.';
 }
 const form=t=>Array.isArray(t.form)&&t.form.length?t.form.map(x=>x.outcome).join(' · '):'Non disponible';
 Promise.allSettled([load('./data/analytics.json'),load('./data/football_data.json'),load('./data/matches.json'),load('./data/history.json')]).then(results=>{
  const local=results[0].status==='fulfilled'?results[0].value:null;
  const intl=results[1].status==='fulfilled'?results[1].value:null;
  if(local?.source==='OpenLigaDB')Object.entries(local.leagues||{}).forEach(([name,v])=>{if(v.teams?.length)leagues[name]={teams:v.teams,provider:'OpenLigaDB / SportPulse'};});
  if(intl?.source==='football-data.org')Object.entries(intl.tables||{}).forEach(([name,teams])=>{if(teams?.length)leagues[name]={teams,provider:'football-data.org'};});
  const localMatches=results[2].status==='fulfilled'?results[2].value:null;
  const history=results[3].status==='fulfilled'?results[3].value:null;
  const all=[...(history?.source==='SportPulse'&&Array.isArray(history.matches)?history.matches:[]),...(intl?.source==='football-data.org'&&Array.isArray(intl.matches)?intl.matches:[]),...(localMatches?.source==='OpenLigaDB'&&Array.isArray(localMatches.matches)?localMatches.matches:[])];
  fixtures=[...new Map(all.filter(m=>m&&m.id).map(m=>[m.id,m])).values()];
  const names=Object.keys(leagues).sort((a,b)=>a.localeCompare(b,'fr'));
  league.replaceChildren();
  names.forEach(name=>league.append(option(name,name)));
  if(!names.length){note.textContent='Données de comparaison momentanément indisponibles.';return;}
  if(pendingLeague&&!names.includes(pendingLeague))league.append(option(pendingLeague+' · classement indisponible',pendingLeague));
  league.value=pendingLeague|| (names.includes('Ligue 1')?'Ligue 1':names[0]);loaded=true;showDiscipline();
 }).catch(()=>{note.textContent='Données de comparaison momentanément indisponibles.';});
 league.addEventListener('change',()=>{pendingLeague=null;left.value='0';right.value='1';populate();});
 left.addEventListener('change',render);right.addEventListener('change',render);
})();
