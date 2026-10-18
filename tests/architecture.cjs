'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),manifest=require('../game/core-manifest.json');
assert(!/<script\s*>/.test(html),'HTML must not own an inline game engine');
let position=-1;
for(const file of manifest.files){
 assert(fs.existsSync(file),'Missing core module '+file);
 new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
 const next=html.indexOf('src="'+file+'?');assert(next>position,'Explicit core load order: '+file);position=next;
}
assert(position<html.indexOf('src="balance.js'),'Core and AI factory load before economy integration');
assert(/DeveloperBotFactory\.create/.test(fs.readFileSync('balance.js','utf8')),'Bots have explicit dependency injection');
assert(!/function bot\(/.test(fs.readFileSync('balance.js','utf8')),'AI decisions are outside financial calculations');
assert(/scheduleTurnTask\(\(\)=>window\.endTurn\(\),350\)/.test(fs.readFileSync('game/bots.js','utf8')),'AI uses the current turn lifecycle');
console.log('ARCHITECTURE PASSED: ordered external modules, separate AI, current lifecycle');
