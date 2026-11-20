import {normalizeAnswer} from "./data.mjs";
// Requests are made only on demand and cached. No third-party API keys.
const cache=new Map(),inflight=new Map();
export async function json(url,{ttl=1800000,timeout=11000}={}){
 const saved=cache.get(url);if(saved&&Date.now()-saved.at<ttl)return saved.data;
 if(inflight.has(url))return inflight.get(url);
 const p=(async()=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
  try{
   const response=await fetch(url,{signal:c.signal,credentials:"omit"});
   if(!response.ok)throw Error("API "+response.status);
   const data=await response.json();
   cache.set(url,{at:Date.now(),data});return data;
  }finally{clearTimeout(timer);}
 })();
 inflight.set(url,p);
 try{return await p;}finally{if(inflight.get(url)===p)inflight.delete(url);}
}
export function safeHttps(url){
 try{if(typeof url!=="string")return null;const u=new URL(url);return u.protocol==="https:"?u.href:null;}catch{return null;}
}
export function wikipediaUrl(title,language="en"){
 return "https://"+language+".wikipedia.org/w/api.php?"+new URLSearchParams({
   action:"query",format:"json",formatversion:"2",origin:"*",redirects:"1",
   prop:"pageimages",piprop:"thumbnail|name",pithumbsize:"1000",titles:title
 });
}
export function parseWikipedia(raw,lang="en"){
 const pages=raw?.query?.pages;
 if(!Array.isArray(pages))return null;
 const page=pages.find(x=>!x.missing&&safeHttps(x.thumbnail?.source));
 if(!page)return null;
 const filename=String(page.pageimage||"").replace(/^File:/,"");
 return {
  image:safeHttps(page.thumbnail.source),
  source:filename?"https://"+lang+".wikipedia.org/wiki/File:"+encodeURIComponent(filename.replaceAll(" ","_")):
    "https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(String(page.title||"")),
  credit:"Wikimedia / Bildquelle und Lizenz",
  page:"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(String(page.title||""))
 };
}
async function wikipedia(question){
 const title=question.page||question.answer;
 const langs=question.kind==="custom-wiki"?["de","en"]:["en","de"];
 for(const lang of langs){
  try{const img=parseWikipedia(await json(wikipediaUrl(title,lang),{ttl:24*60*60*1000}),lang);
   if(img)return img;
  }catch{/* Alternative public language edition. */}
 }
 return null;
}
async function artImage(q){
 const u="https://api.artic.edu/api/v1/artworks/search?"+new URLSearchParams({
   q:q.page||q.answer,fields:"id,title,image_id,is_public_domain,artist_display",limit:"15"
 });
 try{
  const raw=await json(u,{ttl:6*60*60*1000});
  const candidates=(raw?.data||[]).filter(a=>a.is_public_domain&&a.image_id&&Number.isInteger(a.id));
  const exact=candidates.find(a=>normalizeAnswer(a.title)===normalizeAnswer(q.page)||
    normalizeAnswer(a.title)===normalizeAnswer(q.answer));
  // Never show an unrelated painting as the answer just because it matched the search.
  if(!exact)return null;
  return {
   image:"https://www.artic.edu/iiif/2/"+encodeURIComponent(exact.image_id)+"/full/1000,/0/default.jpg",
   source:"https://www.artic.edu/artworks/"+exact.id,
   credit:"Art Institute of Chicago · Public Domain",
   page:"https://www.artic.edu/artworks/"+exact.id
  };
 }catch{return null;}
}
async function bookImage(q){
 const u="https://openlibrary.org/search.json?"+new URLSearchParams({
   title:q.page||q.answer,fields:"key,title,cover_i",limit:"12"
 });
 try{
  const raw=await json(u,{ttl:6*60*60*1000});
  const list=(raw?.docs||[]).filter(x=>Number.isInteger(x.cover_i));
  const exact=list.find(x=>normalizeAnswer(x.title)===normalizeAnswer(q.page)||
    normalizeAnswer(x.title)===normalizeAnswer(q.answer));
  if(!exact)return null;
  return {image:"https://covers.openlibrary.org/b/id/"+exact.cover_i+"-L.jpg",
    source:"https://openlibrary.org"+String(exact.key||""),
    credit:"Open Library · Buchcover / Rechte beim Verlag",
    page:"https://openlibrary.org"+String(exact.key||"")};
 }catch{return null;}
}
export async function resolveImage(q){
 if(q.kind==="direct"&&safeHttps(q.image)){
  return {image:safeHttps(q.image),source:q.image,credit:"Bild von deinem eigenen Thema",page:q.image};
 }
 if(q.kind==="flag"){
  const code=String(q.page||"").toLowerCase();
  if(!/^[a-z]{2}$/.test(code))return null;
  return {image:"https://flagcdn.com/w640/"+code+".png",
    source:"https://flagcdn.com/",credit:"FlagCDN · Flagge",page:"https://www.wikipedia.org/"};
 }
 if(q.kind==="art"){
  const art=await artImage(q);
  if(art)return art;
 }
 if(q.kind==="book"){
  const book=await bookImage(q);
  if(book)return book;
 }
 return wikipedia(q);
}
export function loadPicture(src,timeout=8500){
 return new Promise((resolve,reject)=>{
  if(!safeHttps(src)){reject(Error("Invalid image URL"));return;}
  const image=new Image();let finished=false;
  const timer=setTimeout(()=>finish(Error("Bild antwortet nicht")),timeout);
  function finish(error){
   if(finished)return;finished=true;clearTimeout(timer);
   image.onload=null;image.onerror=null;
   if(error)reject(error);else resolve(src);
  }
  image.onload=()=>{if(image.naturalWidth<20||image.naturalHeight<20)finish(Error("Bild zu klein"));else finish();};
  image.onerror=()=>finish(Error("Bild nicht ladbar"));
  image.src=src;
 });
}
