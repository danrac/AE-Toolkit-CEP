const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('host/host.jsx','utf8');
const files = new Map();
function File(path) { this.fsName=path; this.name=path.split('/').pop(); }
Object.defineProperty(File.prototype,'exists',{get(){return files.has(this.fsName)}});
File.prototype.open=function(mode){this.mode=mode;return mode==='w'||this.exists};
File.prototype.read=function(){return files.get(this.fsName)};
File.prototype.write=function(text){files.set(this.fsName,text);return true};
File.prototype.close=function(){};
File.prototype.copy=function(path){files.set(path,files.get(this.fsName));return true};
File.prototype.remove=function(){return files.delete(this.fsName)};
File.prototype.rename=function(name){const next=this.fsName.slice(0,this.fsName.lastIndexOf('/')+1)+name;files.set(next,files.get(this.fsName));files.delete(this.fsName);return true};
function machine(root){const ctx={File,JSON:undefined};vm.createContext(ctx);vm.runInContext(source,ctx);ctx.AEToolkitLibraryRoot=root;ctx.aetoolkitCepCheckerLibraryRoot=path=>({fsName:path});ctx.aetoolkitCepDataFolder=()=>({fsName:'/local'});return ctx;}
const a=machine('/shared'), b=machine('/shared');
const data=JSON.parse(a.aetoolkitCepLoadState()); data.namingPresets=[{id:'studio',name:'Studio'}];data.compPresets=[{id:'square',assets:{matte:'library:guide-assets/square/matte.png'}}];data.curvePresets=[{id:'studio-smooth',name:'Studio smooth',curve:[0.2,0.1,0.7,1]}];data.projects=[{id:'job',root:'/Volumes/Jobs/Job',templateId:'default-motion'}];
assert.equal(a.aetoolkitCepSaveState(JSON.stringify(data)),'OK');
const loaded=JSON.parse(b.aetoolkitCepLoadState());assert.equal(loaded.namingPresets[0].name,'Studio');assert.equal(loaded.compPresets[0].id,'square');assert.equal(loaded.curvePresets[0].id,'studio-smooth');assert.equal(loaded.projects[0].id,'job');assert.equal(loaded.libraryRevision,1);
assert.match(b.aetoolkitCepSaveState(JSON.stringify(data)),/changed on another computer/);
assert.equal(b.aetoolkitCepSaveState(JSON.stringify(loaded)),'OK');assert.equal(JSON.parse(a.aetoolkitCepLoadState()).libraryRevision,2);
const local=machine('');assert.equal(JSON.parse(local.aetoolkitCepLoadState()).projects.length,0);
for(const root of ['/Volumes/Studio/Library','Z:/Studio/Library']) {const ctx=machine(root);assert.equal(ctx.aetoolkitCepResolveGuideAsset('library:guide-assets/square/matte.png').fsName,root+'/guide-assets/square/matte.png');assert.throws(()=>ctx.aetoolkitCepResolveGuideAsset('library:../outside.png'));}
console.log('PASS shared preset categories, independent local state, stale-save rejection, Mac/Windows relative assets');
