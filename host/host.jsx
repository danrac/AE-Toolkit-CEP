function aetoolkitCepDataFolder() {
    var folder = new Folder(Folder.userData.fsName + "/AE-Toolkit-CEP");
    if (!folder.exists && !folder.create()) throw new Error("Cannot create " + folder.fsName);
    return folder;
}
function aetoolkitCepStateFile() { return new File(aetoolkitCepDataFolder().fsName + "/project-templates.json"); }
function aetoolkitCepDefaultState() {
    return '{"version":1,"templates":[{"id":"default-motion","name":"Default Motion Project","folders":{"afterEffects":"05_GFX/02_AfterEffects","assets":"05_GFX/03_Assets","toGfx":"05_GFX/06_ToGFX","outputs":"05_GFX/07_Output","styleFrames":"05_GFX/07_Output/_StyleFrames"},"customFolders":[]}],"projects":[]}';
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
