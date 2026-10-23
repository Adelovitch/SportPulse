'use strict';
(function(){
 const el=id=>document.getElementById(id);
 const mode=el('compareMode'),a=el('compareOtherA'),b=el('compareOtherB'),body=el('compareOtherBody'),note=el('compareOtherNote');
 if(!mode||!a||!b||!body||!note)return;
 let current='Football',standings=null,history=null,extras=null;
 const opt=(value,label)=>{const node=document.createElement('option');node.value=value;node.textContent=label;return node;};
 const numeric=value=>{if(value===null||value===undefined||value==='')return NaN;const n=Number(value);return Number.isFinite(n)?n:NaN;};
 const display=value=>Number.isFinite(value)?String(Math.round(value*100)/100):'—';
 const safeRows=(list)=>Array.isArray(list)?list.filter(x=>x&&typeof x==='object'):[];
 function selectedValues(select,items){
  const old=select.value;select.replaceChildren();
  for(const item of items)select.append(opt(item,item));
  select.value=items.includes(old)?old:(items[0]||'');
 }
 function table(leftName,rightName,rows){
  body.replaceChildren();
  const head=document.createElement('tr');
  for(const title of [leftName,'Indicateur',rightName]){const th=document.createElement('th');th.textContent=title;head.append(th);}body.append(head);
  for(const [name,left,right] of rows){
   const tr=document.createElement('tr');
   for(const [i,value] of [left,name,right].entries()){const td=document.createElement('td');td.textContent=String(value??'—');if(i===1)td.className='compareMetric';tr.append(td);}body.append(tr);
  }
 }
 function f1(){
  const field=mode.value==='constructors'?'constructors':'drivers';
  const list=standings?.source==='Jolpica-F1'?safeRows(standings[field]):[];
  const byName=new Map(list.map(x=>[x.name,x]));
  const names=list.map(x=>x.name);
  selectedValues(a,names);selectedValues(b,names);
  if(names.length>1&&a.value===b.value)b.value=names[1];
  if(names.length<2){body.replaceChildren();note.textContent='Au moins deux participants classés sont nécessaires.';return;}
  const left=byName.get(a.value),right=byName.get(b.value);
  if(!left||!right||left===right){body.replaceChildren();note.textContent='Sélectionnez deux participants différents.';return;}
  const rows=[['Classement',left.position,right.position],['Points saison',left.points,right.points],['Victoires saison',left.wins,right.wins]];
  if(field==='drivers')rows.push(['Écurie',left.team||'—',right.team||'—']);
  const races=safeRows(history?.events).filter(x=>x.sport==='Formule 1'&&x.status==='FINISHED'&&Array.isArray(x.classification));
  if(field==='drivers'){
   const sampled=name=>races.flatMap(r=>r.classification.filter(c=>c.driver===name&&Number.isFinite(numeric(c.position))).map(c=>numeric(c.position)));
   const posA=sampled(a.value),posB=sampled(b.value);
   rows.push(['Courses avec classement archivé',posA.length,posB.length]);
   rows.push(['Position moyenne (échantillon)',posA.length?display(posA.reduce((x,y)=>x+y,0)/posA.length):'—',posB.length?display(posB.reduce((x,y)=>x+y,0)/posB.length):'—']);
  }
  table(a.value,b.value,rows);
  note.textContent='Source : Jolpica-F1 · Saison '+standings.season+'. Points et victoires issus du classement de saison ; positions moyennes calculées uniquement sur '+races.length+' courses archivées (échantillon incomplet). Aucune prédiction.';
 }
 function nba(){
  const all=[...safeRows(history?.events),...safeRows(extras?.matches)].filter(x=>x.sport==='Basketball'&&x.status==='FINISHED'&&/^\d+\s*[–-]\s*\d+$/.test(x.score||''));
  const unique=[...new Map(all.filter(x=>x.id).map(x=>[x.id,x])).values()];
  const map=new Map();
  for(const game of unique){
   const scores=game.score.split(/\s*[–-]\s*/).map(Number);
   if(scores.length!==2||scores.some(x=>!Number.isFinite(x)))continue;
   for(const [name,forPts,againstPts] of [[game.home,scores[0],scores[1]],[game.away,scores[1],scores[0]]]){
    if(!name)continue;
    const item=map.get(name)||{played:0,wins:0,pointsFor:0,pointsAgainst:0};
    item.played++;item.wins+=Number(forPts>againstPts);item.pointsFor+=forPts;item.pointsAgainst+=againstPts;map.set(name,item);
   }
  }
  const names=[...map.keys()].sort((x,y)=>x.localeCompare(y,'fr'));
  selectedValues(a,names);selectedValues(b,names);
  if(names.length>1&&a.value===b.value)b.value=names[1];
  if(names.length<2){body.replaceChildren();note.textContent='Pas assez de résultats NBA vérifiés pour comparer deux équipes.';return;}
  if(a.value===b.value){body.replaceChildren();note.textContent='Sélectionnez deux équipes différentes.';return;}
  const l=map.get(a.value),r=map.get(b.value);
  const rows=[['Matchs disponibles',l.played,r.played],['Victoires observées',l.wins,r.wins],['Défaites observées',l.played-l.wins,r.played-r.wins],['Points marqués / match',display(l.pointsFor/l.played),display(r.pointsFor/r.played)],['Points encaissés / match',display(l.pointsAgainst/l.played),display(r.pointsAgainst/r.played)]];
  table(a.value,b.value,rows);
  note.textContent='Source : TheSportsDB, résultats archivés et collectes récentes · '+unique.length+' matchs NBA terminés vérifiés. Statistiques sur un échantillon incomplet : ce ne sont pas les classements ni les moyennes officielles de la saison. Aucune prédiction.';
 }
 function render(){if(current==='Formule 1')f1();else if(current==='Basketball')nba();}
 function changeSport(sport){
  current=sport;
  if(sport==='Football')return;
  mode.replaceChildren();
  if(sport==='Formule 1'){mode.append(opt('drivers','Pilotes'),opt('constructors','Constructeurs'));el('compareModeLabel').hidden=false;}
  else{mode.append(opt('teams','Équipes NBA'));el('compareModeLabel').hidden=true;}
  a.replaceChildren();b.replaceChildren();render();
 }
 document.addEventListener('sportpulse:compare-multisport',event=>changeSport(event.detail?.sport));
 mode.addEventListener('change',()=>{a.replaceChildren();b.replaceChildren();render();});
 a.addEventListener('change',render);b.addEventListener('change',render);
 const load=url=>fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json();});
 Promise.allSettled([load('./data/f1_standings.json'),load('./data/multisport_history.json'),load('./data/extras.json')]).then(results=>{
  standings=results[0].status==='fulfilled'?results[0].value:null;
  history=results[1].status==='fulfilled'?results[1].value:null;
  extras=results[2].status==='fulfilled'?results[2].value:null;
  render();
 });
})();
