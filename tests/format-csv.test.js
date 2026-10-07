const assert = require('assert');
const csv = require('../client/js/format-csv.js');
const store = require('../client/js/template-store.js');
const header = 'CLIENT,PREFIX (Menu Item Name),ASPECT (Format Code),SizeX,SizeY,Matte,Chart1,Chart2\r\n';
const text = '\uFEFF' + header +
    'Default (Mocean),Scope,239,3840,2160,IN PROGRESS,IN PROGRESS,\r\n' +
    'Amazon,"Amazon Story, Safe",AZ-STRY,1080,1920,N/A,/Volumes/Guides/Story.png\',\r\n' +
    ',Amazon Square,AZ-1x1,1080,1080,N/A,"C:\\Guides\\Square, updated.png",\r\n' +
    'CNN,CNN Tik Tok,CNN-TT,1080,1920,N/A,need a safe zone,TTsafe chart\r\n' +
    'Netflix,Netflix Tik Tok,NF-TT,,,N/A,,\r\n';
const parsed = csv.parse(text);
assert.equal(parsed.rows.length, 4);
assert.deepEqual(parsed.clients, ['Default','Amazon','CNN','Netflix']);
assert.equal(parsed.rows[1].assets.chartOne,'/Volumes/Guides/Story.png');
assert.equal(parsed.rows[2].client,'Amazon');
assert.equal(parsed.rows[2].assets.chartOne,'C:/Guides/Square, updated.png');
assert.deepEqual(parsed.rows[3].assets,{matte:''});
assert(parsed.notices.some(n => n.includes('Netflix')));
assert.throws(() => csv.parse('CLIENT,SizeX\nAmazon,1920'), /column missing/);
assert.throws(() => csv.parse(header + 'Amazon,"Unclosed'), /Unclosed/);

const original = store.defaultState();
const first = csv.merge(original,parsed);
assert.equal(first.counts.aspect.added,4); assert.equal(first.counts.checker.added,4);
assert.equal(first.state.compPresets.length,18); assert.equal(first.state.checkerPresets.length,4);
assert.deepEqual(first.state.compPresets.slice(0,14),original.compPresets);
assert.equal(original.compPresets.length,14);
const persisted = JSON.parse(JSON.stringify(first.state));
const again = csv.merge(persisted,csv.parse(text));
assert.equal(again.changes.length,0);
assert.equal(again.counts.aspect.unchanged,4);
assert.deepEqual(again.state,persisted);
const changed = csv.merge(persisted,csv.parse(text.replace('Amazon Square','Amazon Square v2').replace('Square, updated.png','Square, latest.png')));
assert.equal(changed.counts.aspect.updated,1); assert.equal(changed.counts.checker.updated,1);
assert.equal(changed.changes.length,2);
assert.equal(changed.state.compPresets.length,persisted.compPresets.length);
assert.equal(changed.state.checkerPresets.length,persisted.checkerPresets.length);
const partial = csv.merge(persisted,csv.parse(header + 'Amazon,Amazon Story,AZ-STRY,1080,1920,,IN PROGRESS,\n'));
assert.equal(partial.state.compPresets.find(p => p.formatCode==='AZ-STRY').assets.chartOne,'/Volumes/Guides/Story.png');
assert(partial.state.compPresets.some(p => p.formatCode==='AZ-1x1'));
const invalid = csv.merge(persisted,csv.parse(header + 'Amazon,New name,AZ-STRY,,1920,,,\n'));
assert.equal(invalid.changes.length,0);
const duplicate = csv.parse(header+'Amazon,Story,AZ-STRY,1080,1920,,,\n,Story,AZ-STRY,1080,1920,,,\n');
assert.equal(duplicate.rows.length,1);
const conflict = csv.parse(header+'Amazon,Story,AZ-STRY,1080,1920,,,\n,Conflicting,AZ-STRY,1920,1080,,,\n');
assert.equal(conflict.rows.length,0); assert(conflict.notices.some(n=>n.includes('conflicting duplicate')));
const crossClient = csv.merge(original,csv.parse(header+'Amazon,Social,TT,1080,1920,,,\nApple,Social,TT,1080,1920,,,\n'));
assert.equal(crossClient.counts.aspect.added,2);
assert.notEqual(crossClient.state.compPresets[14].id,crossClient.state.compPresets[15].id);
const normalized = store.normalizeCompPreset(changed.state.compPresets.find(p=>p.formatCode==='AZ-1x1'));
assert.equal(normalized.client,'Amazon'); assert.equal(normalized.importSource,'format-csv');
const reassigned = JSON.parse(JSON.stringify(persisted));
reassigned.compPresets.filter(p=>p.client==='Amazon').forEach(p=>{p.client='Default';delete p.importSource;});
const recreated = csv.merge(reassigned,parsed);
assert.equal(new Set(recreated.state.compPresets.map(p=>p.id)).size,recreated.state.compPresets.length);
assert.equal(csv.merge(recreated.state,parsed).counts.aspect.added,0);
const removed = store.removeCompPreset(persisted,persisted.compPresets.find(p=>p.formatCode==='AZ-STRY').id);
assert.equal(csv.merge(removed,parsed).state.compPresets.filter(p=>p.client==='Amazon'&&p.formatCode==='AZ-STRY').length,0);
const withFPS = csv.parse(header.trim()+',FPS\nToolbox Test,HD Test,HD-TEST,1920,1080,N/A,,,24\n');
assert.equal(withFPS.rows[0].fps,24);
const fpsState = csv.merge(original,withFPS).state;
assert.equal(fpsState.compPresets.find(p=>p.formatCode==='HD-TEST').fps,24);
assert.equal(fpsState.checkerPresets[0].fps,24);
assert.equal(csv.merge(fpsState,csv.parse(header+'Toolbox Test,HD Test,HD-TEST,1920,1080,N/A,,,\n')).state.checkerPresets[0].fps,24);
assert.equal(csv.parse(header.trim()+',FPS\nToolbox Test,Bad,BAD,1920,1080,N/A,,,zero\n').rows.length,0);
assert.throws(()=>store.normalizeCompPreset({name:'Bad FPS',width:1920,height:1080,fps:500}),/FPS/);
console.log('PASS client CSV parsing, inheritance, guide normalization, incremental imports, duplicates, incomplete rows, and default preservation');
