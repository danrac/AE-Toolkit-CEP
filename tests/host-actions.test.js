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

let defaultFolder, importDialogCalls = 0;
const importContext = { Folder: FakeFolder, app: { project: { setDefaultImportFolder(folder) { defaultFolder = folder.fsName; }, importFileWithDialog() { importDialogCalls++; return [{}]; } } } };
vm.createContext(importContext);
vm.runInContext(source, importContext);
assert.equal(importContext.aetoolkitCepImportFromFolder('/Job/Output'), 'Imported selected assets.');
assert.equal(defaultFolder, '/Job/Output');
assert.equal(importDialogCalls, 1);
console.log('PASS host import uses one After Effects import dialog without duplicate import');
