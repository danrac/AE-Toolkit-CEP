function aetoolkitCepDataFolder() {
    var folder = new Folder(Folder.userData.fsName + "/AE-Toolkit-CEP");
    if (!folder.exists && !folder.create()) throw new Error("Cannot create " + folder.fsName);
    return folder;
}
function aetoolkitCepStateFile() { return new File(aetoolkitCepDataFolder().fsName + "/project-templates.json"); }
function aetoolkitCepDefaultState() {
    return '{"version":1,"templates":[{"id":"default-motion","name":"Default Motion Project","folders":{"afterEffects":"05_GFX/02_AfterEffects","assets":"05_GFX/03_Assets","toGfx":"05_GFX/06_ToGFX","outputs":"05_GFX/07_Output","styleFrames":"05_GFX/07_Output/_StyleFrames"},"customFolders":[]}],"projects":[],"activeProjectId":""}';
}
function aetoolkitCepLoadState() {
    try {
        var file = aetoolkitCepStateFile();
        if (!file.exists) return aetoolkitCepDefaultState();
        if (!file.open("r")) throw new Error("Cannot read saved templates.");
        var text = file.read(); file.close();
        JSON.parse(text);
        return text;
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSaveState(jsonText) {
    try {
        var parsed = JSON.parse(jsonText);
        if (!parsed.templates || !(parsed.templates instanceof Array) || parsed.templates.length === 0 || !parsed.projects || !(parsed.projects instanceof Array)) throw new Error("Invalid project-template data.");
        var file = aetoolkitCepStateFile();
        var temp = new File(file.fsName + ".tmp");
        if (!temp.open("w")) throw new Error("Cannot prepare template save.");
        if (!temp.write(jsonText)) { temp.close(); throw new Error("Cannot write template data."); }
        temp.close();
        var backup = new File(file.fsName + ".bak");
        if (backup.exists && !backup.remove()) throw new Error("Cannot replace the template backup.");
        if (file.exists && !file.copy(backup.fsName)) throw new Error("Cannot back up saved templates.");
        if (file.exists && !file.remove()) throw new Error("Cannot replace saved templates.");
        if (!temp.rename(file.name)) {
            if (backup.exists) backup.copy(file.fsName);
            throw new Error("Cannot finalize saved templates.");
        }
        if (backup.exists) backup.remove();
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseProjectRoot() {
    try {
        var folder = Folder.selectDialog("Choose the project root folder");
        return folder ? folder.fsName : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRevealFolder(pathText) {
    try {
        var folder = new Folder(pathText);
        if (!folder.exists) throw new Error("Folder does not exist: " + folder.fsName);
        if (!folder.execute()) throw new Error("Could not open " + folder.fsName);
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseRenderSubfolder() {
    try {
        var folder = Folder.selectDialog("Choose a render subfolder");
        return folder ? folder.name : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRequireFolder(pathText) {
    var folder = new Folder(pathText);
    if (!folder.exists) throw new Error("Folder does not exist: " + folder.fsName);
    return folder;
}
function aetoolkitCepOpenProjectFromFolder(pathText) {
    try {
        aetoolkitCepRequireFolder(pathText);
        var selected = new File(pathText).openDlg("Choose an After Effects project", function (entry) {
            return entry instanceof Folder || /\.aepx?$/i.test(entry.name);
        });
        if (!selected) return "CANCELLED";
        while (selected.alias) selected = selected.resolve();
        if (!selected || !selected.exists) throw new Error("The selected project file is unavailable.");
        app.open(selected);
        return "Opened " + selected.name;
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepImportFromFolder(pathText) {
    try {
        var folder = aetoolkitCepRequireFolder(pathText);
        app.project.setDefaultImportFolder(folder);
        var imported = app.project.importFileWithDialog();
        return imported ? "Imported selected assets." : "CANCELLED";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRenderDate() {
    var date = new Date(), year = String(date.getFullYear()).slice(-2), month = date.getMonth() + 1, day = date.getDate();
    return year + (month < 10 ? "0" : "") + month + (day < 10 ? "0" : "") + day;
}
function aetoolkitCepNormalizeSubfolder(value) {
    var path = String(value || "").replace(/\\/g, "/").replace(/^\s+|\s+$/g, "").replace(/^\/+|\/+$/g, "");
    if (!path) return "";
    if (/^[A-Za-z]:\//.test(path) || /(^|\/)\.\.?($|\/)/.test(path)) throw new Error("Render subfolders must stay inside the selected project output folder.");
    return path;
}
function aetoolkitCepEnsureFolder(pathText) {
    var folder = new Folder(pathText);
    if (folder.exists) return folder;
    var parent = folder.parent;
    if (!parent || parent.fsName === folder.fsName) throw new Error("Cannot create output folder: " + folder.fsName);
    aetoolkitCepEnsureFolder(parent.fsName);
    if (!folder.create()) throw new Error("Cannot create output folder: " + folder.fsName);
    return folder;
}
function aetoolkitCepSelectedComps() {
    var comps = [], selected = app.project.selection;
    for (var i = 0; i < selected.length; i++) if (selected[i] instanceof CompItem) comps.push(selected[i]);
    if (!comps.length) throw new Error("Select one or more compositions in the Project panel before rendering.");
    return comps;
}
function aetoolkitCepRenderSelected(jsonText) {
    var oldQueueStates = [], workAreas = [];
    try {
        if (!app.project.file) throw new Error("Save the After Effects project before rendering.");
        var options = JSON.parse(jsonText), mode = options.mode, basePath = String(options.basePath || "");
        if (mode !== "offline" && mode !== "online" && mode !== "styleFrames" && mode !== "checker") throw new Error("Unknown render mode.");
        if (!basePath) throw new Error("The selected project has no output folder for this render mode.");
        var destination = basePath + "/" + aetoolkitCepRenderDate();
        var subfolder = aetoolkitCepNormalizeSubfolder(options.subfolder);
        if (subfolder) destination += "/" + subfolder;
        aetoolkitCepEnsureFolder(destination);
        var comps = aetoolkitCepSelectedComps(), queue = app.project.renderQueue, i, queueItem, outputModule, frameRate, extension, templateName;
        for (i = 1; i <= queue.numItems; i++) { oldQueueStates.push({ item: queue.item(i), render: queue.item(i).render }); queue.item(i).render = false; }
        templateName = mode === "offline" ? "X_ProRes 4444 Trillions Alpha" : mode === "online" ? "X_FIN_ProRes 4444 Trill Alpha" : "X_pngRGBA";
        extension = mode === "offline" || mode === "online" ? ".mov" : ".png";
        for (i = 0; i < comps.length; i++) {
            queueItem = queue.items.add(comps[i]);
            outputModule = queueItem.outputModule(1);
            try { outputModule.applyTemplate(templateName); }
            catch (templateError) { throw new Error("The render template '" + templateName + "' is not installed. " + templateError.toString()); }
            frameRate = Math.round(comps[i].frameRate * 1000) / 1000;
            outputModule.file = new File(destination + "/" + comps[i].name + "_" + frameRate + "fps_" + comps[i].width + "x" + comps[i].height + extension);
            if (mode === "checker") {
                workAreas.push({ comp: comps[i], start: comps[i].workAreaStart, duration: comps[i].workAreaDuration });
                comps[i].workAreaStart = comps[i].time;
                comps[i].workAreaDuration = 1 / comps[i].frameRate;
            }
        }
        queue.render();
        return "Rendered " + comps.length + " composition" + (comps.length === 1 ? "" : "s") + " to " + destination;
    } catch (error) { return "ERROR: " + error.toString(); }
    finally {
        for (var workIndex = 0; workIndex < workAreas.length; workIndex++) { workAreas[workIndex].comp.workAreaStart = workAreas[workIndex].start; workAreas[workIndex].comp.workAreaDuration = workAreas[workIndex].duration; }
        for (var queueIndex = 0; queueIndex < oldQueueStates.length; queueIndex++) oldQueueStates[queueIndex].item.render = oldQueueStates[queueIndex].render;
    }
}
function aetoolkitCepCleanImportPath(value) {
    var path = String(value || "").replace(/^\s+|\s+$/g, "");
    if ((path.charAt(0) === "\"" && path.charAt(path.length - 1) === "\"") || (path.charAt(0) === "'" && path.charAt(path.length - 1) === "'")) path = path.substring(1, path.length - 1);
    if (/^file:/i.test(path)) {
        if (/^file:\/\/localhost\//i.test(path)) path = path.replace(/^file:\/\/localhost/i, "");
        else if (/^file:\/\/\//i.test(path)) path = path.replace(/^file:\/\//i, "");
        else if (/^file:\/\//i.test(path)) path = path.replace(/^file:\/\//i, "//");
        try { path = decodeURI(path); } catch (decodeError) {}
        if (/^\/[A-Za-z]:\//.test(path)) path = path.substring(1);
    }
    return path;
}
function aetoolkitCepIsAbsolutePath(path) {
    return path.charAt(0) === "/" || path.substr(0, 2) === "\\\\" || path.length > 2 && path.charAt(1) === ":" && (path.charAt(2) === "/" || path.charAt(2) === "\\");
}
function aetoolkitCepJoinImportPath(folder, name) {
    while (folder.length && (folder.charAt(folder.length - 1) === "/" || folder.charAt(folder.length - 1) === "\\")) folder = folder.substring(0, folder.length - 1);
    while (name.length && (name.charAt(0) === "/" || name.charAt(0) === "\\")) name = name.substring(1);
    return folder + "/" + name;
}
function aetoolkitCepImportAssetPaths(text) {
    var imported = 0, errors = [], seen = {}, folderPath = "", lines = String(text || "").replace(/\r/g, "").split("\n");
    if (!String(text || "").replace(/\s/g, "")) return JSON.stringify({ imported: imported, errors: ["Paste one or more asset paths before importing."] });
    app.beginUndoGroup("AE Toolkit CEP: Import assets");
    try {
        for (var i = 0; i < lines.length; i++) {
            var path = aetoolkitCepCleanImportPath(lines[i]);
            if (!path) continue;
            var candidate = aetoolkitCepIsAbsolutePath(path) ? path : folderPath ? aetoolkitCepJoinImportPath(folderPath, path) : "";
            if (!candidate) { errors.push("Line " + (i + 1) + " needs an absolute path or a preceding folder path."); continue; }
            var file = new File(candidate);
            if (!file.exists && new Folder(candidate).exists) { folderPath = candidate; continue; }
            var key = candidate.split("\\").join("/");
            if ($.os.indexOf("Win") !== -1) key = key.toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            if (!file.exists) { errors.push("Not found: " + file.fsName); continue; }
            try { app.project.importFile(new ImportOptions(file)); imported++; }
            catch (importError) { errors.push("Could not import " + file.fsName + ": " + importError.toString()); }
        }
    } finally { app.endUndoGroup(); }
    if (!imported && !errors.length) errors.push("No file paths were found.");
    return JSON.stringify({ imported: imported, errors: errors });
}
function aetoolkitCepEnsureXmp() {
    if (ExternalObject.AdobeXMPScript === undefined) ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
}
function aetoolkitCepUniqueSourcePath(paths, value) {
    if (!value || !/\.aepx?$/i.test(value)) return;
    for (var i = 0; i < paths.length; i++) if (paths[i] === value) return;
    paths.push(value);
}
function aetoolkitCepReadSourceLinks(xmp) {
    var paths = [], creator = XMPConst.NS_CREATOR_ATOM || "http://ns.adobe.com/creatorAtom/1.0/", dynamicMedia = XMPConst.NS_DM || "http://ns.adobe.com/xmp/1.0/DynamicMedia/";
    function read(call) {
        try {
            var property = call();
            aetoolkitCepUniqueSourcePath(paths, property && String(property.value !== undefined ? property.value : property));
        } catch (readError) {}
    }
    read(function () { return xmp.getStructField(creator, "aeProjectLink", creator, "fullPath"); });
    read(function () { return xmp.getStructField(dynamicMedia, "projectRef", dynamicMedia, "path"); });
    read(function () { return xmp.getProperty(creator, "fullPath"); });
    return paths;
}
function aetoolkitCepReadFootageSourceLinks(file) {
    var paths = [], notices = [], handle;
    function merge(xmp) {
        var found = aetoolkitCepReadSourceLinks(xmp);
        for (var i = 0; i < found.length; i++) aetoolkitCepUniqueSourcePath(paths, found[i]);
    }
    try {
        handle = new XMPFile(file.fsName, XMPConst.FILE_UNKNOWN, XMPConst.OPEN_FOR_READ);
        merge(handle.getXMP());
    } catch (embeddedError) { notices.push("Embedded metadata could not be read."); }
    finally { if (handle) try { handle.closeFile(); } catch (closeError) {} }
    var sidecarPaths = [file.fsName + ".xmp", file.fsName.replace(/\.[^\/.]+$/, "") + ".xmp"];
    for (var i = 0; i < sidecarPaths.length; i++) {
        if (i > 0 && sidecarPaths[i] === sidecarPaths[0]) continue;
        var sidecar = new File(sidecarPaths[i]), opened = false;
        if (!sidecar.exists) continue;
        try {
            if (sidecar.length > 10 * 1024 * 1024) throw new Error("sidecar exceeds 10 MB");
            sidecar.encoding = "UTF-8";
            opened = sidecar.open("r");
            if (!opened) throw new Error("cannot open sidecar");
            merge(new XMPMeta(sidecar.read()));
        } catch (sidecarError) { notices.push(sidecar.name + " could not be read."); }
        finally { if (opened) sidecar.close(); }
    }
    return { paths: paths, notices: notices };
}
function aetoolkitCepSourceProjectFile(pathText) {
    var path = aetoolkitCepCleanImportPath(pathText).split("\\").join("/");
    if (!/\.aepx?$/i.test(path) || !aetoolkitCepIsAbsolutePath(path)) return null;
    return new File(path);
}
function aetoolkitCepDiscoverSourceProjects() {
    try {
        aetoolkitCepEnsureXmp();
        var selection = app.project.selection, records = [], notices = [], sourceNames = [], seen = {};
        if (!selection.length) throw new Error("Select rendered footage in the Project panel first.");
        for (var i = 0; i < selection.length; i++) {
            var item = selection[i];
            if (!(item instanceof FootageItem) || !item.file) { notices.push(item.name + ": select file-based footage."); continue; }
            if (!item.file.exists) { notices.push(item.name + ": source media is offline."); continue; }
            sourceNames.push(item.name);
            var result = aetoolkitCepReadFootageSourceLinks(item.file);
            if (!result.paths.length) notices.push(item.name + ": no explicit After Effects project link was found.");
            for (var j = 0; j < result.paths.length; j++) {
                var file = aetoolkitCepSourceProjectFile(result.paths[j]);
                if (!file) { notices.push(item.name + ": project link is not an absolute .aep or .aepx path."); continue; }
                var key = file.fsName;
                if ($.os.indexOf("Win") !== -1) key = key.toLowerCase();
                if (!seen[key]) { seen[key] = true; records.push({ path: file.fsName, exists: file.exists }); }
            }
            for (j = 0; j < result.notices.length; j++) notices.push(item.name + ": " + result.notices[j]);
        }
        return JSON.stringify({ records: records, notices: notices, sourceNames: sourceNames });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepProjectFolder(name) {
    var root = app.project.rootFolder;
    for (var i = 1; i <= root.numItems; i++) {
        var item = root.item(i);
        if (item instanceof FolderItem && item.name === name) return item;
    }
    return app.project.items.addFolder(name);
}
function aetoolkitCepSourceName(name) {
    return String(name).replace(/\.[^.]+$/, "").replace(/_[0-9.]+fps_[0-9]+x[0-9]+$/, "");
}
function aetoolkitCepImportSourceProjects(jsonText) {
    var imported = 0, errors = [];
    try {
        var options = JSON.parse(jsonText), paths = options.paths || [], sourceNames = options.sourceNames || [];
        if (!paths.length) throw new Error("Select at least one source project.");
        var projectsFolder = aetoolkitCepProjectFolder("ImportedProjects"), compsFolder = null;
        function matches(comp) {
            for (var n = 0; n < sourceNames.length; n++) if (comp.name === aetoolkitCepSourceName(sourceNames[n])) return true;
            return false;
        }
        function gather(folder) {
            if (!(folder instanceof FolderItem)) return;
            for (var i = 1; i <= folder.numItems; i++) {
                var item = folder.item(i);
                if (item instanceof CompItem && matches(item)) {
                    if (!compsFolder) compsFolder = aetoolkitCepProjectFolder("ImportedComps");
                    item.parentFolder = compsFolder;
                } else if (item instanceof FolderItem) gather(item);
            }
        }
        app.beginUndoGroup("AE Toolkit CEP: Import source projects");
        try {
            for (var i = 0; i < paths.length; i++) {
                var file = aetoolkitCepSourceProjectFile(paths[i]);
                if (!file || !file.exists) { errors.push("Not found: " + paths[i]); continue; }
                try {
                    var project = app.project.importFile(new ImportOptions(file));
                    project.parentFolder = projectsFolder;
                    gather(project);
                    imported++;
                } catch (importError) { errors.push("Could not import " + file.fsName + ": " + importError.toString()); }
            }
        } finally { app.endUndoGroup(); }
    } catch (error) { errors.push(error.toString()); }
    return JSON.stringify({ imported: imported, errors: errors });
}
function aetoolkitCepNumber(value, label, minimum, maximum, integerOnly) {
    var parsed = Number(value);
    if (isNaN(parsed) || parsed < minimum || parsed > maximum || integerOnly && Math.floor(parsed) !== parsed) throw new Error(label + " must be between " + minimum + " and " + maximum + ".");
    return parsed;
}
function aetoolkitCepSafeName(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "").replace(/[\\/:*?\"<>|\r\n]+/g, "").replace(/\s+/g, " ");
}
function aetoolkitCepBuildCompName(options, index) {
    var parts = [], fields = [options.job, options.format, options.style, options.description, options.initials], i;
    for (i = 0; i < fields.length; i++) {
        var part = aetoolkitCepSafeName(fields[i]);
        if (part) parts.push(part.replace(/\s+/g, "_"));
    }
    if (!parts.length) parts.push("Comp");
    parts.push(aetoolkitCepPadNumber(index || 1, 2));
    return parts.join("_");
}
function aetoolkitCepCompDimensions(options) {
    return {
        width: aetoolkitCepNumber(options.width, "Width", 1, 30000, true),
        height: aetoolkitCepNumber(options.height, "Height", 1, 30000, true),
        fps: aetoolkitCepNumber(options.fps, "FPS", 1, 240, false),
        duration: aetoolkitCepNumber(options.duration, "Duration", 0.001, 86400, false)
    };
}
function aetoolkitCepCreateComp(jsonText) {
    try {
        var options = JSON.parse(jsonText), settings = aetoolkitCepCompDimensions(options), name = aetoolkitCepBuildCompName(options, 1), comp;
        app.beginUndoGroup("AE Toolkit CEP: Create composition");
        try {
            comp = app.project.items.addComp(name, settings.width, settings.height, 1, settings.duration, settings.fps);
            comp.label = 14;
            if (options.addGuides) aetoolkitCepAddPresetGuides(comp, options.guideAssets || {});
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ id: comp.id, name: comp.name, width: comp.width, height: comp.height, fps: comp.frameRate });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepChooseGuideAsset() {
    try {
        var file = File.openDialog("Choose a guide asset", function (entry) { return entry instanceof Folder || /\.(ai|jpg|jpeg|png|psd|tif|tiff)$/i.test(entry.name); });
        return file ? file.fsName : "";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepPresetAssetFolder(id) {
    var safeId = String(id || "").replace(/[^a-z0-9_-]/ig, "");
    if (!safeId) throw new Error("Preset needs a safe name before copying guide assets.");
    return aetoolkitCepEnsureFolder(aetoolkitCepDataFolder().fsName + "/guide-assets/" + safeId);
}
function aetoolkitCepCopyPresetAsset(folder, sourcePath, label) {
    var source = new File(sourcePath), safeLabel = String(label).replace(/[^a-z0-9_-]/ig, ""), target, attempt = 0, dot, base, extension;
    if (!source.exists) throw new Error(label + " guide file is unavailable: " + source.fsName);
    dot = source.name.lastIndexOf("."); base = dot > 0 ? source.name.substring(0, dot) : source.name; extension = dot > 0 ? source.name.substring(dot) : "";
    do { target = new File(folder.fsName + "/" + safeLabel + "_" + base + (attempt ? "_" + aetoolkitCepPadNumber(attempt, 2) : "") + extension); attempt++; } while (target.exists && target.fsName !== source.fsName && attempt < 10000);
    if (target.fsName === source.fsName || target.exists) return target.fsName;
    if (!source.copy(target.fsName)) throw new Error("Could not copy " + source.name + " into " + folder.fsName);
    return target.fsName;
}
function aetoolkitCepStorePresetAssets(jsonText) {
    try {
        var options = JSON.parse(jsonText), assets = options.assets || {}, folder = aetoolkitCepPresetAssetFolder(options.id), saved = {};
        saved.matte = assets.matte ? aetoolkitCepCopyPresetAsset(folder, assets.matte, "matte") : "";
        saved.chartOne = assets.chartOne ? aetoolkitCepCopyPresetAsset(folder, assets.chartOne, "chart-one") : "";
        saved.chartTwo = assets.chartTwo ? aetoolkitCepCopyPresetAsset(folder, assets.chartTwo, "chart-two") : "";
        return JSON.stringify(saved);
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepGuideFootage(file) {
    var item, i;
    for (i = 1; i <= app.project.numItems; i++) {
        item = app.project.item(i);
        try { if (item instanceof FootageItem && item.file && item.file.fsName === file.fsName) return item; } catch (ignoreError) {}
    }
    return app.project.importFile(new ImportOptions(file));
}
function aetoolkitCepAddPresetGuides(comp, assets) {
    var keys = ["matte", "chartOne", "chartTwo"], i, path, file, footage, layer;
    for (i = 0; i < keys.length; i++) {
        path = assets[keys[i]];
        if (!path) continue;
        file = new File(path);
        if (!file.exists) throw new Error("Stored " + keys[i] + " guide file is unavailable: " + file.fsName);
        footage = aetoolkitCepGuideFootage(file);
        layer = comp.layers.add(footage);
        layer.guideLayer = true;
        try { layer.transform.position.setValue([comp.width / 2, comp.height / 2]); } catch (positionError) {}
        if (keys[i] !== "matte") try { layer.opacity.setValue(50); } catch (opacityError) {}
    }
}
function aetoolkitCepModifySelectedComps(jsonText) {
    try {
        var options = JSON.parse(jsonText), updateSize = !!options.updateSize, updateFps = !!options.updateFps, renameBase = aetoolkitCepSafeName(options.renameBase), settings, comps, i;
        if (!updateSize && !updateFps && !renameBase) throw new Error("Choose size, FPS, or rename before modifying comps.");
        if (updateSize || updateFps) settings = aetoolkitCepCompDimensions(options);
        comps = aetoolkitCepSelectedComps();
        app.beginUndoGroup("AE Toolkit CEP: Modify compositions");
        try {
            for (i = 0; i < comps.length; i++) {
                if (updateSize) { comps[i].width = settings.width; comps[i].height = settings.height; }
                if (updateFps) comps[i].frameRate = settings.fps;
                if (renameBase) comps[i].name = renameBase + "_" + aetoolkitCepPadNumber(i + 1, 2);
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ modified: comps.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepPadNumber(value, width) {
    var text = String(value);
    while (text.length < width) text = "0" + text;
    return text;
}
function aetoolkitCepReplaceLiteral(value, find, replacement) {
    var pieces = String(value).split(find);
    return pieces.join(replacement);
}
function aetoolkitCepRenameSelectedItems(jsonText) {
    try {
        var options = JSON.parse(jsonText), operation = options.operation, find = String(options.find || ""), replacement = String(options.replace || ""), selected = app.project.selection, start, i, item;
        if (!selected.length) throw new Error("Select one or more project items before renaming.");
        if (operation !== "replace" && operation !== "prefix" && operation !== "suffix" && operation !== "number" && operation !== "remove") throw new Error("Choose a rename operation.");
        if ((operation === "replace" || operation === "remove") && !find) throw new Error("Enter text to find.");
        if ((operation === "prefix" || operation === "suffix") && !find) throw new Error("Enter a prefix or suffix.");
        start = aetoolkitCepNumber(options.start || 1, "Start number", 0, 999999, true);
        app.beginUndoGroup("AE Toolkit CEP: Rename project items");
        try {
            for (i = 0; i < selected.length; i++) {
                item = selected[i];
                if (operation === "replace") item.name = aetoolkitCepReplaceLiteral(item.name, find, replacement);
                else if (operation === "remove") item.name = aetoolkitCepReplaceLiteral(item.name, find, "");
                else if (operation === "prefix") item.name = find + item.name;
                else if (operation === "suffix") item.name = item.name + find;
                else item.name = item.name + "_" + aetoolkitCepPadNumber(start + i, 2);
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ renamed: selected.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepConformSelectedSolids() {
    try {
        var comp = app.project.activeItem, conformed = 0, layers, i, layer;
        if (!(comp instanceof CompItem)) throw new Error("Open a composition and select one or more solid layers.");
        layers = comp.selectedLayers;
        if (!layers || !layers.length) throw new Error("Select one or more solid layers in the active composition.");
        app.beginUndoGroup("AE Toolkit CEP: Conform solid layers");
        try {
            for (i = 0; i < layers.length; i++) {
                layer = layers[i];
                if (!layer.nullLayer && layer instanceof AVLayer && layer.source && layer.source.mainSource instanceof SolidSource) {
                    layer.source.width = comp.width;
                    layer.source.height = comp.height;
                    conformed++;
                }
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ conformed: conformed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepAddTextLayer(comp, name, text, position, fontSize, opacity) {
    var layer = comp.layers.addText(text), textProperty, document;
    layer.name = name;
    try {
        textProperty = layer.property("ADBE Text Properties").property("ADBE Text Document");
        document = textProperty.value;
        document.fontSize = fontSize;
        document.fillColor = [1, 1, 1];
        document.justification = ParagraphJustification.LEFT_JUSTIFY;
        textProperty.setValue(document);
    } catch (textError) {}
    try { layer.transform.position.setValue(position); } catch (positionError) {}
    try { layer.opacity.setValue(opacity); } catch (opacityError) {}
    return layer;
}
function aetoolkitCepCreateCover(jsonText) {
    try {
        var options = JSON.parse(jsonText), settings = aetoolkitCepCompDimensions(options), format = aetoolkitCepSafeName(options.format) || settings.width + "x" + settings.height, name = "COVER_" + format.replace(/\s+/g, "_") + "_01", comp, topLine, bottomLine, dateLine, spotLine;
        app.beginUndoGroup("AE Toolkit CEP: Create cover");
        try {
            comp = app.project.items.addComp(name, settings.width, settings.height, 1, settings.duration, settings.fps);
            comp.label = 14;
            try { comp.layers.addSolid([0.055, 0.075, 0.1], "Cover background", settings.width, settings.height, 1, settings.duration).moveToEnd(); } catch (backgroundError) {}
            topLine = aetoolkitCepSafeName(options.topLine);
            bottomLine = aetoolkitCepSafeName(options.bottomLine);
            dateLine = aetoolkitCepSafeName(options.date);
            spotLine = aetoolkitCepSafeName(options.spot);
            if (topLine) aetoolkitCepAddTextLayer(comp, "Cover top line", topLine, [settings.width * 0.1, settings.height * 0.35], Math.max(32, settings.width * 0.045), 100);
            if (bottomLine) aetoolkitCepAddTextLayer(comp, "Cover bottom line", bottomLine, [settings.width * 0.1, settings.height * 0.48], Math.max(22, settings.width * 0.028), 100);
            if (dateLine) aetoolkitCepAddTextLayer(comp, "Cover date", dateLine, [settings.width * 0.1, settings.height * 0.78], Math.max(18, settings.width * 0.018), 75);
            if (spotLine) aetoolkitCepAddTextLayer(comp, "Cover spot", spotLine, [settings.width * 0.1, settings.height * 0.86], Math.max(18, settings.width * 0.018), 75);
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ id: comp.id, name: comp.name });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSetCheckerHold(layer, sourceComp, targetComp, frame) {
    var frameTime = frame / sourceComp.frameRate, maximum = Math.max(0, sourceComp.duration - sourceComp.frameDuration), remap;
    if (frameTime > maximum) frameTime = maximum;
    try {
        if (layer.canSetTimeRemapEnabled === false) return;
        layer.timeRemapEnabled = true;
        remap = layer.property("ADBE Time Remapping");
        remap.setValueAtTime(0, frameTime);
        remap.setValueAtTime(targetComp.duration, frameTime);
    } catch (remapError) {}
}
function aetoolkitCepCreateCheckers(jsonText) {
    try {
        var options = JSON.parse(jsonText), width = aetoolkitCepNumber(options.width, "Width", 1, 30000, true), height = aetoolkitCepNumber(options.height, "Height", 1, 30000, true), frame = aetoolkitCepNumber(options.frame, "Frame", 0, 999999, true), comps = aetoolkitCepSelectedComps(), i, source, checker, sourceLayer;
        app.beginUndoGroup("AE Toolkit CEP: Create checkers");
        try {
            for (i = 0; i < comps.length; i++) {
                source = comps[i];
                checker = app.project.items.addComp("CKR_" + aetoolkitCepPadNumber(i + 1, 2) + "_" + aetoolkitCepSafeName(source.name), width, height, source.pixelAspect || 1, source.duration, source.frameRate);
                checker.label = 14;
                sourceLayer = checker.layers.add(source);
                try { sourceLayer.transform.position.setValue([width / 2, height / 2]); } catch (positionError) {}
                aetoolkitCepSetCheckerHold(sourceLayer, source, checker, frame);
                aetoolkitCepAddTextLayer(checker, "Checker info", source.name + "  |  frame " + frame + "  |  " + source.frameRate + " fps", [10, height - 14], 13, 45);
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ created: comps.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepConsolidateFootage() {
    try {
        app.beginUndoGroup("AE Toolkit CEP: Consolidate footage");
        try { app.project.consolidateFootage(); }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ consolidated: true });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepRemoveUnusedFootage() {
    try {
        app.beginUndoGroup("AE Toolkit CEP: Remove unused footage");
        try { app.project.removeUnusedFootage(); }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ removed: true });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReductionItems() {
    var items = [], selection = app.project.selection;
    function add(item) {
        var i;
        if (item instanceof FolderItem) { for (i = 1; i <= item.numItems; i++) add(item.item(i)); return; }
        if (!(item instanceof CompItem) && !(item instanceof FootageItem)) return;
        for (i = 0; i < items.length; i++) if (items[i].id === item.id) return;
        items.push(item);
    }
    for (var i = 0; i < selection.length; i++) add(selection[i]);
    return items;
}
function aetoolkitCepReduceProject() {
    try {
        var items = aetoolkitCepReductionItems();
        if (!items.length) throw new Error("Select one or more compositions or footage items to keep before reducing the project.");
        app.beginUndoGroup("AE Toolkit CEP: Reduce project");
        try { app.project.reduceProject(items); }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ kept: items.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepOpenCollectFiles() {
    try {
        var command = app.findMenuCommandId("Collect Files...");
        if (!command) command = app.findMenuCommandId("Collect Files\u2026");
        if (!command) throw new Error("The Collect Files command is not available in this After Effects language.");
        app.executeCommand(command);
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepLikelyImageSequence(item) {
    var name = item.file && item.file.name || "", imageExtension = /\.(ai|bmp|dpx|exr|gif|iff|jpeg|jpg|png|psd|tga|tif|tiff)$/i.test(name);
    return imageExtension && item.mainSource && item.mainSource.isStill === false;
}
function aetoolkitCepUniqueCopyFile(folder, sourceFile) {
    var name = sourceFile.name, dot = name.lastIndexOf("."), base = dot > 0 ? name.substring(0, dot) : name, extension = dot > 0 ? name.substring(dot) : "", attempt = 0, target;
    do {
        target = new File(folder.fsName + "/" + base + (attempt ? "_" + aetoolkitCepPadNumber(attempt, 2) : "") + extension);
        attempt++;
    } while (target.exists && attempt < 10000);
    if (target.exists) throw new Error("Could not find an unused name for " + sourceFile.name);
    return target;
}
function aetoolkitCepLocalizeSelectedAssets(assetsPath) {
    var localized = 0, errors = [], destination, selection, i, item, source, target;
    try {
        if (!assetsPath) throw new Error("The active project has no Assets folder configured.");
        destination = aetoolkitCepEnsureFolder(String(assetsPath).replace(/[\\/]+$/, "") + "/Localized");
        selection = app.project.selection;
        if (!selection.length) throw new Error("Select one or more file-based footage items before localizing assets.");
        app.beginUndoGroup("AE Toolkit CEP: Localize selected assets");
        try {
            for (i = 0; i < selection.length; i++) {
                item = selection[i];
                if (!(item instanceof FootageItem) || !item.file) { errors.push(item.name + ": not file-based footage."); continue; }
                if (!item.file.exists) { errors.push(item.name + ": source file is offline."); continue; }
                if (aetoolkitCepLikelyImageSequence(item)) { errors.push(item.name + ": image sequences are skipped; use Collect Files for sequences."); continue; }
                source = item.file;
                try {
                    target = aetoolkitCepUniqueCopyFile(destination, source);
                    if (!source.copy(target.fsName)) throw new Error("copy failed");
                    item.replace(target);
                    localized++;
                } catch (copyError) { errors.push(item.name + ": " + copyError.toString()); }
            }
        } finally { app.endUndoGroup(); }
    } catch (error) { errors.push(error.toString()); }
    return JSON.stringify({ localized: localized, errors: errors });
}
function aetoolkitCepOrganizerSnapshot() {
    var project = app.project, root = project.rootFolder, snapshot = { items: [], folders: [], protectedIds: {}, selected: [] }, i, item, ancestor;
    for (i = 1; i <= project.numItems; i++) {
        item = project.item(i);
        if (item instanceof FolderItem) snapshot.folders.push(item); else snapshot.items.push(item);
        if (item.selected) snapshot.selected.push(item);
    }
    for (i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (item.selected) snapshot.protectedIds[item.id] = true;
        ancestor = item.parentFolder;
        while (ancestor && ancestor !== root) { if (ancestor.selected) { snapshot.protectedIds[item.id] = true; break; } ancestor = ancestor.parentFolder; }
    }
    for (i = 0; i < snapshot.folders.length; i++) {
        item = snapshot.folders[i];
        if (item.selected) snapshot.protectedIds[item.id] = true;
        ancestor = item.parentFolder;
        while (ancestor && ancestor !== root) { if (ancestor.selected) { snapshot.protectedIds[item.id] = true; break; } ancestor = ancestor.parentFolder; }
    }
    return snapshot;
}
function aetoolkitCepOrganizerFolder(snapshot, name, parent) {
    var i, item;
    parent = parent || app.project.rootFolder;
    for (i = 1; i <= parent.numItems; i++) {
        item = parent.item(i);
        if (item instanceof FolderItem && item.name === name && !snapshot.protectedIds[item.id]) return item;
    }
    item = app.project.items.addFolder(name);
    item.parentFolder = parent;
    snapshot.folders.push(item);
    return item;
}
function aetoolkitCepOrganizerExtension(item) {
    var name = "", dot;
    try { name = item.file ? item.file.name : item.name; } catch (error) {}
    dot = name.lastIndexOf(".");
    return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
}
function aetoolkitCepIsSolid(item) {
    try { return item.mainSource instanceof SolidSource; } catch (error) { return false; }
}
function aetoolkitCepIsStill(item) {
    try { return !!item.mainSource.isStill; } catch (error) { return false; }
}
function aetoolkitCepLiftSelectedItems(snapshot) {
    var root = app.project.rootFolder;
    for (var i = 0; i < snapshot.selected.length; i++) snapshot.selected[i].parentFolder = root;
}
function aetoolkitCepOrganizeBasic(snapshot) {
    var comps = aetoolkitCepOrganizerFolder(snapshot, "Comps"), precomps = aetoolkitCepOrganizerFolder(snapshot, "PreComps"), footage = aetoolkitCepOrganizerFolder(snapshot, "Footage"), images = aetoolkitCepOrganizerFolder(snapshot, "Images"), solids = aetoolkitCepOrganizerFolder(snapshot, "Solids"), moved = 0, item;
    for (var i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (snapshot.protectedIds[item.id]) continue;
        if (item instanceof CompItem) item.parentFolder = item.usedIn && item.usedIn.length ? precomps : comps;
        else if (item instanceof FootageItem) item.parentFolder = aetoolkitCepIsSolid(item) ? solids : aetoolkitCepIsStill(item) ? images : footage;
        else continue;
        moved++;
    }
    return moved;
}
function aetoolkitCepOrganizeDms(snapshot, ratio) {
    var comps = aetoolkitCepOrganizerFolder(snapshot, "1_COMPS"), precomps = aetoolkitCepOrganizerFolder(snapshot, "2_PRE_COMPS"), gfx = aetoolkitCepOrganizerFolder(snapshot, "3_GFX"), footage = aetoolkitCepOrganizerFolder(snapshot, "4_FOOTAGE"), compRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, comps), precompRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, precomps), footageRatio = aetoolkitCepOrganizerFolder(snapshot, ratio, footage), solids = aetoolkitCepOrganizerFolder(snapshot, "SOLIDS", gfx), moved = 0, item, ext, sourceName, normalizedPath, destination;
    for (var i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (snapshot.protectedIds[item.id]) continue;
        if (item instanceof CompItem) destination = item.usedIn && item.usedIn.length ? precompRatio : compRatio;
        else if (item instanceof FootageItem) {
            if (aetoolkitCepIsSolid(item)) destination = solids;
            else {
                ext = aetoolkitCepOrganizerExtension(item);
                sourceName = item.file ? item.file.name : item.name;
                normalizedPath = item.file ? ("/" + item.file.fsName.split("\\").join("/").toLowerCase()) : "";
                if (!aetoolkitCepIsStill(item) && (/^(wav|aif|aiff|mp3|m4a|aac)$/.test(ext) || item.hasAudio && !item.hasVideo)) destination = footageRatio;
                else if (!aetoolkitCepIsStill(item) && /^(mov|mp4|mxf|avi)$/.test(ext) && normalizedPath.indexOf("/06_togfx/") !== -1) destination = footageRatio;
                else destination = aetoolkitCepOrganizerFolder(snapshot, (ext === "jpg" ? "JPEG" : ext === "tiff" ? "TIF" : ext ? ext.toUpperCase() : "OTHER"), gfx);
            }
        } else continue;
        item.parentFolder = destination;
        moved++;
    }
    return moved;
}
function aetoolkitCepOrganizeXav(snapshot) {
    var root = app.project.rootFolder, comps = aetoolkitCepOrganizerFolder(snapshot, "01_compositions", root), cuts = aetoolkitCepOrganizerFolder(snapshot, "02_cuts", root), assets = aetoolkitCepOrganizerFolder(snapshot, "03_assets", root), c4d = aetoolkitCepOrganizerFolder(snapshot, "04_c4d", root), aeImport = aetoolkitCepOrganizerFolder(snapshot, "05_AE-import", root), solids = aetoolkitCepOrganizerFolder(snapshot, "Solids", root), unsorted = aetoolkitCepOrganizerFolder(snapshot, "unsorted", root), pre = aetoolkitCepOrganizerFolder(snapshot, "_PRE", comps), indivs = aetoolkitCepOrganizerFolder(snapshot, "_INDIVS", comps), subs = aetoolkitCepOrganizerFolder(snapshot, "_SUBS", comps), audio = aetoolkitCepOrganizerFolder(snapshot, "Audio", assets), images = aetoolkitCepOrganizerFolder(snapshot, "Images", assets), footage = aetoolkitCepOrganizerFolder(snapshot, "Footage", assets), imageFolders = {}, footageFolders = {}, imageTypes = ["psd", "png", "tiff", "ai", "svg", "jpg", "exr"], footageTypes = ["mxf", "mov", "mp4", "avi"], usedCompIds = {}, i, j, item, layer, name, fileName, ext, destination, moved = 0;
    for (i = 0; i < imageTypes.length; i++) imageFolders[imageTypes[i]] = aetoolkitCepOrganizerFolder(snapshot, imageTypes[i], images);
    imageFolders.tif = imageFolders.tiff; imageFolders.jpeg = imageFolders.jpg;
    for (i = 0; i < footageTypes.length; i++) footageFolders[footageTypes[i]] = aetoolkitCepOrganizerFolder(snapshot, footageTypes[i], footage);
    for (i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (!(item instanceof CompItem)) continue;
        for (j = 1; j <= item.numLayers; j++) { try { layer = item.layer(j); if (layer && layer.source instanceof CompItem) usedCompIds[layer.source.id] = true; } catch (layerError) {} }
    }
    function has(text, values) { for (var index = 0; index < values.length; index++) if (text.indexOf(values[index]) !== -1) return true; return false; }
    for (i = 0; i < snapshot.items.length; i++) {
        item = snapshot.items[i];
        if (snapshot.protectedIds[item.id]) continue;
        name = String(item.name || "").toLowerCase();
        if (item instanceof CompItem) {
            if (has(name, ["_indiv", "indiv_"])) destination = indivs;
            else if (has(name, ["_sub", "sub_", "subtitle", "captions"])) destination = subs;
            else if ((has(name, ["_pre_", "precomp", "_pc", "pc_"]) || usedCompIds[item.id]) && !has(name, ["_ref", "_ckr", "_chkr", "_key", "_alpha", "_txls", "_txtls", "_comp"])) destination = pre;
            else destination = comps;
        } else if (item instanceof FootageItem) {
            fileName = item.file ? item.file.name.toLowerCase() : name; ext = aetoolkitCepOrganizerExtension(item);
            if (aetoolkitCepIsSolid(item)) destination = solids;
            else if (name.indexOf("_ref") !== -1 || fileName.indexOf("_ref") !== -1) destination = cuts;
            else if (has(name, ["adobe after effects", "aegraphic", "ae import", "essential graphics"])) destination = aeImport;
            else if (ext === "c4d") destination = c4d;
            else if (imageFolders[ext]) destination = imageFolders[ext];
            else if (footageFolders[ext]) destination = footageFolders[ext];
            else if (/^(aif|aiff|mp3|wav)$/.test(ext)) destination = audio;
            else destination = unsorted;
        } else destination = unsorted;
        item.parentFolder = destination;
        moved++;
    }
    return moved;
}
function aetoolkitCepOrganizeProject(preset) {
    try {
        var allowed = { basic: true, "dms-16x9": true, "dms-9x16": true, "dms-4x5": true, "dms-1x1": true, "xav-2025": true }, snapshot, moved;
        if (!allowed[preset]) throw new Error("Choose an organizer preset.");
        app.beginUndoGroup("AE Toolkit CEP: Organize project");
        try {
            snapshot = aetoolkitCepOrganizerSnapshot();
            aetoolkitCepLiftSelectedItems(snapshot);
            if (preset === "basic") moved = aetoolkitCepOrganizeBasic(snapshot);
            else if (preset === "xav-2025") moved = aetoolkitCepOrganizeXav(snapshot);
            else moved = aetoolkitCepOrganizeDms(snapshot, preset.substring(4));
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ moved: moved, selectedAtRoot: snapshot.selected.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepActiveCompLayers(minimum) {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) throw new Error("Open a composition and select layer" + (minimum === 1 ? "." : "s."));
    if (!comp.selectedLayers || comp.selectedLayers.length < minimum) throw new Error("Select " + (minimum === 1 ? "at least one layer." : "at least " + minimum + " layers."));
    return { comp: comp, layers: comp.selectedLayers };
}
function aetoolkitCepAdjustSelectedCompFrames(value) {
    try {
        var frames = aetoolkitCepNumber(value, "Frame change", -9999, 9999, true), comps = aetoolkitCepSelectedComps(), changed = 0, duration, minimum;
        if (frames === 0) throw new Error("Enter a non-zero frame change.");
        app.beginUndoGroup("AE Toolkit CEP: Adjust composition duration");
        try {
            for (var i = 0; i < comps.length; i++) {
                minimum = comps[i].frameDuration || 1 / comps[i].frameRate;
                duration = comps[i].duration + frames / comps[i].frameRate;
                comps[i].duration = Math.max(minimum, duration);
                changed++;
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSetSelectedCompDuration(value) {
    try {
        var requested = aetoolkitCepNumber(value, "Duration", 0.001, 86400, false), comps = aetoolkitCepSelectedComps(), changed = 0, minimum;
        app.beginUndoGroup("AE Toolkit CEP: Set composition duration");
        try {
            for (var i = 0; i < comps.length; i++) {
                minimum = comps[i].frameDuration || 1 / comps[i].frameRate;
                comps[i].duration = Math.max(minimum, requested);
                changed++;
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepFadeSelectedLayers(jsonText) {
    try {
        var options = JSON.parse(jsonText), direction = options.direction, frames = aetoolkitCepNumber(options.frames, "Fade frames", 1, 9999, true), context = aetoolkitCepActiveCompLayers(1), duration = frames / context.comp.frameRate, i, layer, start, end;
        if (direction !== "in" && direction !== "out") throw new Error("Choose a fade direction.");
        app.beginUndoGroup("AE Toolkit CEP: Fade selected layers");
        try {
            for (i = 0; i < context.layers.length; i++) {
                layer = context.layers[i];
                if (direction === "in") { start = layer.inPoint; end = Math.min(layer.outPoint, start + duration); layer.opacity.setValueAtTime(start, 0); layer.opacity.setValueAtTime(end, 100); }
                else { end = layer.outPoint; start = Math.max(layer.inPoint, end - duration); layer.opacity.setValueAtTime(start, 100); layer.opacity.setValueAtTime(end, 0); }
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepSequenceSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), layers = [], i, current = context.comp.time, duration, offset;
        for (i = 0; i < context.layers.length; i++) layers.push(context.layers[i]);
        layers.sort(function (first, second) { return first.inPoint - second.inPoint || first.index - second.index; });
        app.beginUndoGroup("AE Toolkit CEP: Sequence layers");
        try {
            for (i = 0; i < layers.length; i++) {
                duration = layers[i].outPoint - layers[i].inPoint;
                offset = layers[i].inPoint - layers[i].startTime;
                layers[i].startTime = current - offset;
                current += duration;
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepParentSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(2), parent = context.layers[context.layers.length - 1], i;
        app.beginUndoGroup("AE Toolkit CEP: Parent selected layers");
        try { for (i = 0; i < context.layers.length - 1; i++) context.layers[i].parent = parent; }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepUnparentSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), i;
        app.beginUndoGroup("AE Toolkit CEP: Unparent selected layers");
        try { for (i = 0; i < context.layers.length; i++) context.layers[i].parent = null; }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepMarkSelectedGuideLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), i;
        app.beginUndoGroup("AE Toolkit CEP: Mark guide layers");
        try { for (i = 0; i < context.layers.length; i++) context.layers[i].guideLayer = true; }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReplaceSelectedText(text) {
    try {
        var context = aetoolkitCepActiveCompLayers(1), replacement = new TextDocument(String(text || " ")), changed = 0, i, property;
        app.beginUndoGroup("AE Toolkit CEP: Replace text");
        try {
            for (i = 0; i < context.layers.length; i++) {
                try {
                    property = context.layers[i].property("ADBE Text Properties").property("ADBE Text Document");
                    if (property.numKeys > 0) property.setValueAtTime(context.comp.time, replacement); else property.setValue(replacement);
                    changed++;
                } catch (notTextError) {}
            }
        } finally { app.endUndoGroup(); }
        if (!changed) throw new Error("Select one or more text layers.");
        return JSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepLayerMatchesType(layer, type) {
    var source;
    try { source = layer.source; } catch (sourceError) { source = null; }
    if (type === "null") return !!layer.nullLayer;
    if (type === "solid") { try { return !layer.nullLayer && source && source.mainSource instanceof SolidSource; } catch (solidError) { return false; } }
    if (type === "shape") return layer.matchName === "ADBE Vector Layer";
    if (type === "camera") return layer.matchName === "ADBE Camera Layer";
    if (type === "light") return layer.matchName === "ADBE Light Layer";
    if (type === "comp") return source instanceof CompItem;
    if (type === "footage") { try { return !layer.nullLayer && source instanceof FootageItem && !(source.mainSource instanceof SolidSource); } catch (footageError) { return false; } }
    if (type === "text") { try { return !!layer.property("ADBE Text Properties"); } catch (textError) { return false; } }
    return false;
}
function aetoolkitCepSelectLayersByType(jsonText) {
    try {
        var options = JSON.parse(jsonText), allowed = { "null": true, solid: true, shape: true, comp: true, footage: true, text: true, camera: true, light: true }, context = aetoolkitCepActiveCompLayers(0), comp = context.comp, mode = options.mode, changed = 0, i, layer, matches;
        if (!allowed[options.type]) throw new Error("Choose a layer type.");
        if (mode !== "only" && mode !== "add" && mode !== "subtract") throw new Error("Choose a selection mode.");
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i); matches = aetoolkitCepLayerMatchesType(layer, options.type);
            if (mode === "only") layer.selected = matches;
            else if (matches && mode === "add") layer.selected = true;
            else if (matches && mode === "subtract") layer.selected = false;
            if (matches) changed++;
        }
        return JSON.stringify({ changed: changed });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepReverseSelectedLayerOrder() {
    try {
        var context = aetoolkitCepActiveCompLayers(1), layers = [], i;
        for (i = 0; i < context.layers.length; i++) layers.push(context.layers[i]);
        layers.sort(function (first, second) { return first.index - second.index; });
        app.beginUndoGroup("AE Toolkit CEP: Reverse layer order");
        try { for (i = 0; i < layers.length; i++) layers[i].moveToBeginning(); }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: layers.length });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepTransformProperty(layer, matchName) {
    var transform = layer.property("ADBE Transform Group"), property = transform && transform.property(matchName);
    if (!property) throw new Error("Layer does not support " + matchName + ".");
    return property;
}
function aetoolkitCepSetCurrentPropertyValue(property, value, time) {
    if (property.numKeys > 0 || property.isTimeVarying) property.setValueAtTime(time, value); else property.setValue(value);
}
function aetoolkitCepSnapSelectedLayers() {
    try {
        var context = aetoolkitCepActiveCompLayers(2), source = aetoolkitCepTransformProperty(context.layers[context.layers.length - 1], "ADBE Position").value, i, property;
        app.beginUndoGroup("AE Toolkit CEP: Snap selected layers");
        try { for (i = 0; i < context.layers.length - 1; i++) { property = aetoolkitCepTransformProperty(context.layers[i], "ADBE Position"); aetoolkitCepSetCurrentPropertyValue(property, source, context.comp.time); } }
        finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepTransferTransform(jsonText) {
    try {
        var options = JSON.parse(jsonText), context = aetoolkitCepActiveCompLayers(2), source = context.layers[context.layers.length - 1], properties = [], i, target, propertyIndex, sourceProperty, targetProperty;
        if (options.position) properties.push("ADBE Position");
        if (options.scale) properties.push("ADBE Scale");
        if (options.rotation) properties.push("ADBE Rotate Z");
        if (!properties.length) throw new Error("Choose one or more transform properties.");
        app.beginUndoGroup("AE Toolkit CEP: Transfer transform");
        try {
            for (i = 0; i < context.layers.length - 1; i++) {
                target = context.layers[i];
                for (propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
                    sourceProperty = aetoolkitCepTransformProperty(source, properties[propertyIndex]);
                    targetProperty = aetoolkitCepTransformProperty(target, properties[propertyIndex]);
                    aetoolkitCepSetCurrentPropertyValue(targetProperty, sourceProperty.value, context.comp.time);
                }
            }
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ changed: context.layers.length - 1 });
    } catch (error) { return "ERROR: " + error.toString(); }
}
function aetoolkitCepCreateNoSlateComp(value) {
    try {
        var frames = aetoolkitCepNumber(value, "Slate frames", 1, 9999, true), selected = app.project.selection, footage, trimTime, duration, comp, layer;
        if (selected.length !== 1 || !(selected[0] instanceof FootageItem)) throw new Error("Select exactly one footage item in the Project panel.");
        footage = selected[0];
        if (!(footage.frameRate > 0) || !(footage.duration > 0)) throw new Error("The selected footage needs a valid frame rate and duration.");
        trimTime = frames / footage.frameRate;
        duration = footage.duration - trimTime;
        if (duration < 1 / footage.frameRate) throw new Error("The selected footage is shorter than the slate trim.");
        app.beginUndoGroup("AE Toolkit CEP: Create no-slate comp");
        try {
            comp = app.project.items.addComp(aetoolkitCepSafeName(footage.name) + "_NoSlate", footage.width, footage.height, footage.pixelAspect, duration, footage.frameRate);
            comp.label = 14;
            layer = comp.layers.add(footage);
            layer.startTime = -trimTime;
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ id: comp.id, name: comp.name });
    } catch (error) { return "ERROR: " + error.toString(); }
}
