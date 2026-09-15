function aetoolkitCepDataFolder() {
    var folder = new Folder(Folder.userData.fsName + "/AE-Toolkit-CEP");
    if (!folder.exists && !folder.create()) throw new Error("Cannot create " + folder.fsName);
    return folder;
}
function aetoolkitCepStateFile() { return new File(aetoolkitCepDataFolder().fsName + "/project-templates.json"); }
function aetoolkitCepDefaultState() {
    return '{"version":1,"templates":[{"id":"default-motion","name":"Default Motion Project","folders":{"afterEffects":"05_GFX/02_AfterEffects","assets":"05_GFX/03_Assets","toGfx":"05_GFX/06_ToGFX","outputs":"05_GFX/07_Output","styleFrames":"05_GFX/07_Output/_StyleFrames"}}],"projects":[]}';
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
        JSON.parse(jsonText);
        var file = aetoolkitCepStateFile();
        if (!file.open("w")) throw new Error("Cannot save templates.");
        if (!file.write(jsonText)) throw new Error("Cannot write templates.");
        file.close();
        return "OK";
    } catch (error) { return "ERROR: " + error.toString(); }
}
