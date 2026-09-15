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
        } finally { app.endUndoGroup(); }
        return JSON.stringify({ id: comp.id, name: comp.name, width: comp.width, height: comp.height, fps: comp.frameRate });
    } catch (error) { return "ERROR: " + error.toString(); }
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
