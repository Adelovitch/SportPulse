'use strict';
(function(){
 const el=id=>document.getElementById(id);
 const league=el('compareLeague'),left=el('compareTeamA'),right=el('compareTeamB'),table=el('compareBody'),note=el('compareNote');
 let leagues={};
 const load=file=>fetch(file,{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('missing');return r.json();});
 const option=(label,value)=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;};
 const fmt=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
 const num=v=>v===null||v===undefined?NaN:Number(v);
 const avg=(team,field)=>num(team.played)>0?num(team[field])/num(team.played):NaN;
 const percent=team=>num(team.played)>0?100*num(team.won)/num(team.played):NaN;
 function populate(){
  const teams=leagues[league.value]?.teams||[];
  const priorA=left.value,priorB=right.value;
  left.replaceChildren();right.replaceChildren();
  teams.forEach((t,i)=>{left.append(option(t.team,String(i)));right.append(option(t.team,String(i)));});
  if(teams.length){
   left.value=Number(priorA)>=0&&Number(priorA)<teams.length?priorA:'0';
   right.value=Number(priorB)>=0&&Number(priorB)<teams.length&&priorB!==left.value?priorB:String(Math.min(1,teams.length-1));
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
   ['Forme (5 derniers)',form(a),form(b)]
  ];
  const head=document.createElement('tr');
  [a.team,'Indicateur',b.team].forEach(v=>{const th=document.createElement('th');th.textContent=v;head.append(th);});
  table.append(head);
  rows.forEach(([label,x,y])=>{const tr=document.createElement('tr');[x??'—',label,y??'—'].forEach((v,i)=>{const td=document.createElement('td');td.textContent=String(v);if(i===1)td.className='compareMetric';tr.append(td);});table.append(tr);});
  note.textContent='Comparaison descriptive des chiffres du classement ('+info.provider+'). Le classement allemand est calculé et non officiel. Les cinq derniers résultats ne sont montrés que si la source les fournit. Aucune probabilité de victoire n’est déduite de cette comparaison.';
 }
 const form=t=>Array.isArray(t.form)&&t.form.length?t.form.map(x=>x.outcome).join(' · '):'Non disponible';
 Promise.allSettled([load('./data/analytics.json'),load('./data/football_data.json')]).then(results=>{
  const local=results[0].status==='fulfilled'?results[0].value:null;
  const intl=results[1].status==='fulfilled'?results[1].value:null;
  if(local?.source==='OpenLigaDB')Object.entries(local.leagues||{}).forEach(([name,v])=>{if(v.teams?.length)leagues[name]={teams:v.teams,provider:'OpenLigaDB / SportPulse'};});
  if(intl?.source==='football-data.org')Object.entries(intl.tables||{}).forEach(([name,teams])=>{if(teams?.length)leagues[name]={teams,provider:'football-data.org'};});
  const names=Object.keys(leagues).sort((a,b)=>a.localeCompare(b,'fr'));
  league.replaceChildren();
  names.forEach(name=>league.append(option(name,name)));
  if(!names.length){note.textContent='Données de comparaison momentanément indisponibles.';return;}
  league.value=names.includes('Ligue 1')?'Ligue 1':names[0];populate();
 }).catch(()=>{note.textContent='Données de comparaison momentanément indisponibles.';});
 league.addEventListener('change',()=>{left.value='0';right.value='1';populate();});
 left.addEventListener('change',render);right.addEventListener('change',render);
})();
