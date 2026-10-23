'use strict';
(function(){
 const panel=document.getElementById('teamProfile');
 const close=document.getElementById('teamProfileClose');
 const title=document.getElementById('teamProfileName');
 const meta=document.getElementById('teamProfileMeta');
 const stats=document.getElementById('teamProfileStats');
 const games=document.getElementById('teamProfileMatches');
 const note=document.getElementById('teamProfileNote');
 let fixtures=[];
 const mk=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=String(text);if(cls)n.className=cls;return n;};
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]/g,'');
 const date=s=>new Date(s).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'});
 const load=p=>fetch(p,{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('Unreachable');return r.json();});
 Promise.allSettled(['./data/matches.json','./data/football_data.json'].map(load)).then(results=>{
   fixtures=results.flatMap((r,i)=>{
    const p=r.status==='fulfilled'?r.value:null;
    return p&&p.source===(i?'football-data.org':'OpenLigaDB')&&Array.isArray(p.matches)?p.matches:[];
   });
 });
 function open(team,competition,position,provider){
  title.textContent=team.team;
  meta.textContent=competition+' — Football · '+provider;
  stats.replaceChildren();
  const values=[['Position',position],['Points',team.points],['Matchs joués',team.played],['Victoires',team.won],['Nuls',team.drawn],['Défaites',team.lost],['Buts marqués',team.gf],['Buts encaissés',team.ga],['Différence',team.goalDifference]];
  for(const [key,value] of values){const item=mk('div','','teamStat');item.append(mk('span',key),mk('strong',value??'—'));stats.append(item);}
  if(Number(team.played)>0&&Number.isFinite(Number(team.gf))&&Number.isFinite(Number(team.ga))){
    const avg=v=>(Number(v)/Number(team.played)).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
    for(const [key,value] of [['Buts marqués / match',avg(team.gf)],['Buts encaissés / match',avg(team.ga)],['Taux de victoires',Math.round(100*Number(team.won)/Number(team.played))+' %']]){
      const item=mk('div','','teamStat');item.append(mk('span',key),mk('strong',value));stats.append(item);
    }
  }
  const teamName=normalize(team.team);
  const selected=fixtures.filter(m=>m.competition===competition&&(normalize(m.home)===teamName||normalize(m.away)===teamName));
  const past=selected.filter(m=>m.status==='FINISHED').sort((a,b)=>Date.parse(b.utcDate)-Date.parse(a.utcDate)).slice(0,5);
  const future=selected.filter(m=>m.status!=='FINISHED'&&Date.parse(m.utcDate)>=Date.now()-3600000).sort((a,b)=>Date.parse(a.utcDate)-Date.parse(b.utcDate)).slice(0,5);
  // Only derive home/away form from real, finished fixtures in the collected window.
  const complete=selected.filter(m=>m.status==='FINISHED'&&/^\\d+\\s*[–-]\\s*\\d+$/.test(m.score||'')).sort((a,b)=>Date.parse(b.utcDate)-Date.parse(a.utcDate));
  const perspective=m=>{
    const [home,away]=m.score.split(/\\s*[–-]\\s*/).map(Number);
    const ours=normalize(m.home)===teamName;
    return {home:ours,goals:ours?home:away,against:ours?away:home};
  };
  const home=complete.map(perspective).filter(m=>m.home);
  const away=complete.map(perspective).filter(m=>!m.home);
  function summary(list){
    if(!list.length)return '—';
    const wins=list.filter(m=>m.goals>m.against).length;
    const draws=list.filter(m=>m.goals===m.against).length;
    return wins+' V · '+draws+' N · '+(list.length-wins-draws)+' D';
  }
  for(const [key,value] of [['À domicile (extrait)',summary(home)],['À l’extérieur (extrait)',summary(away)]]){
    const item=mk('div','','teamStat');item.append(mk('span',key),mk('strong',value));stats.append(item);
  }
  if(complete.length){
    const outcomes=complete.map(m=>{const g=perspective(m);return g.goals>g.against?'V':g.goals===g.against?'N':'D';});
    const first=outcomes[0];let streak=0;for(const o of outcomes){if(o!==first)break;streak++;}
    const item=mk('div','','teamStat');item.append(mk('span','Série observée (extrait)'),mk('strong',streak+' '+(first==='V'?'victoire(s)':first==='N'?'nul(s)':'défaite(s)')));stats.append(item);
  }
  games.replaceChildren();
  const section=(heading,list)=>{
   games.append(mk('h4',heading));
   if(!list.length){games.append(mk('p','Aucune rencontre disponible dans la période collectée.','teamEmpty'));return;}
   for(const m of list){const article=mk('div','','teamFixture');article.append(mk('span',date(m.utcDate)),mk('strong',m.home+'  '+(m.score||'–')+'  '+m.away));games.append(article);}
  };
  section('Derniers résultats',past);section('Prochaines rencontres',future);
  note.textContent='Les moyennes de buts et le taux de victoires utilisent les totaux du classement. Les bilans domicile/extérieur et la série observée utilisent uniquement les rencontres terminées présentes dans la fenêtre collectée : ils sont partiels et ne décrivent pas nécessairement la saison entière.';
  panel.hidden=false;
  panel.scrollIntoView({behavior:'smooth',block:'start'});
 }
 close.addEventListener('click',()=>{panel.hidden=true;document.getElementById('standingsLeague').focus();});
 document.addEventListener('sportpulse:team',e=>{if(e.detail)open(e.detail.team,e.detail.competition,e.detail.position,e.detail.provider);});
})();
