const assert = require('assert');
const store = require('../client/js/template-store.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

test('Default template resolves semantic locations from a Mac root', () => {
    let state = store.defaultState();
    state = store.assignProject(state, { name: 'Launch', root: '/Volumes/Jobs/Launch', templateId: 'default-motion' });
    const paths = store.resolveProjectPaths(state, 'launch');
    assert.equal(paths.assets, '/Volumes/Jobs/Launch/Assets');
    assert.equal(paths.outputs, '/Volumes/Jobs/Launch/Outputs');
});

test('Custom templates support Windows project roots and assignment', () => {
    let state = store.defaultState();
    state = store.upsertTemplate(state, { name: 'Editorial', folders: { afterEffects: 'After Effects', assets: 'Media', toGfx: 'Incoming', outputs: 'Renders', styleFrames: '' }, customFolders: [{ label: 'Delivery', path: 'Renders/Delivery' }] });
    state = store.assignProject(state, { name: 'Edit', root: 'D:\\Shows\\Edit', templateId: 'editorial' });
    const paths = store.resolveProjectPaths(state, 'edit');
    assert.equal(paths.afterEffects, 'D:/Shows/Edit/After Effects');
    assert.equal(paths.styleFrames, '');
    assert.equal(paths.delivery, 'D:/Shows/Edit/Renders/Delivery');
});

test('Template folders reject absolute and parent-traversal paths', () => {
    assert.throws(() => store.validateTemplate({ name: 'Unsafe', folders: { assets: '../assets' } }));
    assert.throws(() => store.validateTemplate({ name: 'Unsafe', folders: { assets: 'C:/assets' } }));
});

test('Custom locations require unique labels and safe relative paths', () => {
    assert.throws(() => store.validateTemplate({ name: 'Unsafe', folders: {}, customFolders: [{ label: 'Assets', path: 'One' }] }));
    assert.throws(() => store.validateTemplate({ name: 'Unsafe', folders: {}, customFolders: [{ label: 'Delivery', path: '../delivery' }] }));
});

test('Connected projects retain one active project and can be removed safely', () => {
    let state = store.defaultState();
    state = store.assignProject(state, { name: 'One', root: '/Jobs/One', templateId: 'default-motion' });
    state = store.assignProject(state, { name: 'Two', root: '/Jobs/Two', templateId: 'default-motion' });
    state = store.setActiveProject(state, 'two');
    state = store.removeProject(state, 'two');
    assert.equal(state.activeProjectId, 'one');
    assert.equal(state.projects.length, 1);
});

console.log(`${passed} tests passed.`);

const presetState = store.defaultState();
const savedPresetState = store.upsertCompPreset(presetState, { name: '2.39 Scope', width: 2048, height: 858, assets: { matte: '/UserData/matte.png' } });
const scopePreset = store.compPresets(savedPresetState).filter(preset => preset.name === '2.39 Scope')[0];
assert.equal(scopePreset.width, 2048);
assert.equal(scopePreset.assets.matte, '/UserData/matte.png');
assert.throws(() => store.normalizeCompPreset({ name: 'Bad', width: 0, height: 100 }));
console.log('PASS composition formats validate dimensions and retain guide asset locations');

for (const invalid of ['/Users/example/Assets', '//server/share', 'C:relative', 'Assets/..', '.', '..']) {
    assert.throws(() => store.validateTemplate({ name: 'Unsafe', folders: { assets: invalid } }));
}
console.log('PASS Mac, Windows, UNC, and trailing traversal paths are rejected in templates');

const customOrder = ['job', 'style', 'description', 'format', 'version', 'initials'];
let namedState = store.upsertTemplate(store.defaultState(), { id: 'naming-test', name: 'Naming test', folders: {}, namingOrder: customOrder });
namedState = JSON.parse(JSON.stringify(namedState));
assert.deepEqual(store.namingFields(namedState.templates[1]).map(field => field.id), customOrder);
assert.deepEqual(store.namingOrder({}), ['job', 'format', 'style', 'description', 'version', 'initials']);
assert.throws(() => store.namingOrder({ namingOrder: ['job', 'job', 'style', 'description', 'version', 'initials'] }));
console.log('PASS template naming order persists and validates unique fields');

const typedFields = [{ id: 'client', label: 'Client', type: 'text', value: 'Acme' }, { id: 'revision', label: 'Revision', type: 'version', value: '1', prefix: 'v', digits: 2 }, { id: 'format', label: 'Format', type: 'format', value: '' }];
const typed = store.validateTemplate({ name: 'Typed', folders: {}, namingFields: typedFields });
assert.equal(store.formatNaming(typed.namingFields, {}, 'HD'), 'Acme_v01_HD');
assert.equal(store.formatNaming(typed.namingFields, { revision: '12', client: 'New Client' }, 'Square'), 'New_Client_v12_Square');
assert.equal(store.namingFields({ namingOrder: customOrder })[4].type, 'version');
assert.throws(() => store.namingFields({ namingFields: [] }));
assert.throws(() => store.namingFields({ namingFields: [{ id: 'v', label: 'Version', type: 'version', value: '-1' }] }));
console.log('PASS typed naming fields migrate, format versions, and validate input');

const previewFields = store.namingFields({});
assert.equal(store.previewNaming(previewFields), '[Job]_HD_[Style]_[Description]_v01_[Initials]');
previewFields[0].label = 'Client';
assert.ok(store.previewNaming(previewFields).startsWith('[Client]_HD_'));
previewFields[0].value = 'ABA';
assert.ok(store.previewNaming(previewFields).startsWith('ABA_HD_'));
previewFields.reverse();
assert.ok(store.previewNaming(previewFields).startsWith('[Initials]_v01_'));
assert.equal(store.formatNaming(store.namingFields({}), {}, 'HD'), 'HD_v01');
console.log('PASS template preview shows empty modules without changing generated names');

const fs = require('fs'), path = require('path');
assert.equal(store.defaultCompPresets().length, 14);
for (const preset of store.defaultCompPresets()) for (const asset of Object.values(preset.assets)) assert.ok(fs.existsSync(path.join(__dirname, '../host/guide-assets', asset.slice(8))));
const customSaved = { id: 'hd', name: 'My HD', width: 1920, height: 1080, assets: { matte: '/custom.png' } };
assert.deepEqual(store.compPresets({ compPresets: [customSaved] })[0], customSaved);
assert.equal(store.compPresets({ compPresets: [{ id: 'hd', name: 'HD', width: 1920, height: 1080, assets: {} }] })[0].assets.chartOne, 'bundled:HD_chart.psd');
console.log('PASS all 14 bundled formats have guides and preserve user presets');

const tikTok = store.defaultCompPresets().find(p => p.id === 'vertical-tiktok');
assert.equal(store.compFormatCode(tikTok), '9x16');
assert.equal(store.compFormatCode({ id: 'vertical-tiktok', name: '9:16 TikTok safe', width: 1080, height: 1920 }), '9x16');
assert.equal(store.formatNaming(store.namingFields({}), { job: 'ABA', style: 'A', description: 'new', initials: 'dr' }, store.compFormatCode(tikTok)), 'ABA_9x16_A_new_v01_dr');
assert.equal(store.normalizeCompPreset({ name: 'Custom', width: 100, height: 100, formatCode: 'SQ' }).formatCode, 'SQ');
console.log('PASS naming codes stay independent of preset display names');

 test('Format asset lists preserve extra mattes and guides across serialization', () => {
   const assets = { matte: '', chartOne: 'bundled:HD_chart.psd', matte_extra: 'bundled:9x16_matte.png', guide_extra: 'bundled:9x16_chart.psd' };
   const state = store.upsertCompPreset(store.defaultState(), { name: 'Multi guide', width: 1080, height: 1920, assets });
   assert.deepEqual(store.compPresets(JSON.parse(JSON.stringify(state))).find(p => p.id === 'multi-guide').assets, assets);
 });
 test('Removed built-in formats stay removed and can be recreated', () => {
   let state = store.defaultState();
   store.compPresets(state).forEach(p => { state = store.removeCompPreset(state, p.id); });
   assert.equal(store.compPresets(JSON.parse(JSON.stringify(state))).length, 0);
   state = store.upsertCompPreset(state, store.defaultCompPresets()[0]);
   assert.equal(store.compPresets(state).length, 1);
 });

test('Render destinations migrate defaults and follow template edits on Mac and Windows', () => {
    for (const root of ['/Volumes/Jobs/Spot', 'D:/Jobs/Spot']) {
        let state = store.assignProject(store.defaultState(), {name:'Spot',root,templateId:'default-motion'});
        assert.deepEqual(store.resolveRenderPaths(state,'spot'), {offline:root+'/Outputs/Offline',online:root+'/Outputs/Online',checker:root+'/Outputs/Checkers',styleFrames:root+'/Outputs/Style Frames'});
        const template = state.templates[0];
        template.folders.outputs = 'Delivery'; template.renderFolders={offline:'Review/v1',online:'Final',checker:''};
        state=store.upsertTemplate(state,template);
        assert.equal(store.resolveRenderPaths(state,'spot').offline,root+'/Delivery/Review/v1');
        assert.equal(store.resolveRenderPaths(state,'spot').online,root+'/Delivery/Final');
        assert.equal(store.resolveRenderPaths(state,'spot').checker,root+'/Delivery');
        template.renderFolders.offline='../outside'; assert.throws(()=>store.upsertTemplate(state,template));
    }
});

test('CEP Node context also exports the template API to the browser window', () => {
    const fs=require('fs'),vm=require('vm'); const context={window:{},module:{exports:{}}};
    vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../client/js/template-store.js'),'utf8'),context);
    assert.equal(typeof context.window.AEToolkitTemplates.defaultState,'function');
    assert.equal(context.module.exports,context.window.AEToolkitTemplates);
});

 test('Reassigning a saved project changes only its template and persists resolved paths', () => {
    let original = store.defaultState();
    original = store.upsertTemplate(original, {id:'alternate',name:'Alternate',folders:{outputs:'Deliverables',assets:'Media'}});
    original = store.assignProject(original,{id:'one',name:'One',root:'/Jobs/One',templateId:'default-motion'});
    original = store.assignProject(original,{id:'two',name:'Two',root:'/Jobs/Two',templateId:'default-motion'});
    const updated = store.assignProject(original,{...original.projects[0],templateId:'alternate'});
    const restored = JSON.parse(JSON.stringify(updated));
    assert.equal(restored.projects.length,2);
    assert.equal(restored.activeProjectId,original.activeProjectId);
    assert.equal(restored.projects[0].root,'/Jobs/One');
    assert.equal(restored.projects[0].name,'One');
    assert.equal(store.resolveProjectPaths(restored,'one').outputs,'/Jobs/One/Deliverables');
    assert.deepEqual(restored.projects[1],original.projects[1]);
    assert.equal(original.projects[0].templateId,'default-motion');
    assert.throws(()=>store.assignProject(original,{...original.projects[0],templateId:'missing'}));
});
