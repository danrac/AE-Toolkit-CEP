const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync('host/host.jsx','utf8'),ctx);
function prop(value, keys=[]) { return {value, numKeys:keys.length, expressionEnabled:false, keys, keyValue(i){return this.keys[i-1].slice ? this.keys[i-1].slice():this.keys[i-1];},setValue(v){this.value=v;},setValueAtKey(i,v){this.keys[i-1]=v;},setValueAtTime(t,v){this.time=t;this.value=v;}}; }
let p=prop([1,2,3],[[1,2,3],[4,5,6]]);ctx.aetoolkitCepPlacementShift(p,[10,-2,0]);assert.deepEqual(p.keys,[[11,0,3],[14,3,6]]);
const followers=[prop(2,[2,7]),prop(5),prop(9)];p={value:[2,5,9],dimensionsSeparated:true,getSeparationFollower(i){return followers[i];}};
ctx.aetoolkitCepPlacementShift(p,[10,20,0]);assert.deepEqual(followers[0].keys,[12,17]);assert.equal(followers[1].value,25);assert.equal(followers[2].value,9);
ctx.aetoolkitCepPlacementWrite(p,[3,4,5],2);assert.equal(followers[0].time,2);assert.equal(followers[1].value,4);
followers[1].expressionEnabled=true;assert.throws(()=>ctx.aetoolkitCepPlacementEditable(p),/Expression-driven/);
function layer(type) {const anchor=type==='camera'||type==='light'?null:prop([0,0,0]); const position=prop([100,200,30]); return {name:type,index:1,selected:true,nullLayer:type==='null',property(){return {property(n){return n==='ADBE Anchor Point'?anchor:position;}};},sourceRectAtTime(){return {left:-50,top:-20,width:200,height:80};},duplicate(){this.copy=layer(type);return this.copy;},remove(){this.removed=true;}};}
let ended=0,probe;
function CompItem(layers){this.selectedLayers=layers;this.time=1;this.width=1920;this.height=1080;this.layers={addShape(){probe=layer('probe');return probe;}};}
ctx.CompItem=CompItem;ctx.app={beginUndoGroup(){},endUndoGroup(){ended++;},project:{}};
// Mock only the native coordinate evaluator; a rotated/scaled layer gives a
// 2x 90-degree basis. Host orchestration, property writes and rollback run unchanged.
ctx.aetoolkitCepPlacementEval=(probe,l,expr)=>expr.includes('toWorldVec')?[40,200,0]:expr.includes('fromComp')?[10,20,0]:[400,160,0];
const visual=['text','shape','solid','footage','precomp','null'];
for(const type of visual){const l=layer(type);ctx.app.project.activeItem=new CompItem([l]);const result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'anchor',x:0,y:0,gap:0,bounds:'layer',absolute:false})));assert.equal(result.changed,1);assert.equal(probe.removed,true);assert.deepEqual(l.property().property('ADBE Position').value,[140,400,30]);assert.deepEqual(l.property().property('ADBE Anchor Point').value,type==='null'?[50,50,0]:[50,20,0]);}
const camera=layer('camera'),text=layer('text'),locked=layer('locked');locked.locked=true;ctx.app.project.activeItem=new CompItem([camera,text,locked]);let result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'anchor',x:1,y:1,gap:0})));assert.equal(result.changed,1);assert.equal(result.skipped.length,2);
for(const type of [...visual,'camera','light']){const l=layer(type);ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:0,y:0,gap:0})));assert.equal(result.changed,1);assert.equal(l.copy.selected,true);assert.equal(l.selected,false);}
let l=layer('text');ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:1,y:-1,gap:10})));assert.equal(result.changed,1);assert.deepEqual(l.copy.property().property('ADBE Position').value,[510,30,30]);
ctx.aetoolkitCepPlacementShift=()=>{throw new Error('write failed');};l=layer('text');ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:1,y:0,gap:0})));assert.equal(result.changed,0);assert.equal(l.copy.removed,true);assert.equal(probe.removed,true);
assert.ok(ended>0);console.log('PASS layer placement: visual layer bounds, camera/light skips and duplication, animation, separated dimensions, expression guard, 3D compensation, cleanup');
