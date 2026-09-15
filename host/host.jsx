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
