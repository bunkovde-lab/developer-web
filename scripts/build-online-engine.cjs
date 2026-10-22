const fs=require('node:fs'),ts=require('typescript');
const html=fs.readFileSync('index.html','utf8');
let legacy=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/resumeSavedGame\(\);\s*$/,'');
const names=new Set(),files=['balance.js','marketplace.js','pace.js','auction-competition.js','city-requests.js','game-rework-v016.js','work-economy-v020.js','rules-v021.js','economy-v022.js','city-market-v024.js','renewal-v026.js','bot-brain.js'];
const tree=ts.createSourceFile('legacy.js',legacy,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
for(const n of tree.statements){if(ts.isFunctionDeclaration(n)&&n.name)names.add(n.name.text);if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations){if(!ts.isIdentifier(d.name))throw Error('Unrecognized top level binding');names.add(d.name.text);}}
const extra=new Set();
for(const src of [legacy,...files.map(f=>fs.readFileSync(f,'utf8'))]){
 const t=ts.createSourceFile('script.js',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function visit(n){if(ts.isPropertyAccessExpression(n)&&n.expression.getText(t)==='window')extra.add(n.name.text);if(ts.isCallExpression(n)&&n.expression.getText(t)==='Object.assign'&&n.arguments[0]?.getText(t)==='window'){for(const a of n.arguments.slice(1))if(ts.isObjectLiteralExpression(a))for(const p of a.properties){if(p.name&&ts.isIdentifier(p.name))extra.add(p.name.text);else throw Error('Unsupported window export');}}ts.forEachChild(n,visit);}visit(t);
}
const aliases=[...new Set([...names,...extra])].filter(n=>!['window','document','console','Math','setTimeout','localStorage','alert','confirm'].includes(n));
const prelude=fs.readFileSync('server/engine-dom.js','utf8');
const access=aliases.map(n=>`Object.defineProperty(window,${JSON.stringify(n)},{configurable:true,get:()=>${n},set:v=>{${n}=v}});`).join('\n');
// Top-level constants need writable bindings for classic-script window assignment semantics.
const edits=tree.statements.filter(ts.isVariableStatement).map(n=>({start:n.declarationList.getStart(tree),end:n.declarationList.getStart(tree)+(n.declarationList.flags&ts.NodeFlags.Const?5:n.declarationList.flags&ts.NodeFlags.Let?3:3)}));
for(const e of edits.reverse())legacy=legacy.slice(0,e.start)+'let'+legacy.slice(e.end);
const out=`// Generated from the same rules used by the local game. Do not edit.\nexport function createEngine(seed=null){\n${prelude}\nlet ${[...extra].filter(n=>!names.has(n)&&aliases.includes(n)).join(',')};\n${access}\n${legacy}\n${files.map(f=>'\n// '+f+'\n'+fs.readFileSync(f,'utf8')).join('\n')}\n${fs.readFileSync('server/engine-bridge.js','utf8')}\n}\n`;
fs.writeFileSync('server/engine.generated.js',out);console.log('Server engine compiled: '+names.size+' shared bindings');
