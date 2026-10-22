'use strict';
(function(){
  const el=id=>document.getElementById(id);
  const status=el('liveStatus'),target=el('liveMatches'),stamp=el('liveUpdated'),source=el('liveSource');
  const sport=el('realSport'),competition=el('realCompetition'),period=el('realPeriod'),date=el('realDate');
  const count=el('realCount'),pageLabel=el('realPage'),prev=el('realPrev'),next=el('realNext');
  const PER_PAGE=12;
  let matches=[],page=0;
  const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
  const localDay=(value)=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';};
  const today=()=>localDay(new Date());
  function options(select,items){for(const value of items.sort((a,b)=>a.localeCompare(b,'fr'))) {const option=make('option','',value);option.value=value;select.append(option);}}
  function render(){
    let filtered=matches.filter(m=>{
      if(sport.value!=='all' && m.sport!==sport.value)return false;
      if(competition.value!=='all' && m.competition!==competition.value)return false;
      const d=localDay(m.utcDate),now=today();
      if(date.value && d!==date.value)return false;
      if(period.value==='today' && d!==now)return false;
      if(period.value==='past' && d>=now)return false;
      if(period.value==='future' && d<=now)return false;
      return true;
    });
    filtered.sort((a,b)=>{
      const aTime=Date.parse(a.utcDate)||0,bTime=Date.parse(b.utcDate)||0;
      // Show near-term games first when unfiltered, with upcoming games before older results.
      if(period.value==='all'&&!date.value){const now=Date.now();const aUpcoming=aTime>=now,bUpcoming=bTime>=now;if(aUpcoming!==bUpcoming)return aUpcoming?-1:1;return aUpcoming?aTime-bTime:bTime-aTime;}
      return aTime-bTime;
    });
    const pages=Math.max(1,Math.ceil(filtered.length/PER_PAGE));page=Math.min(page,pages-1);
    const chunk=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
    count.textContent=filtered.length+' rencontre'+(filtered.length>1?'s':'')+' disponible'+(filtered.length>1?'s':'');
    pageLabel.textContent='Page '+(page+1)+' / '+pages;prev.disabled=page===0;next.disabled=page+1>=pages;
    target.replaceChildren();
    if(!chunk.length){target.append(make('p','','Aucune rencontre pour ces filtres.'));return;}
    for(const m of chunk){
      const card=make('article','match compactmatch');
      const top=make('div','matchtop');const dt=Date.parse(m.utcDate);
      const formatted=Number.isFinite(dt)?new Date(dt).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'short',timeStyle:'short'}):'Date inconnue';
      top.append(make('span','',m.competition||'Compétition'),make('span','',formatted));
      const teams=make('div','teams');
      teams.append(make('span','',m.home||'Équipe inconnue'),make('strong','',m.score||'–'),make('span','',m.away||'Équipe inconnue'));
      const foot=make('div','matchbottom');foot.append(make('span','',m.status==='FINISHED'?'Terminé':'Programmé / résultat non confirmé'),make('span','tag',m.sport||'Sport'));
      card.append(top,teams,foot);target.append(card);
    }
  }
  for(const filter of [sport,competition,period,date])filter.addEventListener('change',()=>{page=0;render();});
  el('clearRealFilters').addEventListener('click',()=>{sport.value='all';competition.value='all';period.value='all';date.value='';page=0;render();});
  prev.addEventListener('click',()=>{if(page>0){page--;render();}});
  next.addEventListener('click',()=>{page++;render();});
  fetch('./data/matches.json',{cache:'no-cache'}).then(async response=>{
    if(!response.ok)throw Error('Données absentes');return response.json();
  }).then(data=>{
    if(!data||data.source!=='OpenLigaDB'||!Array.isArray(data.matches))throw Error('Format inattendu');
    matches=data.matches.filter(m=>m&&m.utcDate&&m.home&&m.away);
    options(sport,[...new Set(matches.map(m=>m.sport).filter(Boolean))]);
    options(competition,[...new Set(matches.map(m=>m.competition).filter(Boolean))]);
    const fetched=Date.parse(data.updatedAt||'');
    status.textContent=Number.isFinite(fetched)&&Date.now()-fetched>12*3600000?'Données disponibles ; la dernière collecte est ancienne.':'Résultats et calendriers disponibles (mise à jour périodique, pas en direct).';
    stamp.textContent=Number.isFinite(fetched)?'Mis à jour le '+new Date(fetched).toLocaleString('fr-FR',{timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'}):'Date de collecte non disponible';
    const link=make('a','','OpenLigaDB');link.href='https://www.openligadb.de/';link.target='_blank';link.rel='noopener noreferrer';source.replaceChildren(make('span','','Source des données : '),link);
    render();
  }).catch(()=>{
    status.textContent='Résultats momentanément indisponibles.';
    stamp.textContent='Dernière collecte non accessible.';
    count.textContent='';target.replaceChildren();source.textContent='';
  });
})();