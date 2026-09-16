const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parse} = require('acorn');
assert.throws(() => parse('var value = {package: 1};', {ecmaVersion:3, allowReserved:"never"}));
const ctx = {JSON:undefined, Date, Math};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('host/host.jsx','utf8'),ctx);
let nextId=1, items=[], selection=[], undo=0, imports=0;
class FolderItem { constructor(name,parent){this.id=nextId++;this.name=name;this.parentFolder=parent;} remove(){items=items.filter(x=>x!==this);} }
const root=new FolderItem('Root',null);
class CompItem {
 constructor(name,parent=root){this.id=nextId++;this.name=name;this.parentFolder=parent;this.width=640;this.height=360;this._layers=[];items.push(this);}
 get numLayers(){return this._layers.length;}
 layer(i){return this._layers[i-1];}
 remove(){items=items.filter(x=>x!==this);}
}
class FootageItem {}
function textLayer(value){let current={text:value,fontSize:22};const prop={expressionEnabled:false,numKeys:0,get value(){return {...current};},setValue(v){current=v;}};return {name:'XXXX',locked:true,property:()=>({property:()=>prop}),prop};}
function makeTemplate(parent=root){const nested=new CompItem('Nested',parent),placeholder=new CompItem('Placeholder',parent),checker=new CompItem('Checker',parent);nested._layers=[{name:'REPLACE THIS LAYER WITH GRAPHIC COMP',source:placeholder,locked:true,property:()=>null,replaceSource(source){this.source=source;}},textLayer('XXXX')];checker._layers=[{name:'Nested',source:nested,property:()=>null}];return {checker,nested};}
function File(path){this.fsName=path;this.name=path.split('/').pop();this.exists=true;}
function Folder(path){this.fsName=path;}
ctx.CompItem=CompItem;ctx.FootageItem=FootageItem;ctx.FolderItem=FolderItem;ctx.File=File;ctx.Folder=Folder;ctx.ImportOptions=function(file){this.file=file;};
ctx.app={project:{rootFolder:root,get numItems(){return items.length;},item:i=>items[i-1],get selection(){return selection;},importFile(){imports++;const parent=new FolderItem('Package',root);items.push(parent);makeTemplate(parent);return parent;}},beginUndoGroup(){undo++;},endUndoGroup(){undo--;}};
ctx.aetoolkitCepCheckerLibraryRoot=path=>new Folder(path);
ctx.aetoolkitCepReadCheckerManifest=()=>({version:1,project:'project.aep',templates:[{name:'Checker',path:['Checker']}],media:[]});
const original=makeTemplate();
ctx.aetoolkitCepValidateChecker(original.checker);
const g1=new CompItem('Graphic A'),g2=new CompItem('Graphic B');selection=[g1,g2];
const options={libraryRoot:'/Shared/Library',packageId:'checkers-123',templateIndex:0,jobCode:'ABA'};
let result=JSON.parse(ctx.aetoolkitCepCreateCustomCheckers(JSON.stringify(options)));
assert.equal(result.created,2);assert.equal(imports,2);assert.equal(undo,0);
const generated=items.filter(x=>x.name.startsWith('CHK_Graphic')&&x instanceof CompItem);
assert.equal(generated.length,2);
generated.forEach((c,i)=>{const nested=c.layer(1).source;assert.equal(nested.layer(1).source,[g1,g2][i]);assert.equal(nested.layer(1).locked,true);assert.equal(nested.layer(2).prop.value.text,'ABA');assert.equal(nested.layer(2).prop.value.fontSize,22);assert.equal(nested.layer(2).locked,true);});
assert.equal(original.nested.layer(2).prop.value.text,'XXXX');
const count=items.length;
assert.match(ctx.aetoolkitCepCreateCustomCheckers(JSON.stringify({...options,jobCode:''})),/^ERROR:/);
assert.match(ctx.aetoolkitCepCreateCustomCheckers(JSON.stringify({...options,packageId:'../outside'})),/^ERROR:/);
assert.equal(items.length,count);
ctx.aetoolkitCepReadCheckerManifest=()=>({version:1,project:'project.aep',templates:[{path:['Missing']}],media:[]});
assert.match(ctx.aetoolkitCepCreateCustomCheckers(JSON.stringify(options)),/^ERROR:/);
assert.equal(items.length,count,'Failed import must remove only newly added items');assert.equal(undo,0);
assert.throws(()=>ctx.aetoolkitCepCheckerFile(new Folder('/Shared'),'../secret.aep'));
console.log('PASS custom checker batch imports, nested replacement, job text, source preservation, rollback and path guards');
