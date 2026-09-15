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
