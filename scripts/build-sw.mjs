import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, relative } from 'node:path'

const root = resolve('dist')
async function list(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map((e) => (e.isDirectory() ? list(resolve(dir, e.name)) : resolve(dir, e.name))),
    )
  ).flat()
}
const files = (await list(root)).filter((p) => !p.endsWith('sw.js'))
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile(file))
const cache = `photosider-${hash.digest('hex').slice(0, 12)}`
const assets = ['/', ...files.map((p) => '/' + relative(root, p).replaceAll('\\', '/'))]
await writeFile(
  resolve(root, 'sw.js'),
  `const CACHE=${JSON.stringify(cache)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('photosider-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html',{ignoreVary:true})));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request)));
});
`,
)
console.log(`Offline cache generated: ${files.length} files, ${cache}`)
