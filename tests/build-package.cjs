'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const r=spawnSync(process.execPath,['scripts/build-site.cjs','--out','v019-preview'],{encoding:'utf8',env:{...process.env,GITHUB_SHA:'test-source-sha'}});assert.equal(r.status,0,r.stderr);
const manifest=JSON.parse(fs.readFileSync('v019-preview/BUILD_MANIFEST.json','utf8'));
assert.equal(manifest.version,'v0.19-test');assert.equal(manifest.sourceSha,'test-source-sha');
for(const [file,hash]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('v019-preview',file))).digest('hex'),hash,file);
for(const file of [...require('../game/core-manifest.json').files,'game/runtime.js','ui/studio.js','ui/storage.js','styles/studio.css'])assert(manifest.files[file],file+' packaged');
assert.equal(Object.keys(manifest.files).filter(x=>x.endsWith('.svg')).length,266);
console.log('PACKAGE PASSED: '+Object.keys(manifest.files).length+' hashed files, all modules and 266 SVG, source provenance');
