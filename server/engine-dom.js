let randomState=seed===null?null:seed>>>0;
const Math=Object.create(globalThis.Math);Math.random=()=>{if(randomState===null)return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;randomState=(randomState*1664525+1013904223)>>>0;return randomState/4294967296;};
class Element {
 constructor(){this._innerHTML='';this.textContent='';this.hidden=true;this.disabled=false;this.value='';this.checked=false;this.style={setProperty(){}};this.dataset={};this.className='';this.children=[];}
 set innerHTML(v){this._innerHTML=String(v);const first=this._innerHTML.match(/<option[^>]*value="([^"]+)"/);if(first)this.value=first[1];}
 get innerHTML(){return this._innerHTML;}
 setAttribute(){} removeAttribute(){} getAttribute(){return null;} focus(){}
 get classList(){return {add(){},remove(){},toggle(){},contains(){return false}};}
 appendChild(x){this.children.push(x);return x;} append(...xs){this.children.push(...xs);} prepend(x){this.children.unshift(x);} remove(){} addEventListener(){} insertBefore(x){this.children.push(x);} insertAdjacentHTML(_,s){this._innerHTML+=s;} querySelector(){return new Element();} querySelectorAll(){return [];}
}
const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const document={getElementById:node,querySelector:()=>new Element(),querySelectorAll:()=>[],createElement:()=>new Element(),body:new Element(),head:new Element(),addEventListener(){}};
const window={document,addEventListener(){},location:{search:'',pathname:'/'}};
const localStorage={getItem:()=>null,setItem(){},removeItem(){}};
// Timers are queued, never run on their own. Rooms with bots drain the queue in runBots();
// human-only rooms discard it with the engine instance, exactly as before.
let timerSeq=0;const timerQueue=[];
const setTimeout=fn=>{const id=++timerSeq;if(typeof fn==='function')timerQueue.push({id,fn});return id;},clearTimeout=id=>{const i=timerQueue.findIndex(t=>t.id===id);if(i>=0)timerQueue.splice(i,1);},alert=()=>{},confirm=()=>true;
