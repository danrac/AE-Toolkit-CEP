const assert = require('assert');
const store = require('../client/js/template-store.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

test('Default template resolves semantic locations from a Mac root', () => {
    let state = store.defaultState();
    state = store.assignProject(state, { name: 'Launch', root: '/Volumes/Jobs/Launch', templateId: 'default-motion' });
    const paths = store.resolveProjectPaths(state, 'launch');
    assert.equal(paths.assets, '/Volumes/Jobs/Launch/05_GFX/03_Assets');
    assert.equal(paths.outputs, '/Volumes/Jobs/Launch/05_GFX/07_Output');
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
