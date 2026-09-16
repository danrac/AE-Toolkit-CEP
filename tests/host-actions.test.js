const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../host/host.jsx'), 'utf8');
function FixedDate() { this.getFullYear = () => 2026; this.getMonth = () => 8; this.getDate = () => 15; }
const context = { JSON: undefined, Date: FixedDate };
vm.createContext(context);
vm.runInContext(source, context);
assert.equal(context.JSON, undefined, 'Host must not depend on or replace global JSON');
const jsonSample = { path: 'C:\\Jobs\\A B\\clip.mov', mac: '/Volumes/Jobs/é.mov', quote: '"line\nnext', values: [null, true, false, 12.5] };
assert.deepEqual(JSON.parse(context.AEToolkitJSON.stringify(context.AEToolkitJSON.parse(JSON.stringify(jsonSample)))), jsonSample);
assert.throws(() => context.AEToolkitJSON.parse('{broken'));
console.log('PASS bundled JSON works with no native JSON and preserves path characters');


assert.equal(context.aetoolkitCepNormalizeSubfolder('Delivery\\v01'), 'Delivery/v01');
assert.throws(() => context.aetoolkitCepNormalizeSubfolder('/Delivery/v01/'));
for (const invalid of ['//server/share', 'C:relative', 'Delivery/..', '.']) assert.throws(() => context.aetoolkitCepNormalizeSubfolder(invalid));
assert.equal(context.aetoolkitCepRenderDate(), '260915');
assert.equal(context.aetoolkitCepCleanImportPath('file:///Volumes/Jobs/a%20b.mov'), '/Volumes/Jobs/a b.mov');
assert.throws(() => context.aetoolkitCepNormalizeSubfolder('../outside'));
assert.throws(() => context.aetoolkitCepNormalizeSubfolder('C:/outside'));
console.log('PASS host project-action path safeguards');

const folders = { '/Job/Output': true, '/': true };
function normalize(value) { return String(value).replace(/\\/g, '/').replace(/\/+$/, '') || '/'; }
function FakeFolder(value) { this.fsName = normalize(value); }
Object.defineProperty(FakeFolder.prototype, 'exists', { get() { return !!folders[this.fsName]; } });
Object.defineProperty(FakeFolder.prototype, 'parent', { get() { const index = this.fsName.lastIndexOf('/'); return new FakeFolder(index > 0 ? this.fsName.slice(0, index) : '/'); } });
FakeFolder.prototype.create = function () { folders[this.fsName] = true; return true; };
function FakeFile(value) { this.fsName = value; }
function FakeCompItem(name) { this.name = name; this.frameRate = 24; this.width = 1920; this.height = 1080; this.workAreaStart = 0; this.workAreaDuration = 10; this.time = 3; }
const existingQueueItem = { render: true };
const renderQueue = {
    numItems: 1,
    item(index) { return this._items[index - 1]; },
    _items: [existingQueueItem],
    items: { add(comp) { const module = { applyTemplate(name) { if (name === "Missing") throw new Error("Unavailable"); this.template = name; }, file: {name:"Title_[#####].exr"} }; const item = { render: true, comp, outputModule() { return module; }, remove() { renderQueue._items.splice(renderQueue._items.indexOf(this), 1); renderQueue.numItems--; } }; renderQueue._items.push(item); renderQueue.numItems++; return item; } },
    render() { this.didRender = true; }
};
const renderContext = { JSON: undefined, Date: FixedDate, Folder: FakeFolder, File: FakeFile, CompItem: FakeCompItem, app: { project: { file: { fsName: '/Job/test.aep' }, selection: [new FakeCompItem('Title')], renderQueue } } };
vm.createContext(renderContext);
vm.runInContext(source, renderContext);
const result = renderContext.aetoolkitCepRenderSelected(JSON.stringify({ mode: 'offline', outputTemplate: 'Studio EXR', basePath: '/Job/Output', subfolder: 'Delivery\\v01' }));
assert.ok(/^Rendered 1 composition/.test(result));
assert.equal(renderQueue.didRender, true);
assert.equal(existingQueueItem.render, true);
assert.equal(folders['/Job/Output/260915/Delivery/v01'], true);
assert.equal(renderQueue._items[1].outputModule(1).template, 'Studio EXR');
assert.ok(renderQueue._items[1].outputModule(1).file.fsName.endsWith('_[#####].exr'));
const beforeFailure = renderQueue.numItems;
assert.match(renderContext.aetoolkitCepRenderSelected(JSON.stringify({mode:'online', outputTemplate:'Missing', basePath:'/Job/Output'})), /^ERROR:/);
assert.equal(renderQueue.numItems, beforeFailure, 'Failed preset leaves no added queue item');
assert.equal(existingQueueItem.render, true);
assert.match(renderContext.aetoolkitCepRenderSelected(JSON.stringify({mode:'online', basePath:'/Job/Output'})), /Choose an output preset/);
console.log('PASS chosen output preset, sequence suffix, failed-template rollback, and existing queue preservation');
renderContext.GetSettingsFormat = { STRING: 1 };
assert.equal(renderContext.aetoolkitCepOutputSuffix({file:null,getSettings(){return {'Output File Info':{'File Name':'Title.mp4'}}}}), '.mp4');
assert.equal(renderContext.aetoolkitCepOutputSuffix({file:{name:'Title_%5B#####%5D.exr'}}), '_[#####].exr');
const originalAdd = renderQueue.items.add;
for (const [template, extension, token] of [
    ['[compName].[fileextension]', 'mp4', ''],
    ['[compName]_[#####].[fileextension]', 'exr', '_[#####]']
]) {
    let applied, outputSettings, calls = 0, stale = false;
    const resolved = {file:{name:'Title' + token + '.' + extension}};
    const initial = {
        file:null,
        applyTemplate(name){applied=name;},
        getSettings(){assert.equal(stale,false); return {'Output File Info':{'File Template':template,'File Name':''}};},
        setSettings(value){outputSettings=value;stale=true;}
    };
    renderQueue.items.add = function(comp) {
        const item={render:true,comp,outputModule(){calls++;return stale?resolved:initial;},remove(){renderQueue._items.splice(renderQueue._items.indexOf(this),1);renderQueue.numItems--;}};
        renderQueue._items.push(item);renderQueue.numItems++;return item;
    };
    const output = renderContext.aetoolkitCepRenderSelected(JSON.stringify({mode:'offline',outputTemplate:'User-defined preset',basePath:'/Job/Output',subfolder:'26_0916\\'}));
    assert.match(output,/^Rendered 1/);
    assert.equal(applied,'User-defined preset');
    assert.equal(outputSettings['Output File Info']['Base Path'],'/Job/Output/260915/26_0916');
    assert.equal(outputSettings['Output File Info']['Subfolder Path'],'');
    assert.equal(outputSettings['Output File Info']['File Template'],'Title_24fps_1920x1080'+token+'.[fileextension]');
    assert.equal(resolved.file.fsName,'/Job/Output/260915/26_0916/Title_24fps_1920x1080'+token+'.'+extension);
    assert.ok(calls>=3,'Reacquires invalidated output module');
    assert.equal(existingQueueItem.render,true);
}
renderQueue.items.add = function(comp) {
    const item=originalAdd(comp);
    const module=item.outputModule(1);
    module.file=null;
    module.getSettings=()=>({'Output File Info':{}});
    module.setSettings=()=>{throw new Error('Cannot resolve output settings');};
    return item;
};
const beforeOutputFailure=renderQueue.numItems;
assert.match(renderContext.aetoolkitCepRenderSelected(JSON.stringify({mode:'online',outputTemplate:'Broken',basePath:'/Job/Output'})),/Cannot resolve output settings/);
assert.equal(renderQueue.numItems,beforeOutputFailure,'Unresolved output rolls back added item');
assert.equal(existingQueueItem.render,true);
renderQueue.items.add=originalAdd;
console.log('PASS empty output-file resolution, sequence tokens, refreshed module, trailing backslash and rollback');

let removedComp = false, removedItem = false;
const lookupContext = {JSON:undefined,app:{project:{items:{addComp(){return {remove(){removedComp=true}}}},renderQueue:{numItems:0,items:{add(){return {outputModule(){return {templates:['Studio EXR','Client ProRes','_HIDDEN internal']}},remove(){removedItem=true}}}}}}}};
vm.createContext(lookupContext); vm.runInContext(source, lookupContext);
assert.deepEqual(JSON.parse(lookupContext.aetoolkitCepOutputTemplates()), ['Studio EXR','Client ProRes']);
assert.ok(removedComp && removedItem);
console.log('PASS installed preset enumeration and temporary-item cleanup');

const importFiles = { '/assets/a.mov': true, '/assets/b.mov': true }, importFolders = { '/assets': true }, importedAssets = [];
function ImportFile(value) { this.fsName = normalize(value); this.name = this.fsName.split('/').pop(); }
Object.defineProperty(ImportFile.prototype, 'exists', { get() { return !!importFiles[this.fsName]; } });
function ImportFolder(value) { this.fsName = normalize(value); }
Object.defineProperty(ImportFolder.prototype, 'exists', { get() { return !!importFolders[this.fsName]; } });
function ImportOptions(file) { this.file = file; }
const importContext = { JSON: undefined, File: ImportFile, Folder: ImportFolder, ImportOptions, $: { os: 'Macintosh' }, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { importFile(options) { importedAssets.push(options.file.fsName); } } } };
vm.createContext(importContext);
vm.runInContext(source, importContext);
const importSummary = JSON.parse(importContext.aetoolkitCepImportAssetPaths('/assets/\na.mov\na.mov\nfile:///assets/b.mov'));
assert.equal(importSummary.imported, 2);
assert.deepEqual(importedAssets, ['/assets/a.mov', '/assets/b.mov']);
console.log('PASS host pasted-path import deduplicates files and accepts folder headers and file URLs');

const sourceContext = { JSON: undefined, XMPConst: { NS_CREATOR_ATOM: 'creator', NS_DM: 'dynamic' } };
vm.createContext(sourceContext);
vm.runInContext(source, sourceContext);
const sourceLinks = sourceContext.aetoolkitCepReadSourceLinks({
    getStructField(namespace, struct, fieldNamespace, field) {
        if (namespace === 'creator' && struct === 'aeProjectLink' && field === 'fullPath') return { value: '/Jobs/Graphics.aep' };
        if (namespace === 'dynamic' && struct === 'projectRef' && field === 'path') return { value: '/Jobs/Graphics.aep' };
    },
    getProperty() { return { value: '/Jobs/Other.aepx' }; }
});
assert.deepEqual(Array.from(sourceLinks), ['/Jobs/Graphics.aep', '/Jobs/Other.aepx']);
console.log('PASS host source discovery reads and deduplicates explicit AE project links');

function EditComp(name) { this.id = EditComp.nextId++; this.name = name; this.width = 1920; this.height = 1080; this.frameRate = 24; this.layerParentsChanged = false; }
EditComp.nextId = 1;
function ProjectItem(name) { this.name = name; }
const createdComps = [], editComp = new EditComp('Existing');
const editContext = {
    JSON,
    CompItem: EditComp,
    app: {
        beginUndoGroup() {}, endUndoGroup() {},
        project: {
            selection: [editComp],
            items: { addComp(name, width, height, pixelAspect, duration, fps) { const comp = new EditComp(name); comp.width = width; comp.height = height; comp.duration = duration; comp.frameRate = fps; createdComps.push(comp); return comp; } }
        }
    }
};
vm.createContext(editContext);
vm.runInContext(source, editContext);
const created = JSON.parse(editContext.aetoolkitCepCreateComp(JSON.stringify({ width: 1920, height: 1080, fps: 23.976, duration: 10, format: 'HD', job: 'Job', style: 'Main', description: 'Title', initials: 'AB' })));
assert.equal(created.name, 'Job_HD_Main_Title_v01_AB');
assert.equal(createdComps[0].frameRate, 23.976);
const modified = JSON.parse(editContext.aetoolkitCepModifySelectedComps(JSON.stringify({ width: 3840, height: 2160, fps: 25, duration: 10, updateSize: true, updateFps: true, renameBase: 'New Main' })));
assert.equal(modified.modified, 1);
assert.equal(editComp.width, 3840);
assert.equal(editComp.height, 2160);
assert.equal(editComp.frameRate, 25);
assert.equal(editComp.name, 'New Main_01');
assert.equal(editComp.layerParentsChanged, false);
editContext.app.project.selection = [new ProjectItem('A[Old].mov'), new ProjectItem('Old_B')];
const renamed = JSON.parse(editContext.aetoolkitCepRenameSelectedItems(JSON.stringify({ operation: 'replace', find: 'Old', replace: 'New', start: 1 })));
assert.equal(renamed.renamed, 2);
assert.equal(editContext.app.project.selection[0].name, 'A[New].mov');
assert.equal(editContext.app.project.selection[1].name, 'New_B');
assert.equal(editContext.aetoolkitCepRenameSelectedItems(JSON.stringify({ operation: 'number', start: 8 })).indexOf('ERROR:'), -1);
assert.equal(editContext.app.project.selection[0].name, 'A[New].mov_08');
console.log('PASS host comp creation, safe comp editing, and literal item renaming');

function SolidSource() {}
function AVLayer() { this.nullLayer = false; this.source = { width: 100, height: 100, mainSource: new SolidSource() }; }
const solidLayer = new AVLayer(), conformComp = new EditComp('Active');
conformComp.width = 3840; conformComp.height = 2160; conformComp.selectedLayers = [solidLayer];
const conformContext = { JSON: undefined, CompItem: EditComp, AVLayer, SolidSource, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { activeItem: conformComp } } };
vm.createContext(conformContext);
vm.runInContext(source, conformContext);
const untouchedSolid = solidLayer.source;
solidLayer.replaceSource = function(source) { this.source = source; };
solidLayer.property = () => ({property:()=>({numKeys:0,value:[50,50],setValue(){}})});
conformComp.layers = {addSolid(color,name,width,height) { return {source:{width,height},remove(){}}; }};
const conformed = JSON.parse(conformContext.aetoolkitCepConformSelectedSolids());
assert.equal(conformed.conformed, 1);
assert.equal(solidLayer.source.width, 3840);
assert.equal(solidLayer.source.height, 2160);
assert.equal(untouchedSolid.width, 100);
console.log('PASS selected-solid tool replaces sources without changing shared originals');

function CanvasLayers() { this.entries = []; }
CanvasLayers.prototype.addSolid = function (color, name, width, height) { const layer = { name, width, height, moveToEnd() { this.movedToEnd = true; } }; this.entries.push(layer); return layer; };
CanvasLayers.prototype.addText = function (text) { const document = {}, property = { value: document, setValue(value) { this.value = value; } }; const layer = { name: '', text, transform: { position: { setValue(value) { layer.position = value; } } }, opacity: { setValue(value) { layer.opacityValue = value; } }, property() { return { property() { return property; } }; } }; this.entries.push(layer); return layer; };
CanvasLayers.prototype.add = function (source) { const remap = { setValueAtTime(time, value) { this.values = this.values || []; this.values.push([time, value]); } }; const layer = { source, canSetTimeRemapEnabled: true, transform: { position: { setValue(value) { layer.position = value; } } }, property() { return remap; } }; this.entries.push(layer); return layer; };
function CanvasComp(name) { this.id = CanvasComp.nextId++; this.name = name; this.width = 1920; this.height = 1080; this.frameRate = 24; this.frameDuration = 1 / 24; this.duration = 10; this.pixelAspect = 1; this.layers = new CanvasLayers(); }
CanvasComp.nextId = 1;
const canvasComps = [], sourceCanvas = new CanvasComp('Promo');
const coverContext = {
    JSON,
    Math,
    CompItem: CanvasComp,
    ParagraphJustification: { LEFT_JUSTIFY: 'left' },
    app: {
        beginUndoGroup() {}, endUndoGroup() {},
        project: { selection: [sourceCanvas], items: { addComp(name, width, height, pixelAspect, duration, fps) { const comp = new CanvasComp(name); comp.width = width; comp.height = height; comp.pixelAspect = pixelAspect; comp.duration = duration; comp.frameRate = fps; canvasComps.push(comp); return comp; } } }
    }
};
vm.createContext(coverContext);
vm.runInContext(source, coverContext);
const cover = JSON.parse(coverContext.aetoolkitCepCreateCover(JSON.stringify({ width: 1920, height: 1080, fps: 24, duration: 10, format: '1920x1080', topLine: 'TOP', bottomLine: 'BOTTOM', date: 'Today', spot: 'V1' })));
assert.equal(cover.name, 'COVER_1920x1080_01');
assert.equal(canvasComps[0].layers.entries.filter(entry => entry.text).length, 4);
const checkers = JSON.parse(coverContext.aetoolkitCepCreateCheckers(JSON.stringify({ width: 1920, height: 1080, frame: 10 })));
assert.equal(checkers.created, 1);
assert.equal(canvasComps[1].name, 'CKR_01_Promo');
assert.equal(canvasComps[1].layers.entries[0].timeRemapEnabled, true);
assert.deepEqual(canvasComps[1].layers.entries[0].property().values, [[0, 10 / 24], [10, 10 / 24]]);
console.log('PASS host creates native editable covers and held-frame checkers');

function FolderItem(name, items) { this.name = name; this._items = items || []; this.numItems = this._items.length; }
FolderItem.prototype.item = function (index) { return this._items[index - 1]; };
function FootageItem(name, id) { this.name = name; this.id = id; }
const keptComp = new CanvasComp('Keep'); keptComp.id = 100;
const keptFootage = new FootageItem('Footage', 101);
let consolidated = 0, unusedRemoved = 0, reducedItems, collectCommand;
const cleanupContext = {
    JSON,
    CompItem: CanvasComp,
    FootageItem,
    FolderItem,
    app: {
        beginUndoGroup() {}, endUndoGroup() {},
        findMenuCommandId(name) { return name === 'Collect Files...' ? 1234 : 0; }, executeCommand(command) { collectCommand = command; },
        project: { selection: [new FolderItem('Selected', [keptComp, keptFootage])], consolidateFootage() { consolidated++; }, removeUnusedFootage() { unusedRemoved++; }, reduceProject(items) { reducedItems = items; } }
    }
};
vm.createContext(cleanupContext);
vm.runInContext(source, cleanupContext);
assert.equal(JSON.parse(cleanupContext.aetoolkitCepConsolidateFootage()).consolidated, true);
assert.equal(consolidated, 1);
assert.equal(JSON.parse(cleanupContext.aetoolkitCepRemoveUnusedFootage()).removed, true);
assert.equal(unusedRemoved, 1);
assert.equal(JSON.parse(cleanupContext.aetoolkitCepReduceProject()).kept, 2);
assert.deepEqual(reducedItems, [keptComp, keptFootage]);
assert.equal(cleanupContext.aetoolkitCepOpenCollectFiles(), 'OK');
assert.equal(collectCommand, 1234);
console.log('PASS host cleanup and native collect operations use selected dependencies');

function OrganizeFolder(name, id, project) { this.name = name; this.id = id; this.project = project; this.selected = false; this.parentFolder = null; }
Object.defineProperty(OrganizeFolder.prototype, 'numItems', { get() { return this.project._items.filter(item => item.parentFolder === this).length; } });
OrganizeFolder.prototype.item = function (index) { return this.project._items.filter(item => item.parentFolder === this)[index - 1]; };
function OrganizeComp(name, id, parent, selected) { this.name = name; this.id = id; this.parentFolder = parent; this.selected = !!selected; this.usedIn = []; this.numLayers = 0; }
function OrganizeFootage(name, id, parent, still, solid) { this.name = name; this.id = id; this.parentFolder = parent; this.selected = false; this.usedIn = []; this.mainSource = solid ? new OrganizeSolidSource() : { isStill: still }; }
function OrganizeSolidSource() {}
const organizeProject = { _items: [], selection: [], items: {} };
const organizeRoot = new OrganizeFolder('Root', 1, organizeProject); organizeProject.rootFolder = organizeRoot;
organizeProject.items.addFolder = function (name) { const folder = new OrganizeFolder(name, organizeProject._items.length + 10, organizeProject); folder.parentFolder = organizeRoot; organizeProject._items.push(folder); return folder; };
const oldFolder = new OrganizeFolder('Old', 2, organizeProject); oldFolder.parentFolder = organizeRoot;
const selectedOrganizeComp = new OrganizeComp('Keep at root', 3, oldFolder, true);
const mainOrganizeComp = new OrganizeComp('Main', 4, oldFolder, false);
const stillFootage = new OrganizeFootage('Logo.png', 5, oldFolder, true, false);
const videoFootage = new OrganizeFootage('Edit.mov', 6, oldFolder, false, false);
const solidFootage = new OrganizeFootage('Blue Solid', 7, oldFolder, false, true);
organizeProject._items.push(oldFolder, selectedOrganizeComp, mainOrganizeComp, stillFootage, videoFootage, solidFootage);
Object.defineProperty(organizeProject, 'numItems', { get() { return this._items.length; } });
organizeProject.item = function (index) { return this._items[index - 1]; };
const organizeContext = { JSON: undefined, FolderItem: OrganizeFolder, CompItem: OrganizeComp, FootageItem: OrganizeFootage, SolidSource: OrganizeSolidSource, app: { beginUndoGroup() {}, endUndoGroup() {}, project: organizeProject } };
vm.createContext(organizeContext);
vm.runInContext(source, organizeContext);
const organized = JSON.parse(organizeContext.aetoolkitCepOrganizeProject('basic'));
assert.equal(organized.moved, 4);
assert.equal(selectedOrganizeComp.parentFolder, organizeRoot);
assert.equal(mainOrganizeComp.parentFolder.name, 'Comps');
assert.equal(stillFootage.parentFolder.name, 'Images');
assert.equal(videoFootage.parentFolder.name, 'Footage');
assert.equal(solidFootage.parentFolder.name, 'Solids');
console.log('PASS host organizer snapshots first and keeps selected items at the root');
videoFootage.file = { name: 'Edit.mov', fsName: '/Any Project/Custom Media/Edit.mov' };
organizeContext.aetoolkitCepOrganizeDms(organizeContext.aetoolkitCepOrganizerSnapshot(), '16x9');
assert.equal(videoFootage.parentFolder.parentFolder.name, '4_FOOTAGE');
console.log('PASS DMS video routing does not depend on a legacy disk folder');

function ToolComp(name) { this.name = name; this.frameRate = 24; this.frameDuration = 1 / 24; this.duration = 10; this.time = 2; this.selectedLayers = []; }
function ToolLayer(name, index, inPoint, outPoint) { this.name = name; this.index = index; this.inPoint = inPoint; this.outPoint = outPoint; this.startTime = inPoint; this.opacity = { setValueAtTime(time, value) { this.values = this.values || []; this.values.push([time, value]); } }; }
function ToolTextLayer(name, index, inPoint, outPoint) { ToolLayer.call(this, name, index, inPoint, outPoint); const property = { numKeys: 0, setValue(value) { this.value = value; }, setValueAtTime(time, value) { this.valueAtTime = [time, value]; } }; this.property = function () { return { property() { return property; } }; }; this.textProperty = property; }
ToolTextLayer.prototype = Object.create(ToolLayer.prototype);
const toolsComp = new ToolComp('Tool comp'), normalLayer = new ToolLayer('Normal', 2, 1, 4), textLayer = new ToolTextLayer('Text', 1, 0, 3);
toolsComp.selectedLayers = [normalLayer, textLayer];
const toolsContext = { JSON: undefined, Math, CompItem: ToolComp, TextDocument: function (text) { this.text = text; }, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { selection: [toolsComp], activeItem: toolsComp } } };
vm.createContext(toolsContext);
vm.runInContext(source, toolsContext);
assert.equal(JSON.parse(toolsContext.aetoolkitCepAdjustSelectedCompFrames('10')).changed, 1);
assert.equal(toolsComp.duration, 10 + 10 / 24);
assert.equal(JSON.parse(toolsContext.aetoolkitCepSetSelectedCompDuration('0.001')).changed, 1);
assert.equal(toolsComp.duration, 1 / 24);
assert.equal(JSON.parse(toolsContext.aetoolkitCepFadeSelectedLayers(JSON.stringify({ direction: 'in', frames: 10 }))).changed, 2);
assert.deepEqual(normalLayer.opacity.values, [[1, 0], [1 + 10 / 24, 100]]);
assert.equal(JSON.parse(toolsContext.aetoolkitCepSequenceSelectedLayers()).changed, 2);
assert.equal(textLayer.startTime, 2);
assert.equal(normalLayer.startTime, 5);
assert.equal(JSON.parse(toolsContext.aetoolkitCepParentSelectedLayers()).changed, 1);
assert.equal(normalLayer.parent, textLayer);
assert.equal(JSON.parse(toolsContext.aetoolkitCepUnparentSelectedLayers()).changed, 2);
assert.equal(normalLayer.parent, null);
assert.equal(JSON.parse(toolsContext.aetoolkitCepMarkSelectedGuideLayers()).changed, 2);
assert.equal(normalLayer.guideLayer, true);
assert.equal(JSON.parse(toolsContext.aetoolkitCepReplaceSelectedText('Updated')).changed, 1);
assert.equal(textLayer.textProperty.value.text, 'Updated');
console.log('PASS host tools preserve frame limits and update only selected layers');

function TransformProperty(value, keyed) { this.value = value; this.numKeys = keyed ? 1 : 0; this.isTimeVarying = !!keyed; }
TransformProperty.prototype.setValue = function (value) { this.value = value; this.setDirect = true; };
TransformProperty.prototype.setValueAtTime = function (time, value) { this.value = value; this.setAtTime = [time, value]; };
function SelectLayer(name, index, kind) { this.name = name; this.index = index; this.kind = kind; this.matchName = kind === 'shape' ? 'ADBE Vector Layer' : kind === 'camera' ? 'ADBE Camera Layer' : ''; this.nullLayer = kind === 'null'; this._position = new TransformProperty([index * 10, index * 20], kind === 'keyed'); this._scale = new TransformProperty([100, 100]); this._rotation = new TransformProperty(0); this.source = kind === 'comp' ? new ToolComp('Nested') : kind === 'footage' ? new SelectFootage() : null; }
SelectLayer.prototype.property = function (name) { if (name === 'ADBE Text Properties') return this.kind === 'text' ? {} : null; if (name === 'ADBE Transform Group') { const layer = this; return { property(match) { return match === 'ADBE Position' ? layer._position : match === 'ADBE Scale' ? layer._scale : match === 'ADBE Rotate Z' ? layer._rotation : null; } }; } return null; };
SelectLayer.prototype.moveToBeginning = function () { this.movedToBeginning = true; };
function SelectFootage() { this.mainSource = { isStill: false }; }
function SelectComp() { ToolComp.call(this, 'Select'); this._layers = [new SelectLayer('Shape', 1, 'shape'), new SelectLayer('Text', 2, 'text'), new SelectLayer('Null', 3, 'null')]; this.numLayers = this._layers.length; }
SelectComp.prototype = Object.create(ToolComp.prototype);
SelectComp.prototype.layer = function (index) { return this._layers[index - 1]; };
Object.defineProperty(SelectComp.prototype, 'selectedLayers', { get() { return this._layers.filter(layer => layer.selected); }, set() {} });
const selectComp = new SelectComp();
const selectContext = { JSON: undefined, CompItem: ToolComp, FootageItem: SelectFootage, SolidSource: function () {}, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { activeItem: selectComp } } };
vm.createContext(selectContext);
vm.runInContext(source, selectContext);
assert.equal(JSON.parse(selectContext.aetoolkitCepSelectLayersByType(JSON.stringify({ type: 'text', mode: 'only' }))).changed, 1);
assert.equal(selectComp._layers[1].selected, true);
selectComp._layers[0].selected = true;
assert.equal(JSON.parse(selectContext.aetoolkitCepReverseSelectedLayerOrder()).changed, 2);
assert.equal(selectComp._layers[0].movedToBeginning, true);
assert.equal(JSON.parse(selectContext.aetoolkitCepSnapSelectedLayers()).changed, 1);
assert.deepEqual(selectComp._layers[0]._position.value, selectComp._layers[1]._position.value);
assert.equal(JSON.parse(selectContext.aetoolkitCepTransferTransform(JSON.stringify({ position: true, scale: true, rotation: true }))).changed, 1);
assert.deepEqual(selectComp._layers[0]._scale.value, selectComp._layers[1]._scale.value);
console.log('PASS host layer selection, stacking, snapping, and transform transfer');

function NoSlateFootage(name) { this.name = name; this.id = 77; this.frameRate = 24; this.duration = 10; this.width = 1920; this.height = 1080; this.pixelAspect = 1; }
let noSlateComp, noSlateLayer;
const noSlateFootage = new NoSlateFootage('Edit.mov');
const noSlateContext = { JSON: undefined, FootageItem: NoSlateFootage, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { selection: [noSlateFootage], items: { addComp(name, width, height, pixelAspect, duration, frameRate) { noSlateComp = { id: 88, name, width, height, pixelAspect, duration, frameRate, layers: { add(source) { noSlateLayer = { source, startTime: 0 }; return noSlateLayer; } } }; return noSlateComp; } } } } };
vm.createContext(noSlateContext);
vm.runInContext(source, noSlateContext);
const noSlate = JSON.parse(noSlateContext.aetoolkitCepCreateNoSlateComp('144'));
assert.equal(noSlate.name, 'Edit.mov_NoSlate');
assert.equal(noSlateComp.duration, 4);
assert.equal(noSlateLayer.startTime, -6);
console.log('PASS host creates no-slate comps with a validated frame trim');

function AssetFolder(path) { this.fsName = path; }
function AssetFile(path) { this.fsName = path; this.name = path.split('/').pop(); this.parent = new AssetFolder(path.slice(0, path.lastIndexOf('/'))); this.exists = true; }
const assetContext = { JSON: undefined, File: AssetFile, Folder: AssetFolder };
vm.createContext(assetContext);
vm.runInContext(source, assetContext);
assert.equal(assetContext.aetoolkitCepCopyPresetAsset(new AssetFolder('/UserData/AE-Toolkit-CEP/guide-assets/scope'), '/UserData/AE-Toolkit-CEP/guide-assets/scope/matte.png', 'matte'), '/UserData/AE-Toolkit-CEP/guide-assets/scope/matte.png');
console.log('PASS host reuses guide assets already stored for a format');

// ExtendScript rejects unescaped slash delimiters inside regex character classes.
assert.equal(context.aetoolkitCepSafeName('a/b:c'), 'abc');
assert.ok(!source.includes(String.raw`[\\/`), 'Escape slash delimiters for the ExtendScript parser');

importFiles['/assets/Screenshot 2026-09-15 at 3.52.14\u202fPM.png'] = true;
const escapedScreenshot = String.raw`/assets/Screenshot\ 2026-09-15\ at\ 3.52.14` + '\u202fPM.png';
assert.equal(JSON.parse(importContext.aetoolkitCepImportAssetPaths(escapedScreenshot)).imported, 1);
assert.equal(importedAssets[importedAssets.length - 1], '/assets/Screenshot 2026-09-15 at 3.52.14\u202fPM.png');
importFiles['C:/Jobs/My Clip.mov'] = true;
assert.equal(JSON.parse(importContext.aetoolkitCepImportAssetPaths(String.raw`C:\Jobs\My Clip.mov`)).imported, 1);
console.log('PASS Terminal-escaped Mac screenshot paths and Windows separators import');

for (const absolute of ['/Users/example/file.png', 'C:/Jobs/file.png', String.raw`C:\Jobs\file.png`, String.raw`\\server\share\file.png`]) assert.equal(context.aetoolkitCepIsAbsolutePath(absolute), true);
assert.equal(context.aetoolkitCepIsAbsolutePath('file.png'), false);

const nameOptions = { job: 'ABA', format: 'HD', style: 'A', description: 'NewCard', initials: 'DR', namingOrder: ['job', 'style', 'description', 'format', 'version', 'initials'] };
const namedComp = JSON.parse(editContext.aetoolkitCepCreateComp(JSON.stringify(Object.assign({ width: 1920, height: 1080, fps: 24, duration: 10 }, nameOptions))));
assert.equal(namedComp.name, 'ABA_A_NewCard_HD_v01_DR');
console.log('PASS comp creation uses custom template naming order');

const typedName = { width: 1920, height: 1080, fps: 24, duration: 10, format: 'HD', namingFields: [{ id: 'client', label: 'Client', type: 'text', value: 'Acme' }, { id: 'revision', label: 'Revision', type: 'version', value: '1', prefix: 'v', digits: 2 }], namingValues: { revision: '3' } };
assert.equal(JSON.parse(editContext.aetoolkitCepCreateComp(JSON.stringify(typedName))).name, 'Acme_v03');
typedName.namingFields.reverse();
assert.equal(JSON.parse(editContext.aetoolkitCepCreateComp(JSON.stringify(typedName))).name, 'v03_Acme');
typedName.namingFields.pop();
assert.equal(JSON.parse(editContext.aetoolkitCepCreateComp(JSON.stringify(typedName))).name, 'v03');
console.log('PASS custom fields, version format, removal and order reach comp creation');

{
    const shared = {name:'Background',width:1920,height:1080,pixelAspect:1,mainSource:new SolidSource()}; shared.mainSource.color=[1,0,0];
    const anchor = {value:[960,540],numKeys:0,setValue(value){this.value=value}};
    const layer = new AVLayer(); layer.source=shared; layer.locked=true;
    layer.replaceSource=function(source){this.source=source}; layer.property=()=>({property:()=>anchor});
    let removed = false;
    const comp = {width:1080,height:1920,pixelAspect:1,duration:10,numLayers:1,layer:()=>layer,layers:{addSolid(color,name,width,height,pixelAspect){return {source:{name,width,height,pixelAspect},remove(){removed=true}}}}};
    conformContext.aetoolkitCepConformCompSolids(comp);
    assert.equal(layer.source.width,1080); assert.equal(layer.source.height,1920);
    assert.equal(shared.width,1920); assert.equal(shared.height,1080);
    assert.deepEqual(anchor.value,[540,960]); assert.equal(layer.locked,true); assert(removed);
    console.log('PASS comp solid conform creates independent sources, preserves locks, and shifts anchor center');
}

{
    const projectPath='/Jobs/Still/Source.aep';
    const metadata={getStructField(ns,field){return field==='aeProjectLink'?{value:projectPath}:null},getProperty(){return null}};
    for (const extension of ['png','jpg','tif','exr']) {
        let closed=false;
        function ImageFile(name){this.fsName=name;this.name=name.split('/').pop();this.exists=false;}
        const ctx={JSON:undefined,File:ImageFile,XMPConst:{NS_CREATOR_ATOM:'creator',NS_DM:'dynamic',FILE_UNKNOWN:0,OPEN_FOR_READ:1},XMPFile:function(){this.getXMP=()=>metadata;this.closeFile=()=>{closed=true}}};
        vm.createContext(ctx);vm.runInContext(source,ctx);
        assert.equal(ctx.aetoolkitCepReadFootageSourceLinks(new ImageFile('/Render/still.'+extension)).paths[0],projectPath);assert(closed);
        ctx.XMPFile=function(){throw new Error('No embedded packet')};
        ImageFile.prototype.open=function(){return true};ImageFile.prototype.read=function(){return 'fixture'};ImageFile.prototype.close=function(){};
        ctx.File=function(name){const f=new ImageFile(name);f.exists=name==='/Render/still.xmp';f.length=7;return f};ctx.XMPMeta=function(){return metadata};
        assert.equal(ctx.aetoolkitCepReadFootageSourceLinks(new ImageFile('/Render/still.'+extension)).paths[0],projectPath);
    }
    console.log('PASS rendered-image discovery routes embedded XMP and sidecars without filtering image extensions (mocked metadata reader)');
}

{
 const header='<AfterEffectsProject><pcms bdata="01"/><cpid bdata="abc"/><PwCs bdata="01"/><string>{"baseColorProfile":{"colorProfileName":"Rec.709 Gamma 2.4"}}</string><ProjectXMPMetadata>';
 assert.equal(context.aetoolkitCepParseProjectColor(header,true),'Rec.709 Gamma 2.4');
 assert.throws(()=>context.aetoolkitCepParseProjectColor(header.replace('bdata="01"','bdata="02"'),true),/Unsupported/);
 assert.throws(()=>context.aetoolkitCepParseProjectColor('not a project',false));
 console.log('PASS source-project working-space parser and unsupported format rejection');
}
