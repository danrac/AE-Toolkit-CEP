/* Local immutable snapshots of shared Toolkit libraries. ES5 for CEP Node. */
var fs = require('fs'), path = require('path'), crypto = require('crypto'), lock = require('./library-lock.js');
var io = fs.promises, queues = {};
function normalized(root) { var value = path.resolve(root).replace(/\\/g, '/').replace(/\/+$/, ''); return process.platform === 'win32' ? value.toLowerCase() : value; }
function key(root) { return crypto.createHash('sha256').update(normalized(root)).digest('hex'); }
function base(storage, source) { return path.join(storage, 'shared-library-backups', key(source)); }
function inside(root, file) { var relative = path.relative(root, file); return relative === '' || (relative !== '..' && relative.indexOf('..' + path.sep) !== 0 && !path.isAbsolute(relative)); }
function valid(data) { if (!data || !Array.isArray(data.templates) || !data.templates.length || !Array.isArray(data.projects)) throw new Error('Shared library data is invalid; previous backup kept.'); return data; }
function readJSON(file) { return io.readFile(file, 'utf8').then(function (text) { return JSON.parse(text); }); }
function removeTree(root) {
    return io.lstat(root).then(function (stat) {
        if (!stat.isDirectory() || stat.isSymbolicLink()) return io.unlink(root);
        return io.readdir(root).then(function (names) { return names.reduce(function (job,name) { return job.then(function () { return removeTree(path.join(root,name)); }); },Promise.resolve()); }).then(function () { return io.rmdir(root); });
    }).catch(function (error) { if (error.code !== 'ENOENT') throw error; });
}
function load(storage, source) {
    var folder = base(storage,source);
    function pointer(name) {
        return readJSON(path.join(folder,name)).then(function (record) {
            if (!/^snapshot-[0-9]+-[a-f0-9]+$/.test(record.generation || '')) throw new Error('Invalid backup pointer.');
            var generation = path.join(folder,record.generation), tree = path.join(generation,'library');
            return readJSON(path.join(generation,'backup.json')).then(function (metadata) {
                if (metadata.version !== 1 || !metadata.files || !metadata.assetMap || metadata.source !== normalized(source)) throw new Error('Backup metadata is invalid or belongs to another library.');
                Object.keys(metadata.files).concat(Object.keys(metadata.assetMap).map(function (asset) { return metadata.assetMap[asset]; })).forEach(function (relative) {
                    if (typeof relative !== 'string' || path.isAbsolute(relative) || !inside(tree,path.resolve(tree,relative))) throw new Error('Unsafe backup asset path.');
                });
                return io.readFile(path.join(tree,'project-templates.json'),'utf8').then(function (text) {
                    if (crypto.createHash('sha256').update(text).digest('hex') !== metadata.stateHash) throw new Error('Backup preset data is damaged.');
                    return {root:tree,generation:record.generation,metadata:metadata,state:valid(JSON.parse(text))};
                });
            });
        });
    }
    return pointer('current.json').catch(function () { return pointer('previous.json'); }).catch(function () { return null; });
}
function fileInfo(stat) { return {size:stat.size,mtime:stat.mtime.getTime()}; }
function sameInfo(a,b) { return a && b && a.size === b.size && a.mtime === b.mtime; }
function assets(data) {
    var found = {};
    (data.compPresets || []).concat(data.checkerPresets || []).forEach(function (preset) { Object.keys(preset.assets || {}).forEach(function (name) { var value = preset.assets[name]; if (value && value.indexOf('bundled:') !== 0) found[value] = true; }); });
    return Object.keys(found);
}
function sync(storage,source) {
    var id = base(storage,source), previousJob = queues[id] || Promise.resolve();
    var job = previousJob.catch(function () {}).then(function () { return snapshot(storage,source); });
    queues[id] = job;
    job.then(function () { if (queues[id] === job) delete queues[id]; },function () { if (queues[id] === job) delete queues[id]; });
    return job;
}
function snapshot(storage,source) {
    source = path.resolve(source);
    var folder = base(storage,source), previous, stateText, data, entries = {}, map = {}, warnings = [], generation, release, metadata;
    var stateFile = path.join(source,'project-templates.json');
    function assertIdle() { if (fs.existsSync(stateFile + '.lock')) throw new Error('Shared library is being saved; previous local backup kept. Refresh after the save finishes.'); }
    function visit(file,relative) {
        if (inside(path.join(storage,'shared-library-backups'),file)) return Promise.resolve();
        return io.lstat(file).then(function (stat) {
            if (stat.isSymbolicLink()) { warnings.push('Skipped symbolic link: ' + relative); return; }
            if (stat.isDirectory()) return io.readdir(file).then(function (names) { return names.sort().reduce(function (job,name) { return job.then(function () { return visit(path.join(file,name),relative + '/' + name); }); },Promise.resolve()); });
            if (stat.isFile()) entries[relative] = {source:file,info:fileInfo(stat)};
        });
    }
    function managedFiles() {
        return io.readdir(source).then(function (names) {
            return names.sort().reduce(function (job,name) { return job.then(function () {
                var file = path.join(source,name);
                if (name === 'project-templates.json') return io.stat(file).then(function (stat) { if (!stat.isFile()) throw new Error('Shared library state is not a file.'); entries[name] = {source:file,info:fileInfo(stat)}; });
                return io.lstat(file).then(function (stat) {
                    if (stat.isDirectory() && !stat.isSymbolicLink() && (name === 'guide-assets' || fs.existsSync(path.join(file,'template.json')))) return visit(file,name);
                });
            }); },Promise.resolve());
        });
    }
    function externalAssets() {
        return assets(data).reduce(function (job,original) { return job.then(function () {
            var libraryRelative = original.indexOf('library:') === 0 ? original.substring(8) : '', libraryAsset = original.indexOf('library:') === 0;
            if (libraryAsset && (!libraryRelative || path.isAbsolute(libraryRelative) || /^[A-Za-z]:/.test(libraryRelative) || /(^|[\\\/])\.\.([\\\/]|$)/.test(libraryRelative))) { warnings.push('Invalid library guide reference: ' + original); return; }
            var file = libraryAsset ? path.resolve(source,libraryRelative) : path.resolve(original), relative = inside(source,file) ? path.relative(source,file).replace(/\\/g,'/') : '_external-guides/' + key(file) + '-' + path.basename(file);
            if (relative === 'project-templates.json' || !relative || (!libraryAsset && !path.isAbsolute(original))) { warnings.push('Guide path is not a usable absolute file: ' + original); return; }
            return io.stat(file).then(function (stat) {
                if (!stat.isFile()) throw new Error('Not a file');
                entries[relative] = {source:file,info:fileInfo(stat)}; map[original] = relative;
            }).catch(function () {
                var saved = previous && previous.metadata.assetMap[original];
                if (saved && previous.metadata.files[saved] && fs.existsSync(path.join(previous.root,saved))) {
                    entries[relative] = {cached:path.join(previous.root,saved),info:previous.metadata.files[saved]}; map[original] = relative;
                    warnings.push('Guide unavailable; retained previous local copy: ' + original);
                } else warnings.push('Guide unavailable; backup contains its reference only: ' + original);
            });
        }); },Promise.resolve());
    }
    function copyFiles(tree) {
        return Object.keys(entries).sort().reduce(function (job,relative) { return job.then(function () {
            var entry = entries[relative], target = path.join(tree,relative), old = previous && previous.metadata.files[relative];
            return io.mkdir(path.dirname(target),{recursive:true}).then(function () {
                if (relative === 'project-templates.json') return io.writeFile(target,stateText,'utf8');
                var cached = entry.cached || (sameInfo(old,entry.info) && previous && path.join(previous.root,relative));
                if (cached && fs.existsSync(cached)) return io.link(cached,target).catch(function () { return io.copyFile(cached,target); });
                return io.copyFile(entry.source,target).then(function () { return io.stat(entry.source); }).then(function (stat) { if (!sameInfo(entry.info,fileInfo(stat))) throw new Error('Shared asset changed during backup; previous backup kept.'); });
            });
        }); },Promise.resolve());
    }
    function cleanup() {
        return Promise.all(['current.json','previous.json'].map(function (name) { return readJSON(path.join(folder,name)).catch(function () { return {}; }); })).then(function (pointers) {
            var keep = pointers.map(function (record) { return record.generation; });
            return io.readdir(folder).then(function (names) { return names.reduce(function (job,name) { return job.then(function () { if (/^snapshot-[0-9]+-[a-f0-9]+$/.test(name) && keep.indexOf(name) < 0) return removeTree(path.join(folder,name)); }); },Promise.resolve()); });
        });
    }
    var operation = io.mkdir(folder,{recursive:true}).then(function () {
        release = lock.acquire(path.join(folder,'backup')); assertIdle();
        return load(storage,source);
    }).then(function (cached) {
        previous = cached; return io.readFile(stateFile,'utf8');
    }).then(function (text) {
        stateText = text; data = valid(JSON.parse(text)); return managedFiles();
    }).then(externalAssets).then(function () {
        var files = {}; Object.keys(entries).sort().forEach(function (relative) { files[relative] = entries[relative].info; });
        metadata = {version:1,source:normalized(source),savedAt:new Date().toISOString(),revision:Number(data.libraryRevision || 0),stateHash:crypto.createHash('sha256').update(stateText).digest('hex'),files:files,assetMap:map,warnings:warnings};
        if (previous && metadata.stateHash === previous.metadata.stateHash && JSON.stringify(files) === JSON.stringify(previous.metadata.files) && JSON.stringify(map) === JSON.stringify(previous.metadata.assetMap) && JSON.stringify(warnings) === JSON.stringify(previous.metadata.warnings)) return io.readFile(stateFile,'utf8').then(function (latest) { assertIdle(); if (latest !== stateText) throw new Error('Shared library changed during backup; previous backup kept.'); return previous; });
        generation = path.join(folder,'snapshot-' + Date.now() + '-' + crypto.randomBytes(8).toString('hex'));
        var tree = path.join(generation,'library');
        return io.mkdir(tree,{recursive:true}).then(function () { return copyFiles(tree); }).then(function () { assertIdle(); return io.readFile(stateFile,'utf8'); }).then(function (latest) {
            if (latest !== stateText) throw new Error('Shared library changed during backup; previous backup kept.');
            return io.writeFile(path.join(generation,'backup.json'),JSON.stringify(metadata,null,2),'utf8');
        }).then(function () {
            if (!previous) return;
            return io.writeFile(path.join(folder,'previous.tmp'),JSON.stringify({generation:previous.generation}),'utf8').then(function () { return io.rename(path.join(folder,'previous.tmp'),path.join(folder,'previous.json')); });
        }).then(function () {
            return io.writeFile(path.join(folder,'current.tmp'),JSON.stringify({generation:path.basename(generation)}),'utf8');
        }).then(function () { return io.rename(path.join(folder,'current.tmp'),path.join(folder,'current.json')); }).then(function () {
            var result = {root:tree,generation:path.basename(generation),metadata:metadata,state:data}; generation = null;
            return cleanup().catch(function (error) { result.cleanupWarning = error.message; }).then(function () { return result; });
        });
    });
    return operation.then(function (result) { if (release) release(); return result; },function (error) {
        var cleanupJob = generation ? removeTree(generation).catch(function () {}) : Promise.resolve();
        return cleanupJob.then(function () { if (release) release(); throw error; });
    });
}
function offlineState(snapshot) {
    var state = JSON.parse(JSON.stringify(snapshot.state)), source = snapshot.metadata.source;
    (state.compPresets || []).concat(state.checkerPresets || []).forEach(function (preset) { Object.keys(preset.assets || {}).forEach(function (name) {
        var asset = preset.assets[name], mapped = snapshot.metadata.assetMap[asset];
        if (asset && asset.indexOf('library:') === 0) return;
        if (mapped) preset.assets[name] = path.join(snapshot.root,mapped).replace(/\\/g,'/');
        else if (asset && asset.indexOf('library:') !== 0 && asset.indexOf('bundled:') !== 0 && inside(source,path.resolve(asset))) preset.assets[name] = path.join(snapshot.root,path.relative(source,path.resolve(asset))).replace(/\\/g,'/');
    }); });
    return state;
}
exports.sync = sync;
exports.load = load;
exports.offlineState = offlineState;
exports.available = function (source) { return fs.existsSync(path.join(source,'project-templates.json')); };
exports.location = base;
