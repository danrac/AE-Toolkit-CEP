const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const backup = require('../client/js/shared-backup.js');
const io = fs.promises;
async function run() {
    const tmp = await io.mkdtemp(path.join(os.tmpdir(),'toolbox-backup-test-'));
    try {
        const local=path.join(tmp,'local'),shared=path.join(tmp,'shared'),external=path.join(tmp,'external-guide.png');
        await io.mkdir(path.join(shared,'guide-assets'),{recursive:true});
        await io.mkdir(path.join(shared,'checker-one','media'),{recursive:true}); await io.mkdir(local);
        const ordinaryLocal=JSON.stringify({templates:[{id:'local'}],projects:[{id:'personal'}]});
        await io.writeFile(path.join(local,'project-templates.json'),ordinaryLocal);
        await io.writeFile(path.join(shared,'guide-assets','grid.png'),'shared grid'); await io.writeFile(external,'external v1');
        await io.writeFile(path.join(shared,'guide-assets','obsolete.png'),'unused guide');
        await io.mkdir(path.join(shared,'resources'));await io.writeFile(path.join(shared,'resources','extra.png'),'extra relative guide');
        await io.writeFile(path.join(shared,'checker-one','template.json'),JSON.stringify({version:2,templates:[{name:'Checker'}],media:[]}));
        await io.writeFile(path.join(shared,'checker-one','project.aepx'),'<project/>'); await io.writeFile(path.join(shared,'checker-one','media','source.psd'),'checker image');
        await io.writeFile(path.join(shared,'unrelated.txt'),'not owned by Toolbox');
        const state={templates:[{id:'studio'}],projects:[{id:'job'}],libraryRevision:1,presetClients:['Studio'],compPresets:[{id:'hd',client:'Studio',assets:{chartOne:external,chartTwo:'library:guide-assets/grid.png',guide_extra:'library:resources/extra.png'}}],checkerPresets:[{id:'hd-checker',assets:{matte:external}}],curvePresets:[{id:'ease'}],namingPresets:[{id:'names'}]};
        const statePath=path.join(shared,'project-templates.json');await io.writeFile(statePath,JSON.stringify(state));
        const first=await backup.sync(local,shared);
        assert.equal(first.metadata.revision,1);assert.equal(first.state.projects[0].id,'job');
        assert.equal(await io.readFile(path.join(first.root,'guide-assets','grid.png'),'utf8'),'shared grid');
        assert.equal(await io.readFile(path.join(first.root,'checker-one','media','source.psd'),'utf8'),'checker image');
        assert.equal(await io.readFile(path.join(first.root,'resources','extra.png'),'utf8'),'extra relative guide');
        assert.equal(fs.existsSync(path.join(first.root,'unrelated.txt')),false);
        assert.equal(await io.readFile(path.join(local,'project-templates.json'),'utf8'),ordinaryLocal);
        const offline=backup.offlineState(first);
        assert.equal(await io.readFile(offline.compPresets[0].assets.chartOne,'utf8'),'external v1');
        assert.equal(offline.compPresets[0].assets.chartTwo,'library:guide-assets/grid.png');
        assert.equal(state.compPresets[0].assets.chartOne,external);
        const same=await backup.sync(local,shared);assert.equal(same.generation,first.generation,'No new generation for unchanged data');
        state.libraryRevision=2;state.compPresets[0].name='Updated';await io.writeFile(statePath,JSON.stringify(state));await io.writeFile(external,'external version 2');
        const second=await backup.sync(local,shared);assert.notEqual(second.generation,first.generation);assert.equal(second.metadata.revision,2);
        assert.equal(await io.readFile(backup.offlineState(second).compPresets[0].assets.chartOne,'utf8'),'external version 2');
        assert.equal(await io.readFile(offline.compPresets[0].assets.chartOne,'utf8'),'external v1','Previous snapshot files never change');
        await io.unlink(external);await io.unlink(path.join(shared,'guide-assets','grid.png'));await io.unlink(path.join(shared,'guide-assets','obsolete.png'));state.libraryRevision=3;await io.writeFile(statePath,JSON.stringify(state));
        const third=await backup.sync(local,shared);
        assert.equal(await io.readFile(backup.offlineState(third).compPresets[0].assets.chartOne,'utf8'),'external version 2','Unavailable external guide keeps its last good copy');
        assert(third.metadata.warnings.some(w=>w.includes('retained previous')));
        assert.equal(await io.readFile(path.join(third.root,'guide-assets','grid.png'),'utf8'),'shared grid','A still-referenced guide retains its last good copy');
        assert.equal(fs.existsSync(path.join(third.root,'guide-assets','obsolete.png')),false,'Removed unreferenced managed files do not remain in the current mirror');
        assert.equal(fs.existsSync(first.root),false,'Only the current and previous generations remain');
        const originalCopy=io.copyFile;
        await io.writeFile(path.join(shared,'checker-one','project.aepx'),'<project><changed/></project>');
        try {
            io.copyFile=async function(){const error=new Error('Simulated disk full');error.code='ENOSPC';throw error;};
            await assert.rejects(backup.sync(local,shared),/disk full/);
        } finally {io.copyFile=originalCopy;}
        assert.equal((await backup.load(local,shared)).generation,third.generation,'A failed copy cannot replace the previous backup');
        try {
            io.copyFile=async function(from,to){await originalCopy.call(io,from,to);state.libraryRevision=4;await io.writeFile(statePath,JSON.stringify(state));};
            await assert.rejects(backup.sync(local,shared),/changed during backup/);
        } finally {io.copyFile=originalCopy;state.libraryRevision=3;await io.writeFile(statePath,JSON.stringify(state));}
        assert.equal((await backup.load(local,shared)).generation,third.generation,'Concurrent source edits discard the unfinished snapshot');
        await io.writeFile(statePath,'{broken');await assert.rejects(backup.sync(local,shared));
        assert.equal((await backup.load(local,shared)).generation,third.generation,'Corrupt source cannot replace the good backup');
        await io.writeFile(statePath,JSON.stringify(state));await io.writeFile(statePath+'.lock','writer');
        await assert.rejects(backup.sync(local,shared),/being saved/);await io.unlink(statePath+'.lock');
        assert.equal(fs.existsSync(path.join(backup.location(local,shared),'backup.lock')),false,'Failed sync releases local lock');
        const missingSource=shared+'-offline';await io.rename(shared,missingSource);
        assert.equal(backup.available(shared),false);
        const lost=await backup.load(local,shared);assert.equal(lost.state.libraryRevision,3);assert.equal(lost.state.presetClients[0],'Studio');
        assert.equal(fs.existsSync(path.join(lost.root,'checker-one','project.aepx')),true);
        assert.equal(await io.readFile(path.join(local,'project-templates.json'),'utf8'),ordinaryLocal);
        await io.rename(missingSource,shared);
        const other=path.join(tmp,'other');await io.mkdir(other);const otherState={templates:[{id:'other'}],projects:[],libraryRevision:1};await io.writeFile(path.join(other,'project-templates.json'),JSON.stringify(otherState));
        const otherBackup=await backup.sync(local,other);assert.notEqual(otherBackup.root,lost.root);assert.equal((await backup.load(local,shared)).state.templates[0].id,'studio');
        assert.equal(await backup.load(local,path.join(tmp,'never-backed-up')),null);
        const [one,two]=await Promise.all([backup.sync(local,other),backup.sync(local,other)]);assert.equal(one.generation,two.generation,'Overlapping refreshes serialize');
        const pointer=path.join(backup.location(local,shared),'current.json');await io.writeFile(pointer,'bad pointer');
        assert.equal((await backup.load(local,shared)).generation,second.generation,'A damaged current pointer can recover the previous generation');
        console.log('PASS shared library backups: metadata/media, asset remapping, immutable generations, failed writes, offline access, isolated libraries, and normal local data preserved');
    } finally { await io.rm(tmp,{recursive:true,force:true}); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
