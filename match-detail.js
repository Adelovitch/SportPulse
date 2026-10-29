'use strict';
(function(){
 const dialog=document.getElementById('matchDetail'),title=document.getElementById('matchDetailTitle'),content=document.getElementById('matchDetailContent'),close=document.getElementById('matchDetailClose');
 if(!dialog||!title||!content||!close)return;
 let football=[],multisport=[];
 const make=(tag,value,cls)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=String(value);if(cls)el.className=cls;return el;};
 const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'full',timeStyle:'short'}):'Date indisponible';};
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]/g,'');
 const validScore=m=>m?.status==='FINISHED'&&/^\d+\s*[–-]\s*\d+$/.test(m.score||'');
 const validPosition=x=>Number.isInteger(Number(x?.position))&&Number(x.position)>0;
 const addText=(node,value)=>content.append(make(node,value));
 const addList=(heading,items)=>{content.append(make('h3',heading));const list=make('ol');for(const item of items)list.append(make('li',item));content.append(list);};
 const lookup=(match)=>[...multisport,...football].find(x=>x.id===match.id&&x.status==='FINISHED')||match;
 function render(raw){
  if(!raw||typeof raw!=='object')return;
  const m=lookup(raw);content.replaceChildren();
  const f1=m.sport==='Formule 1';
  title.textContent=f1?(m.home||'Grand Prix'):(m.home||'Équipe')+' — '+(m.away||'Équipe');
  addText('p',(m.sport||'Sport')+' · '+(m.competition||'Compétition non renseignée'));
  addText('p',date(m.utcDate));
  addText('p','Source : '+(m.provider||'non renseignée'));
  if(f1){
   addText('p','Circuit : '+(m.away||'Non renseigné'));
   if(m.status==='FINISHED'&&m.winner)addText('p','Vainqueur : '+m.winner);
   const rows=Array.isArray(m.classification)?m.classification.filter(validPosition).sort((a,b)=>Number(a.position)-Number(b.position)):[];
   if(rows.length){
    content.append(make('h3','Classement de la course'));
    const table=make('table');table.className='detailTable';
    const head=make('tr');for(const name of ['Pos.','Pilote','Écurie','Points'])head.append(make('th',name));table.append(head);
    for(const r of rows){const tr=make('tr');for(const v of [r.position,r.driver||'—',r.team||'—',r.points??'—'])tr.append(make('td',v));table.append(tr);}content.append(table);
   }else addText('p','Classification détaillée indisponible dans les données collectées.');
  }else{
   addText('p',validScore(m)?'Résultat final : '+m.score:'Résultat final non confirmé.');
   const source=m.sport==='Basketball'?multisport:football;
   const prev=source.filter(x=>x.id!==m.id&&x.competition===m.competition&&validScore(x)&&
      ((normalize(x.home)===normalize(m.home)&&normalize(x.away)===normalize(m.away))||
      (normalize(x.home)===normalize(m.away)&&normalize(x.away)===normalize(m.home))))
      .sort((a,b)=>Date.parse(b.utcDate)-Date.parse(a.utcDate)).slice(0,5);
   if(prev.length)addList('Confrontations précédentes archivées',prev.map(x=>date(x.utcDate)+' · '+x.home+' '+x.score+' '+x.away));
   else addText('p','Aucune confrontation précédente disponible dans notre archive partielle.');
   if(m.sport==='Basketball')addText('p','Les scores par quart-temps ne sont pas disponibles dans cette collecte.');
  }
  addText('p','Informations issues des données effectivement collectées. Les archives ne couvrent pas nécessairement toute la saison.');
  if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();
  else dialog.setAttribute('open','');
 }
 document.addEventListener('sportpulse:open-match',event=>render(event.detail?.match));
 close.addEventListener('click',()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');});
 dialog.addEventListener('click',event=>{if(event.target===dialog){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}});
 const load=file=>fetch(file,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('missing');return r.json();});
 Promise.allSettled([load('./data/history.json'),load('./data/multisport_history.json'),load('./data/extras.json')]).then(results=>{
  const h=results[0].status==='fulfilled'?results[0].value:null;
  const m=results[1].status==='fulfilled'?results[1].value:null;
  const e=results[2].status==='fulfilled'?results[2].value:null;
  football=h?.source==='SportPulse'&&Array.isArray(h.matches)?h.matches:[];
  const archived=m?.source==='SportPulseMultiSport'&&Array.isArray(m.events)?m.events:[];
  const recent=e?.source==='SportPulseExtras'&&Array.isArray(e.matches)?e.matches:[];
  multisport=[...new Map([...recent,...archived].filter(x=>x?.id).map(x=>[x.id,x])).values()];
 });
})();