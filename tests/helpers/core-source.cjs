'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
function coreFiles(){const m=JSON.parse(fs.readFileSync(path.join(root,'game/core-manifest.json'),'utf8'));return [...m.files,m.entrypoint];}
function coreSource(){return coreFiles().map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');}
module.exports={coreSource,coreFiles};
