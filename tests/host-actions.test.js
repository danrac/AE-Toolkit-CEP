const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../host/host.jsx'), 'utf8');
function FixedDate() { this.getFullYear = () => 2026; this.getMonth = () => 8; this.getDate = () => 15; }
const context = { JSON, Date: FixedDate };
vm.createContext(context);
vm.runInContext(source, context);

assert.equal(context.aetoolkitCepNormalizeSubfolder('Delivery\\v01'), 'Delivery/v01');
assert.equal(context.aetoolkitCepNormalizeSubfolder('/Delivery/v01/'), 'Delivery/v01');
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
    items: { add(comp) { const item = { render: true, comp, outputModule() { return { applyTemplate(name) { this.template = name; }, file: null }; } }; renderQueue._items.push(item); renderQueue.numItems++; return item; } },
    render() { this.didRender = true; }
};
const renderContext = { JSON, Date: FixedDate, Folder: FakeFolder, File: FakeFile, CompItem: FakeCompItem, app: { project: { file: { fsName: '/Job/test.aep' }, selection: [new FakeCompItem('Title')], renderQueue } } };
vm.createContext(renderContext);
vm.runInContext(source, renderContext);
const result = renderContext.aetoolkitCepRenderSelected(JSON.stringify({ mode: 'offline', basePath: '/Job/Output', subfolder: 'Delivery\\v01' }));
assert.ok(/^Rendered 1 composition/.test(result));
assert.equal(renderQueue.didRender, true);
assert.equal(existingQueueItem.render, true);
assert.equal(folders['/Job/Output/260915/Delivery/v01'], true);
console.log('PASS host render preserves existing queue state and creates dated output paths');

const importFiles = { '/assets/a.mov': true, '/assets/b.mov': true }, importFolders = { '/assets': true }, importedAssets = [];
function ImportFile(value) { this.fsName = normalize(value); this.name = this.fsName.split('/').pop(); }
Object.defineProperty(ImportFile.prototype, 'exists', { get() { return !!importFiles[this.fsName]; } });
function ImportFolder(value) { this.fsName = normalize(value); }
Object.defineProperty(ImportFolder.prototype, 'exists', { get() { return !!importFolders[this.fsName]; } });
function ImportOptions(file) { this.file = file; }
const importContext = { JSON, File: ImportFile, Folder: ImportFolder, ImportOptions, $: { os: 'Macintosh' }, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { importFile(options) { importedAssets.push(options.file.fsName); } } } };
vm.createContext(importContext);
vm.runInContext(source, importContext);
const importSummary = JSON.parse(importContext.aetoolkitCepImportAssetPaths('/assets/\na.mov\na.mov\nfile:///assets/b.mov'));
assert.equal(importSummary.imported, 2);
assert.deepEqual(importedAssets, ['/assets/a.mov', '/assets/b.mov']);
console.log('PASS host pasted-path import deduplicates files and accepts folder headers and file URLs');

const sourceContext = { JSON, XMPConst: { NS_CREATOR_ATOM: 'creator', NS_DM: 'dynamic' } };
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
assert.equal(created.name, 'Job_HD_Main_Title_AB_01');
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
const conformContext = { JSON, CompItem: EditComp, AVLayer, SolidSource, app: { beginUndoGroup() {}, endUndoGroup() {}, project: { activeItem: conformComp } } };
vm.createContext(conformContext);
vm.runInContext(source, conformContext);
const conformed = JSON.parse(conformContext.aetoolkitCepConformSelectedSolids());
assert.equal(conformed.conformed, 1);
assert.equal(solidLayer.source.width, 3840);
assert.equal(solidLayer.source.height, 2160);
console.log('PASS host conform solids only changes selected solid sources');

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
const organizeContext = { JSON, FolderItem: OrganizeFolder, CompItem: OrganizeComp, FootageItem: OrganizeFootage, SolidSource: OrganizeSolidSource, app: { beginUndoGroup() {}, endUndoGroup() {}, project: organizeProject } };
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
