const fs=require('node:fs'),cp=require('node:child_process');
cp.execFileSync(process.execPath,['scripts/build-online-engine.cjs'],{stdio:'inherit'});
cp.execFileSync(process.execPath,['scripts/build-site.cjs','--out','online-static'],{stdio:'inherit'});
fs.rmSync('public/game',{recursive:true,force:true});fs.mkdirSync('public',{recursive:true});fs.renameSync('online-static','public/game');
