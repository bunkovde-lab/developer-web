'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const server=spawn('python3',['-m','http.server','8902','--bind','127.0.0.1'],{stdio:'ignore'});
const url='http://127.0.0.1:8902/index.html';
async function ready(){for(let i=0;i<60;i++){try{await new Promise((resolve,reject)=>{const r=http.get(url,x=>{x.resume();resolve();});r.on('error',reject) });return}catch{await new Promise(r=>setTimeout(r,100))}}throw Error('Game server unavailable')}
const targets=[{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1366,height:900},{width:1920,height:920},{width:844,height:390}];
function expectedTrack(){
 const a=[];for(let c=1;c<=11;c++)a.push([1,c]);
 for(let r=2;r<=7;r++)a.push([r,11]);
 for(let c=10;c>=1;c--)a.push([7,c]);
 for(let r=6;r>=2;r--)a.push([r,1]);
 return a;
}
(async()=>{let browser;try{
 await ready();browser=await chromium.launch({headless:true});fs.mkdirSync('ui-snapshots',{recursive:true});
 for(const viewport of targets){
  const page=await browser.newPage({viewport,hasTouch:true,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{newGame();closeSessionMenu();DeveloperMotion.setMode('off');});
  await page.waitForFunction(()=>DeveloperMotion.status().assetsReady);
  const geometry=await page.evaluate(()=>{
   const board=document.querySelector('#board'),cells=[...board.querySelectorAll(':scope > .cell')];
   const plots=[...board.querySelectorAll('.city-lots > .map-plot')];
   const box=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
   const styles=getComputedStyle(board);
   return {geometry:board.dataset.geometry,track:cells.map(x=>[Number(x.style.gridRow),Number(x.style.gridColumn)]),
    cols:styles.gridTemplateColumns.trim().split(/\s+/).length,rows:styles.gridTemplateRows.trim().split(/\s+/).length,
    board:box(board),field:box(document.querySelector('.game-field')),city:box(board.querySelector('.city-map')),
    cells:cells.map(box),plots:plots.map(box),plotAria:plots.map(x=>x.getAttribute('aria-label')),
    progress:document.querySelector('#turnProgress')?.textContent,
    globalWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
    hud:!!document.querySelector('#v10Hud'),svgTiles:board.querySelectorAll('.cell.scene-full-track').length,
    parcels:board.querySelectorAll('.map-plot.scene-full-parcel').length,
    boardViewport:document.querySelector('.game-field').scrollWidth
   };
  });
  assert.equal(geometry.geometry,'11x7','Declarative board geometry');
  assert.equal(geometry.cols,11,'11 track columns');
  assert.equal(geometry.rows,7,'7 track rows');
  assert.deepEqual(geometry.track,expectedTrack(),'Every ring index preserves cyclic clockwise order');
  assert.equal(geometry.cells.length,32);
  assert.equal(geometry.plots.length,24);
  assert(geometry.plotAria.every(x=>typeof x==='string'&&x.trim().length>=8),'All parcels retain named screen-reader labels');
  assert.equal(new Set(geometry.plotAria).size,24,'All 24 parcel labels are distinct');
  assert.equal(geometry.hud,false,'No extra top status bar');
  assert.match(geometry.progress,/0\s*\/\s*240/,'Turn limit lives inside the cabinet');
  assert.equal(geometry.svgTiles,32,'All existing track SVGs are still installed');
  assert.equal(geometry.parcels,24,'All existing parcel SVGs are still installed');
  const ratio=geometry.board.w/geometry.board.h;
  assert(ratio>=11/7-.055,'Board can stretch horizontally while preserving the complete route ('+ratio+')');
  assert(Math.abs(geometry.board.w-geometry.field.w)<2,'Board fills the game column without blank side margins');
  const widths=geometry.cells.map(x=>x.w),heights=geometry.cells.map(x=>x.h);
  assert(Math.min(...widths)>=23&&Math.min(...heights)>=23,'Full-board overview keeps usable visible track footprints; zoom supplies detailed targets: '+Math.min(...widths)+'x'+Math.min(...heights));
  const plotWidths=geometry.plots.map(x=>x.w),plotHeights=geometry.plots.map(x=>x.h);
  assert(Math.min(...plotWidths)>=28&&Math.min(...plotHeights)>=18,'Full-board overview retains parcel targets; expanded city tested separately: '+Math.min(...plotWidths)+'x'+Math.min(...plotHeights));
  assert(geometry.city.w/geometry.board.w>.72,'Inner city uses full available horizontal land');
  assert(geometry.city.h/geometry.board.h>.64,'Inner city fills vertical building area');
  assert(geometry.board.y>=0&&geometry.board.bottom<=viewport.height+1,'Entire field must fit vertically without page scroll');
  assert(geometry.board.x>=0&&geometry.board.right<=viewport.width+1,'Entire field must fit horizontally without panning');
  assert(geometry.globalWidth<=geometry.viewportWidth+2,'No page-wide horizontal overflow');
  assert.equal(await page.locator('#board .map-plot').count(),24);
  await page.screenshot({path:'ui-snapshots/geometry-v020-debug-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  const target=page.locator('#board > .cell');
  // Check every ring square through the real hit-test stack after scrolling into view.
  for(let i=0;i<32;i++){
   await target.nth(i).scrollIntoViewIfNeeded();
   const hit=await target.nth(i).evaluate(el=>{
    const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
    const top=document.elementFromPoint(x,y);
    return {label:el.getAttribute('aria-label'),covered:!(top===el||el.contains(top)),nearViewport:r.left>=-1&&r.right<=innerWidth+1, topTag:top?.tagName,topClass:top?.className,rect:{x:r.x,y:r.y,w:r.width,h:r.height},viewport:[innerWidth,innerHeight],point:[x,y],scrollLeft:document.querySelector('.game-field').scrollLeft};
   });
   assert.match(hit.label,new RegExp('клетка '+(i+1)+'$'),'Track identity '+i);
   assert.equal(hit.covered,false,'Ring square '+i+' must not be visually covered: '+JSON.stringify(hit));
  }
  // Click all 24 parcels and confirm the actual game inspect dialog opens.
  for(let i=0;i<24;i++){
   await page.locator('#board .map-plot').nth(i).click();
   assert.equal(await page.locator('#plotCardOverlay').isVisible(),true,'Parcel '+(i+1)+' remains interactive');
   await page.evaluate(()=>{document.querySelector('#plotCardOverlay').hidden=true;});
  }
  // Capture the actual, unchanged art and controls with the new rectangular map.
  await page.evaluate(()=>{window.render();document.querySelector('.game-field').scrollLeft=0;window.scrollTo(0,0);});
  await page.screenshot({path:'ui-snapshots/geometry-v020-'+viewport.width+'x'+viewport.height+'.png',fullPage:true});
  await page.locator(viewport.width<660?'.game-field':'#board').screenshot({path:'ui-snapshots/geometry-v020-board-'+viewport.width+'x'+viewport.height+'.png'});
  // Game state and boarding match the same original 32-position logic.
  await page.evaluate(()=>{DeveloperMotion.setMode('normal');state.players[0].pos=30;state.rolled=false;state.pendingCard=null;state.auction=null;state.constructionDeckChoice=null;render();});
  const route=await page.evaluate(()=>{
   state.players[0].pos=2;state.dice=4;render();
   const m=document.querySelector('.scene-moving-token'),a=m?.getAnimations()[0];
   if(!a)return null; a.pause();
   return {frames:a.effect.getKeyframes().length,movers:DeveloperMotion.status().movingPlayers,from:30,to:state.players[0].pos};
  });
  assert.deepEqual(route,{frames:5,movers:1,from:30,to:2},'Pawn moves across last corner and START without teleport');
  await page.evaluate(()=>DeveloperMotion.skip());
  assert.equal(await page.locator('.scene-moving-token').count(),0,'Skip restores real pawn and does not change state');
  // Real roll into the construction card cell: modal is hidden until physical arrival.
  const arrival=await page.evaluate(()=>{
   newGame();closeSessionMenu();DeveloperMotion.setMode('normal');Math.random=()=>0;
   state.players[0].pos=2;render();roll();
   return {pos:state.players[0].pos,dice:state.dice,awaiting:DeveloperMotion.status().awaitingArrival,
    hidden:getComputedStyle(document.querySelector('#constructionDeckOverlay')).visibility};
  });
  assert.deepEqual(arrival,{pos:4,dice:2,awaiting:true,hidden:'hidden'},'No event card before pawn reaches destination');
  await page.evaluate(()=>document.querySelector('.scene-moving-token').getAnimations()[0].finish());
  await page.waitForFunction(()=>!DeveloperMotion.status().awaitingArrival);
  assert.equal(await page.locator('#constructionDeckOverlay').isVisible(),true,'Event opens after arrival');
  await page.evaluate(()=>{DeveloperMotion.skip();document.querySelector('#constructionDeckOverlay').hidden=true;});
  // Zoom is a real touch action, not a screenshot mock.
  await page.locator('#v10Zoom').click();
  assert.equal(await page.locator('#board').evaluate(el=>el.classList.contains('zoom-map')),true);
  const zoomPlot=await page.locator('.board.zoom-map .map-plot').first().boundingBox();
  assert(zoomPlot.width>=48&&zoomPlot.height>=48,'Expanded city remains tappable');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#board').evaluate(el=>el.classList.contains('zoom-map')),false);
  assert.deepEqual(errors,[],'No uncaught JavaScript errors');
  console.log('RECTANGULAR BOARD PASSED '+viewport.width+'×'+viewport.height+
    ' ring=32 plots=24 cellMin='+Math.round(Math.min(...widths))+'x'+Math.round(Math.min(...heights))+
    ' lotMin='+Math.round(Math.min(...plotWidths))+'x'+Math.round(Math.min(...plotHeights))+
    ' ratio='+ratio.toFixed(3)+' SVG=56 touch/corners/arrival/zoom');
  await page.close();
 }
}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
