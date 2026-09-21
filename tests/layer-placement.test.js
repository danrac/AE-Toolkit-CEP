const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync('host/host.jsx','utf8'),ctx);
function prop(value, keys=[]) { return {value, expressionEnabled:false, keys, get numKeys(){return this.keys.length;},keyTime(i){return i;},keyValue(i){return this.keys[i-1].slice ? this.keys[i-1].slice():this.keys[i-1];},setValue(v){this.value=v;},setValueAtKey(i,v){this.keys[i-1]=v;},setValueAtTime(t,v){this.time=t;this.value=v;}}; }
let p=prop([1,2,3],[[1,2,3],[4,5,6]]);ctx.aetoolkitCepPlacementShift(p,[10,-2,0]);assert.deepEqual(p.keys,[[11,0,3],[14,3,6]]);
const followers=[prop(2,[2,7]),prop(5),prop(9)];p={value:[2,5,9],dimensionsSeparated:true,getSeparationFollower(i){return followers[i];}};
ctx.aetoolkitCepPlacementShift(p,[10,20,0]);assert.deepEqual(followers[0].keys,[12,17]);assert.equal(followers[1].value,25);assert.equal(followers[2].value,9);
ctx.aetoolkitCepPlacementWrite(p,[3,4,5],2);assert.equal(followers[0].time,2);assert.equal(followers[1].value,4);
followers[1].expressionEnabled=true;assert.throws(()=>ctx.aetoolkitCepPlacementEditable(p),/Expression-driven/);
function layer(type) {const item={name:type,index:1,selected:true,nullLayer:type==='null',_anchor:type==='camera'||type==='light'?null:prop([0,0,0]),_position:prop([100,200,30]),property(){const owner=this;return {property(n){return n==='ADBE Anchor Point'?owner._anchor:owner._position;}};},sourceRectAtTime(){return {left:-50,top:-20,width:200,height:80};},duplicate(){this.copy=layer(type);if(this._anchor)this.copy._anchor=prop(this._anchor.value.slice(),this._anchor.keys.map(value=>value.slice()));this.copy._position=prop(this._position.value.slice(),this._position.keys.map(value=>value.slice()));return this.copy;},remove(){this.removed=true;}};return item;}
let ended=0,probe;
function CompItem(layers){this.selectedLayers=layers;this.time=1;this.width=1920;this.height=1080;this.layers={addShape(){probe=layer('probe');return probe;}};}
ctx.CompItem=CompItem;ctx.app={beginUndoGroup(){},endUndoGroup(){ended++;},project:{}};
// Mock only the native coordinate evaluator; a rotated/scaled layer gives a
// 2x 90-degree basis. Host orchestration, property writes and rollback run unchanged.
ctx.aetoolkitCepPlacementEval=(probe,l,expr)=>expr.includes('toWorldVec')?[40,200,0]:expr.includes('fromComp')?[10,20,0]:[400,160,0];
const animatedFollowers=[prop(0,[1,2]),prop(0,[3,4]),prop(9)];const separatedAnimated={value:[0,0,9],dimensionsSeparated:true,getSeparationFollower(i){return animatedFollowers[i];}};
ctx.aetoolkitCepPlacementShiftAnimated(separatedAnimated,{},layer('text'),[5,6,0],1);assert.deepEqual(animatedFollowers[0].keys,[41,42]);assert.deepEqual(animatedFollowers[1].keys,[203,204]);assert.equal(animatedFollowers[2].value,9);
// AE may expose a hidden Z follower on a 2D separated Position. Never read or
// write it: doing so raises "property or a parent property is hidden".
const twoDFollowers=[prop(0,[1,2]),prop(0,[3,4]),prop(9)];twoDFollowers[2].setValue=twoDFollowers[2].setValueAtKey=function(){throw new Error('hidden follower');};
const twoDSeparated={value:[0,0,9],dimensionsSeparated:true,getSeparationFollower(i){return twoDFollowers[i];}};
ctx.aetoolkitCepPlacementEditable(twoDSeparated,2);ctx.aetoolkitCepPlacementShift(twoDSeparated,[5,6,0],2);ctx.aetoolkitCepPlacementShiftAnimated(twoDSeparated,{},layer('shape'),[5,6,0],1);
assert.deepEqual(twoDFollowers[0].keys,[46,47]);assert.deepEqual(twoDFollowers[1].keys,[209,210]);assert.equal(twoDFollowers[2].value,9);
const visual=['text','shape','solid','footage','precomp','null'];
for(const type of visual){const l=layer(type);ctx.app.project.activeItem=new CompItem([l]);const result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'anchor',x:0,y:0,gap:0,bounds:'layer',absolute:false})));assert.equal(result.changed,1);assert.equal(probe.removed,true);assert.deepEqual(l.property().property('ADBE Position').value,[140,400,30]);assert.deepEqual(l.property().property('ADBE Anchor Point').value,type==='null'?[50,50,0]:[50,20,0]);}
const camera=layer('camera'),text=layer('text'),locked=layer('locked');locked.locked=true;ctx.app.project.activeItem=new CompItem([camera,text,locked]);let result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'anchor',x:1,y:1,gap:0})));assert.equal(result.changed,1);assert.equal(result.skipped.length,2);
for(const type of [...visual,'camera','light']){const l=layer(type);ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:0,y:0,gap:0})));assert.equal(result.changed,1);assert.equal(l.copy.selected,true);assert.equal(l.selected,false);}
let l=layer('text');ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:1,y:-1,gap:10})));assert.equal(result.changed,1);assert.deepEqual(l.copy.property().property('ADBE Position').value,[510,30,30]);
// Animated placement preserves key times and offsets every existing value.
l=layer('text');l._position=prop([100,200,30],[[100,200,30],[200,300,30]]);ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:1,y:0,gap:10})));assert.equal(result.changed,1);assert.deepEqual(l.copy._position.keys,[[510,200,30],[610,300,30]]);
l=layer('text');l._anchor=prop([0,0,0],[[0,0,0],[10,5,0]]);l._position=prop([100,200,30],[[100,200,30],[200,300,30]]);ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'anchor',x:0,y:0,gap:0,bounds:'layer',absolute:false})));assert.equal(result.changed,1);assert.deepEqual(l._anchor.keys,[[50,20,0],[60,25,0]]);assert.deepEqual(l._position.keys,[[140,400,30],[240,500,30]]);
ctx.aetoolkitCepPlacementShift=()=>{throw new Error('write failed');};l=layer('text');ctx.app.project.activeItem=new CompItem([l]);result=JSON.parse(ctx.aetoolkitCepLayerPlacement(JSON.stringify({action:'repeat',x:1,y:0,gap:0})));assert.equal(result.changed,0);assert.equal(l.copy.removed,true);assert.equal(probe.removed,true);
assert.ok(ended>0);console.log('PASS layer placement: visual layer bounds, camera/light skips and duplication, animation, separated dimensions, expression guard, 3D compensation, cleanup');
