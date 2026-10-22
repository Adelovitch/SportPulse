// Cloudflare Worker: les secrets ne sortent jamais vers le navigateur.
const CACHE_KEY = 'matches:v1';
const TTL_SECONDS = 30 * 60;
const VALID_STATUSES = new Set(['SCHEDULED','TIMED','IN_PLAY','PAUSED','FINISHED','POSTPONED','SUSPENDED','CANCELLED','AWARDED']);
const jsonHeaders = { 'content-type':'application/json; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'public, max-age=120', 'x-content-type-options':'nosniff' };
function response(data, status=200) { return new Response(JSON.stringify(data), {status,headers:jsonHeaders}); }
function day(d) { return d.toISOString().slice(0,10); }
export function normalize(input) {
  if (!input || !Array.isArray(input.matches)) throw Error('Invalid upstream payload');
  return input.matches.slice(0,120).filter(m => m && typeof m.id==='number').map(m => {
    const full = m.score?.fullTime || {};
    const played = ['FINISHED','IN_PLAY','PAUSED','AWARDED'].includes(m.status);
    const home = Number.isInteger(full.home) ? full.home : null;
    const away = Number.isInteger(full.away) ? full.away : null;
    return {id: m.id, sport:'Football', competition:String(m.competition?.name||''), home:String(m.homeTeam?.name||''),away:String(m.awayTeam?.name||''),utcDate:m.utcDate||null,status:VALID_STATUSES.has(m.status)?m.status:'UNKNOWN',score:played&&home!==null&&away!==null?home+' – '+away:null};
  });
}
export async function collect(env, now=new Date()) {
  if (!env.FOOTBALL_DATA_TOKEN || !env.SPORT_CACHE) throw Error('Missing secret or KV binding');
  // Fenêtre glissante de trois jours, une seule requête upstream par collecte.
  const start = new Date(now.getTime()-86400000);
  const end = new Date(now.getTime()+86400000);
  const url='https://api.football-data.org/v4/matches?dateFrom='+day(start)+'&dateTo='+day(end);
  const res=await fetch(url,{headers:{'X-Auth-Token':env.FOOTBALL_DATA_TOKEN},signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('Football provider HTTP '+res.status);
  const matches=normalize(await res.json());
  const result={source:'football-data.org',updatedAt:now.toISOString(),stale:false,matches};
  await env.SPORT_CACHE.put(CACHE_KEY,JSON.stringify(result),{expirationTtl:86400});
  return result;
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if (request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS'}});
    if(request.method!=='GET')return response({error:'Method not allowed'},405);
    if(url.pathname==='/health')return response({ok:true,service:'sportpulse-api'});
    if(url.pathname!=='/api/matches')return response({error:'Not found'},404);
    if(!env.SPORT_CACHE)return response({error:'Cache not configured'},503);
    let saved;
    try{saved=await env.SPORT_CACHE.get(CACHE_KEY,'json');}catch{return response({error:'Cache unavailable'},503);}
    if(!saved)return response({error:'No data collected yet'},503);
    const age=Date.now()-Date.parse(saved.updatedAt||'');
    const stale=!Number.isFinite(age)||age>TTL_SECONDS*1000;
    return response({...saved,stale});
  },
  async scheduled(_event,env,ctx){ctx.waitUntil(collect(env).catch(err=>console.error('SportPulse refresh failed:',err.message)));}
};
