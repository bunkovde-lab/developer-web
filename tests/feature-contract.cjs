'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const contract=require('../game/feature-contract.json');
const html=fs.readFileSync('index.html','utf8');
const source=fs.existsSync('game/core-manifest.json')?require('./helpers/core-source.cjs').coreSource():html.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const name of contract.functions)assert(new RegExp('function\\s+'+name+'\\s*\\(').test(source),'Missing preserved core function '+name);
for(const item of contract.mechanics)for(const test of item.tests)assert(fs.existsSync(test),'Missing acceptance test '+test);
assert.equal(new Set(contract.functions).size,contract.coreFunctions);
console.log('FEATURE CONTRACT PASSED: '+contract.coreFunctions+' original core functions; '+contract.mechanics.length+' mechanics families');
