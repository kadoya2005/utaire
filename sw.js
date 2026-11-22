// うたいれ v6 — オフラインで起動できるように、アプリ本体のファイルだけを保存しておく
// （辞書やAIモデルなど外のサイトのファイルはここでは扱わない。AIモデルはライブラリが自分で保存する）
const CACHE='utaire-v7-4';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const KEYS=new Set(FILES.map(f=>new URL(f,self.location).href)); // 保存してよいのはこの5つだけ
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
// 古い版のうたいれのキャッシュだけを消す（AIモデルのキャッシュなどは残す）
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('utaire-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url),key=u.origin+u.pathname; // ?v=… などの違いは同じファイルとして扱う
  const nav=req.mode==='navigate'&&KEYS.has(new URL('./',self.location).href)&&key.startsWith(new URL('./',self.location).href);
  if(!KEYS.has(key)&&!nav)return; // アプリ本体以外は素通し（保存も横取りもしない）
  // ネットにつながるときは最新を取り、つながらないときは保存したものを使う
  e.respondWith(fetch(req).then(r=>{
    if(r.ok&&r.type==='basic'&&KEYS.has(key)){const c=r.clone();e.waitUntil(caches.open(CACHE).then(ca=>ca.put(key,c)).catch(()=>{}))} // 成功した応答だけ保存
    return r;
  }).catch(async()=>{
    const ca=await caches.open(CACHE);
    const hit=KEYS.has(key)&&await ca.match(key);if(hit)return hit;
    if(req.mode==='navigate'){const top=await ca.match(new URL('./index.html',self.location).href)||await ca.match(new URL('./',self.location).href);if(top)return top} // ページを開くときだけ本体を返す
    return Response.error();
  }));
});
