const V="ckp-v6";
const CORE=["./","index.html","data.js","app.js","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
function usable(r){return r&&(r.ok||r.type==="opaque")}
function netFirst(e,key){
  e.respondWith(fetch(e.request).then(r=>{
    if(!usable(r))return caches.match(key).then(hit=>hit||r);
    const cp=r.clone();caches.open(V).then(c=>c.put(key,cp));return r;
  }).catch(()=>caches.match(key)));
}
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(e.request.mode==="navigate"){netFirst(e,"index.html");return}
  if(u.origin===self.location.origin&&u.pathname.endsWith(".js")){netFirst(e,u.pathname.replace(/^\//,""));return}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    if(usable(r)){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}
    return r;
  })));
});
