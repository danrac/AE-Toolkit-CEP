(function () {
    var repo = new File($.fileName).parent.parent.fsName, report = {passed:false,checks:[]}, output = new File("/private/tmp/toolbox-native-backup-results.json"), oldRoot = typeof AEToolkitLibraryRoot === "undefined" ? "" : AEToolkitLibraryRoot, original = {}, selected = [], comp, i, item, opened = false;
    function check(condition,message) { if (!condition) throw new Error(message); report.checks.push(message); }
    for (i = 1; i <= app.project.numItems; i++) { item = app.project.item(i); original[item.id] = true; if (item.selected) selected.push(item); }
    try {
        $.evalFile(new File(repo + "/host/host.jsx")); AEToolkitHostDirectory = repo + "/host";
        var file = new File("/private/tmp/toolbox-native-backup-qa.json"); file.open("r"); var backup = AEToolkitJSON.parse(file.read()); file.close();
        check(!new Folder(backup.metadata.source).exists,"Original shared-library path is unavailable");
        check(new Folder(backup.root).exists,"Local backup is available");
        AEToolkitLibraryRoot = backup.root;
        var preset;
        for (i = 0; i < backup.state.compPresets.length; i++) if (backup.state.compPresets[i].id === "backup-qa-hd") preset = backup.state.compPresets[i];
        check(!!preset,"Client preset retained in local backup");
        app.beginUndoGroup("Toolbox local-backup QA"); opened = true;
        var response = aetoolkitCepCreateComp(AEToolkitJSON.stringify({job:"BACKUP_QA",format:preset.formatCode,width:preset.width,height:preset.height,fps:preset.fps,duration:2,addGuides:true,guideAssets:preset.assets}));
        if (response.indexOf("ERROR:") === 0) throw new Error(response);
        var id = AEToolkitJSON.parse(response).id;
        for (i = 1; i <= app.project.numItems; i++) if (app.project.item(i).id === id) comp = app.project.item(i);
        check(comp && comp.width === 1920 && comp.height === 1080 && comp.frameRate === 24,"Offline comp uses backed-up dimensions and FPS");
        check(comp.numLayers === 3,"Offline matte and two guides imported");
        for (i = 1; i <= comp.numLayers; i++) check(comp.layer(i).source.file.fsName.indexOf(backup.root + "/") === 0,"Reference layer " + i + " uses local cached media");
        report.passed = true; report.aeVersion = app.version; report.cacheRoot = backup.root;
    } catch (error) { report.error = "Line " + error.line + ": " + error.toString(); }
    finally {
        if (comp) try { comp.remove(); } catch (ignoreComp) {}
        for (i = app.project.numItems; i >= 1; i--) { item = app.project.item(i); if (!original[item.id]) try { item.remove(); } catch (ignoreItem) {} }
        for (i = 0; i < selected.length; i++) try { selected[i].selected = true; } catch (ignoreSelection) {}
        if (opened) app.endUndoGroup(); AEToolkitLibraryRoot = oldRoot;
        output.open("w"); output.write(AEToolkitJSON.stringify(report)); output.close();
    }
}());
