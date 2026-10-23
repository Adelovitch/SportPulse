'use strict';
(function(){
 const host=document.getElementById('f1Standings'),status=document.getElementById('f1Status');
 if(!host||!status)return;
 fetch('./data/f1_standings.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('missing');return r.json();}).then(data=>{
  if(data.source!=='Jolpica-F1'||(!Array.isArray(data.drivers)&&!Array.isArray(data.constructors)))throw Error('invalid');
  host.replaceChildren();
  for(const [title,rows] of [['Pilotes',data.drivers],['Constructeurs',data.constructors]]){
   if(!Array.isArray(rows)||!rows.length)continue;
   const heading=document.createElement('h3');heading.textContent=title;host.append(heading);
   const scroll=document.createElement('div');scroll.className='standingsScroll';
   const table=document.createElement('table');table.className='standingsTable';
   const head=document.createElement('thead'),tr=document.createElement('tr');
   for(const name of ['Pos.','Nom','Points','Victoires',...(title==='Pilotes'?['Écurie']:[])]){const th=document.createElement('th');th.textContent=name;tr.append(th);}head.append(tr);table.append(head);
   const body=document.createElement('tbody');
   for(const item of rows){const line=document.createElement('tr');for(const value of [item.position,item.name,item.points,item.wins,...(title==='Pilotes'?[item.team]:[])]){const cell=document.createElement('td');cell.textContent=value??'—';line.append(cell);}body.append(line);}
   table.append(body);scroll.append(table);host.append(scroll);
  }
  status.textContent=host.children.length?'Classements saison '+data.season+' · Source : Jolpica-F1 · Dernière collecte : '+new Date(data.updatedAt).toLocaleString('fr-FR'):'Classements non disponibles pour cette saison.';
 }).catch(()=>{status.textContent='Classements F1 temporairement indisponibles : aucune donnée inventée.';});
})();
