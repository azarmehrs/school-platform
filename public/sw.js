const CACHE='my-classbook-offline-10';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new URL('offline.html',self.registration.scope).href))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('poodman-offline-')||k.startsWith('my-classbook-offline-'))&&k!==CACHE).map(k=>caches.delete(k))))));
// No teacher data, API responses or authenticated pages are cached.
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'&&event.request.method==='GET')event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('offline.html',self.registration.scope).href)));});


self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const open=list.find(client=>'focus' in client);if(open)return open.focus();return clients.openWindow('./')}))});

