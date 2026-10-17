'use strict';
// Asset contract validator. Dependency-free; also validates a currently empty asset catalog.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const directory=path.join(root,'assets','svg');
const manifestFile=path.join(directory,'manifest.json');
assert(fs.existsSync(manifestFile),'SVG manifest required: assets/svg/manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
assert.equal(manifest.version,1,'Expected SVG manifest version 1');
assert(manifest.assets&&typeof manifest.assets==='object'&&!Array.isArray(manifest.assets),'SVG assets must be a key/path object');
const declared=new Set();
for(const [id,rel] of Object.entries(manifest.assets)){
 assert.match(id,/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/,'Invalid SVG asset key: '+id);
 assert.equal(typeof rel,'string','SVG asset path must be a string: '+id);
 assert.match(rel,/^assets\/svg\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.svg$/,'Invalid SVG asset path '+id+': '+rel);
 assert(!rel.split('/').includes('..'),'SVG asset path escapes root: '+rel);
 assert(!declared.has(rel),'Two SVG keys point to same path: '+rel);
 declared.add(rel);
 const absolute=path.join(root,rel);
 assert(fs.existsSync(absolute),'Missing SVG file for key '+id+': '+rel);
}
function walk(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const location=path.join(dir,entry.name);
  return entry.isDirectory()?walk(location):entry.isFile()&&entry.name.endsWith('.svg')?[location]:[];
 });
}
let count=0;
for(const location of walk(directory)){
 const rel=path.relative(root,location).split(path.sep).join('/');
 assert(declared.has(rel),'Orphan SVG not registered in manifest: '+rel);
 const bytes=fs.statSync(location).size;
 assert(bytes>0&&bytes<=256*1024,'SVG empty or over 256KB: '+rel);
 const source=fs.readFileSync(location,'utf8');
 assert(/<svg\b/i.test(source)&&/<\/svg\s*>/i.test(source),'Malformed SVG element: '+rel);
 const svgStart=source.match(/<svg\b[^>]*>/i)?.[0]||'';
 const view=svgStart.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
 assert(view,'SVG missing viewBox: '+rel);
 const dims=view.trim().split(/[\s,]+/).map(Number);
 assert(dims.length===4&&dims.every(Number.isFinite)&&dims[2]>0&&dims[3]>0,'SVG invalid viewBox: '+rel);
 const forbidden=/<\s*(?:script|foreignObject|image|iframe|object|embed|use\s+[^>]*href=["']https?:)/i;
 assert(!forbidden.test(source),'SVG contains forbidden executable/raster/external element: '+rel);
 assert(!/\bon(?:load|click|error|mouseover|focus|begin|end)\s*=/i.test(source),'SVG event handler: '+rel);
 assert(!/\b(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|data:|javascript:|\/\/)/i.test(source),'SVG external reference: '+rel);
 assert(!/<!(?:DOCTYPE|ENTITY)/i.test(source),'SVG DTD/ENTITY prohibited: '+rel);
 assert(!/@import\b/i.test(source),'SVG CSS import prohibited: '+rel);
 assert(!/url\(\s*["']?\s*(?:https?:|data:|\/\/)/i.test(source),'SVG external CSS resource: '+rel);
 count++;
}
assert.equal(count,declared.size,'SVG inventory and manifest out of sync');
console.log('SVG ASSET VALIDATION PASSED: '+count+' declared vector asset(s); schema and safety checks applied');
