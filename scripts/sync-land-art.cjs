// Keep parcel reference illustrations aligned with the authoritative mixed board.
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),grid=[...html.match(/const ZONE_GRID=\[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
for(const [i,zone] of grid.entries()){
 const art=zone==='UNIQUE'?(i===12?'waterfront':'transit'):zone.toLowerCase();
 let svg=fs.readFileSync('assets/svg/atelier/'+art+'-0.svg','utf8');
 svg=svg.replace(/<title>[\s\S]*?<\/title>/,'<title>Участок №'+(i+1)+' · '+zone+'</title>');
 fs.writeFileSync('assets/svg/lots/lot-'+String(i+1).padStart(2,'0')+'.svg',svg);
}
const manifestPath='assets/svg/manifest.json',manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
for(const [i,zone]of grid.entries())manifest.assets['lot.'+String(i+1).padStart(2,'0')]='assets/svg/atelier/'+(zone==='UNIQUE'?(i===12?'waterfront':'transit'):zone.toLowerCase())+'-0.svg';
for(let stage=1;stage<=4;stage++)manifest.assets['tower.'+stage]='assets/svg/atelier/tower-'+stage+'.svg';
const canonical=new Map();manifest.aliases={};for(const [id,path]of Object.entries(manifest.assets)){if(canonical.has(path))manifest.aliases[id]=canonical.get(path);else canonical.set(path,id);}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
