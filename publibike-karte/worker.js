/* Optional Cloudflare Worker CORS fallback. Deploy separately, not run by GitHub Pages. */
const PUBLIBIKE_URL='https://rest.publibike.ch/v1/public/all/stations';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  const cors={'Access-Control-Allow-Origin':env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept','Vary':'Origin'};
  if(env.ALLOWED_ORIGIN&&request.headers.get('Origin')&&request.headers.get('Origin')!==env.ALLOWED_ORIGIN)return new Response('Forbidden',{status:403,headers:cors});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET'||url.pathname!=='/stations')return new Response('Not found',{status:404,headers:cors});
  try{
   const cache=caches.default,key=new Request(url.origin+'/stations');
   let upstream=await cache.match(key);
   if(!upstream){
    const res=await fetch(PUBLIBIKE_URL,{headers:{Accept:'application/json'},cf:{cacheEverything:true,cacheTtl:60}});
    if(!res.ok)throw new Error('PubliBike HTTP '+res.status);
    upstream=new Response(res.body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60'}});
    ctx.waitUntil(cache.put(key,upstream.clone()));
   }
   const result=new Response(upstream.body,upstream);
   for(const [key,value] of Object.entries(cors))result.headers.set(key,value);
   return result;
  }catch(e){return new Response(JSON.stringify({error:'PubliBike aktuell nicht erreichbar'}),{status:502,headers:{...cors,'Content-Type':'application/json'}})}
 }
};