// うたいれ v5 — オフラインで起動できるように、アプリ本体のファイルだけを保存しておく
// （辞書やAIモデルなど外のサイトのファイルはここでは扱わない。AIモデルはライブラリが自分で保存する）
const CACHE='utaire-v5';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const SCOPE=new URL('./',self.location).href;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
// 古い版のうたいれのキャッシュだけを消す（AIモデルのキャッシュなどは残す）
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('utaire-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||!req.url.startsWith(SCOPE))return; // 外のサイトやアプリ外は素通し
  const u=new URL(req.url),key=u.origin+u.pathname; // ?v=… などの違いで何個も保存しない
  // ネットにつながるときは最新を取り、つながらないときは保存したものを使う
  e.respondWith(fetch(req).then(r=>{
    if(r.ok&&r.type==='basic'){const c=r.clone();e.waitUntil(caches.open(CACHE).then(ca=>ca.put(key,c)).catch(()=>{}))} // 成功した応答だけ保存
    return r;
  }).catch(async()=>{
    const hit=await caches.match(key);if(hit)return hit;
    if(req.mode==='navigate'){const top=await caches.match('./index.html')||await caches.match('./');if(top)return top} // ページを開くときだけ本体を返す
    return Response.error();
  }));
});
