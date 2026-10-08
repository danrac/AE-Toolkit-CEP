const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../host/host.jsx'), 'utf8');

class Item {
    constructor(name, parent) { this.name = name; if (parent) this.parentFolder = parent; }
    get parentFolder() { return this._parent; }
    set parentFolder(folder) {
        if (this._parent) this._parent.children.splice(this._parent.children.indexOf(this), 1);
        this._parent = folder; folder.children.push(this);
    }
}
class FolderItem extends Item {
    constructor(name, parent) { super(name, parent); this.children = []; }
    get numItems() { return this.children.length; }
    item(index) { return this.children[index - 1]; }
}
class CompItem extends Item {}
class File {
    constructor(value) { this.fsName = value; this.name = value.split('/').pop(); this.exists = !value.includes('Missing'); }
}
class FootageItem extends Item { constructor(name, file) { super(name); this.file = new File(file); } }
function setup() {
    const root = new FolderItem('Root'), importedFolders = [], calls = [];
    const project = {
        rootFolder: root, selection: [],
        items: { addFolder(name) { return new FolderItem(name, root); } },
        importFile(options) {
            calls.push(options.file.fsName);
            if (options.file.fsName.includes('Broken')) throw new Error('Invalid project');
            const folder = new FolderItem(options.file.name, root);
            const nested = new FolderItem('Comps', folder);
            for (const name of ['Spot', 'Spot_v02', 'Spot_v03', 'Other', 'Full_24fps', 'CaseName', 'casename', 'Duplicate', 'Duplicate']) new CompItem(name, nested);
            const dependencies = new FolderItem('Dependencies', nested);
            const dependency = new CompItem('Dependency', dependencies);
            nested.item(1).dependency = dependency;
            importedFolders.push(folder); return folder;
        }
    };
    const undo = {begins:0, ends:0};
    const context = {JSON:undefined, $:{os:'Macintosh'}, File, FolderItem, CompItem, FootageItem,
        ImportOptions:function(file){this.file=file;},
        app:{project, beginUndoGroup(){undo.begins++;}, endUndoGroup(){undo.ends++;}}};
    vm.createContext(context); vm.runInContext(source, context);
    context.aetoolkitCepSourceProjectFile = value => /\.aepx?$/i.test(value) ? new File(value) : null;
    return {context, project, root, importedFolders, calls, undo};
}
const env = setup(), {context} = env;
const comps = ['Spot', 'Spot_v02', 'Spot_v02_24fps', 'Spot_v020', 'Spot_v03'].map(name => new CompItem(name));
function match(render) { return context.aetoolkitCepSourceCompMatch(comps, render); }
for (const render of ['Spot_v02_24fps_1920x1080.mov', 'Spot_v02_23.976fps_1920x1080.MOV', 'Spot_v02_23_976FPS_1920X1080.mp4', 'Spot_v02_1920x1080.png', 'Spot_v02_1920x1080_[#####].exr', 'Spot_v02_1920x1080_00001.exr', 'Spot_v02_29_97fps.mov']) {
    const matches = match(render);
    // A comp whose own name includes FPS is the closer name when present.
    assert.equal(matches.length, 1);
    assert.equal(matches[0].comp.name, render.startsWith('Spot_v02_24fps') ? 'Spot_v02_24fps' : 'Spot_v02', render);
}
assert.equal(match('Spot_v02.mov')[0].comp.name, 'Spot_v02');
assert.equal(match('SPOT_V02_1920x1080.mov')[0].comp.name, 'Spot_v02');
assert.equal(match('Spot_v02_delivery_1920x1080.mov')[0].comp.name, 'Spot_v02');
assert.equal(match('Spotlight_1920x1080.mov').length, 0, 'Partial words do not count as prefixes');
assert.equal(context.aetoolkitCepSourceName('Spot_v02_23_976fps_1920x1080_[#####].exr'), 'Spot_v02');
assert.equal(context.aetoolkitCepSourceCompMatch([new CompItem('Spot_v02'), new CompItem('Spot_v02')], 'Spot_v02.mov').length, 1);
assert.equal(context.aetoolkitCepSourceCompMatch([new CompItem('CASE'), new CompItem('case')], 'Case_delivery.mov').length, 2, 'Distinct tied names need review');
console.log('PASS source-comp matching: exact names, FPS/size/sequence suffixes, case, longest prefix, duplicate names and ties');

context.aetoolkitCepEnsureXmp = () => {};
context.aetoolkitCepSourceProjectColorSpace = () => 'Rec.709 Gamma 2.4';
context.aetoolkitCepReadFootageSourceLinks = file => ({paths: file.name.startsWith('Other') ? ['/Sources/B.aep'] : ['/Sources/A.aep'], notices:[]});
env.project.selection = [new FootageItem('Renamed in AE', '/Renders/Spot_v02_1920x1080.mov'), new FootageItem('Another label', '/Renders/Spot_v03_1920x1080.png'), new FootageItem('Other label', '/Renders/Other_1920x1080.mov')];
const discovery = JSON.parse(context.aetoolkitCepDiscoverSourceProjects());
assert.deepEqual(discovery.records.map(record => record.sourceNames), [['Spot_v02_1920x1080.mov', 'Spot_v03_1920x1080.png'], ['Other_1920x1080.mov']]);
assert.equal(discovery.records.length, 2);
console.log('PASS discovery preserves original render filenames and associations to each source project');

function run(paths, records) { return JSON.parse(context.aetoolkitCepImportSourceProjects(JSON.stringify({paths, records}))); }
let result = run(['/Sources/A.aep', '/Sources/B.aep'], discovery.records);
assert.equal(result.imported, 2); assert.equal(result.isolated, 3); assert.deepEqual(result.errors, []);
const isolated = env.root.children.find(folder => folder.name === 'ImportedComps');
assert.deepEqual(isolated.children.map(comp => comp.name), ['Spot_v02', 'Spot_v03', 'Other']);
assert.equal(env.importedFolders[0].item(1).children.some(comp => comp.name === 'Other'), true, 'Other project renders cannot move a comp from the wrong project');
assert.equal(env.importedFolders[0].item(1).item(1).dependency.name, 'Dependency', 'Comp dependencies are preserved');
result = run(['/Sources/A.aep', '/Sources/A.aep'], discovery.records);
assert.equal(result.imported, 1); assert.equal(result.isolated, 0);
assert.deepEqual(result.matches.map(match => match.status), ['reused', 'reused']);
assert.equal(isolated.numItems, 3, 'Repeated imports do not add same-named comps');
assert.equal(env.importedFolders[2].item(1).children.some(comp => comp.name === 'Spot_v02'), true, 'Duplicate copy stays with its source project');
result = run(['/Sources/C.aep'], [{path:'/Sources/C.aep', sourceNames:['Duplicate_1920x1080.mov', 'MissingComp_1920x1080.mov', 'CASENAME_delivery.mov']}]);
assert.deepEqual(result.matches.map(match => match.status), ['moved', 'unmatched', 'ambiguous']);
assert.equal(isolated.children.filter(comp => comp.name === 'Duplicate').length, 1);
assert.deepEqual(result.matches[2].candidates, ['CaseName', 'casename']);
result = run(['/Sources/Missing.aep', '/Sources/Broken.aep', '/Sources/Good.aep'], [{path:'/Sources/Good.aep', sourceNames:['Spot_1920x1080.mov']}]);
assert.equal(result.imported, 1); assert.equal(result.errors.length, 2); assert.equal(result.isolated, 1);
assert.equal(env.undo.begins, env.undo.ends, 'Import failures close the undo group');
assert.equal(JSON.parse(context.aetoolkitCepImportSourceProjects(JSON.stringify({paths:['/Sources/Legacy.aep'], sourceNames:['Full_24fps_1920x1080.mov']}))).isolated, 1, 'Legacy callers still match');
console.log('PASS import integration: live folder mutation, scoped matching, same-name deduplication, preserved dependencies, review results and failures');
