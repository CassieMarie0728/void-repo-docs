import { readFile, writeFile, readdir } from 'node:fs/promises';

const assets = (await readdir('dist/client/assets')).map(name => `/assets/${name}`);
const shell = ['/', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', ...assets];
const worker = await readFile('dist/client/sw.js', 'utf8');
await writeFile('dist/client/sw.js', worker.replace("['/', '/icon.svg', '/manifest.webmanifest']", JSON.stringify(shell)));
console.log(`Prepared offline shell with ${assets.length} bundled assets.`);
