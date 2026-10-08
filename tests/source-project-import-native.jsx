// Set /private/tmp/toolbox-source-import-fixture.json to {"path":"/absolute/fixture.aep"}.
// Imports temporary copies without opening/saving the fixture or changing existing items.
(function () {
    var repo = new File($.fileName).parent.parent.fsName, report = { passed: false, checks: [] }, original = {}, selected = [], oldHostDirectory = typeof AEToolkitHostDirectory === "undefined" ? "" : AEToolkitHostDirectory;
    var output = new File("/private/tmp/toolbox-source-import-native-results.json"), temp = new Folder(Folder.temp.fsName + "/toolbox-source-import-" + new Date().getTime()), undo = false, suppress = false, i, item;
    function check(condition, message) { if (!condition) throw new Error(message); report.checks.push(message); }
    function cleanup() {
        for (var n = app.project.numItems; n >= 1; n--) { var current = app.project.item(n); if (!original[current.id]) try { current.remove(); } catch (ignoreRemoval) {} }
    }
    for (i = 1; i <= app.project.numItems; i++) { item = app.project.item(i); original[item.id] = true; if (item.selected) selected.push(item); }
    try {
        $.evalFile(new File(repo + "/host/host.jsx")); AEToolkitHostDirectory = repo + "/host";
        var config = new File("/private/tmp/toolbox-source-import-fixture.json"); check(config.open("r"), "Fixture configuration available");
        var fixture = new File(AEToolkitJSON.parse(config.read()).path); config.close(); check(fixture.exists, "AE project fixture available");
        temp.create(); var a = new File(temp.fsName + "/Source A.aep"), b = new File(temp.fsName + "/Source B.aep");
        check(fixture.copy(a.fsName) && fixture.copy(b.fsName), "Two temporary project copies created");
        app.beginUndoGroup("Toolbox source-comp matching QA"); undo = true; app.beginSuppressDialogs(); suppress = true;
        var probe = app.project.importFile(new ImportOptions(a)), comps = [], names = [], renders = [];
        aetoolkitCepGatherSourceComps(probe, comps);
        for (i = 0; i < comps.length && names.length < 3; i++) if (!aetoolkitCepArrayContains(names, comps[i].name)) names.push(comps[i].name);
        check(names.length > 0, "Native source fixture contains compositions"); cleanup();
        for (i = 0; i < names.length; i++) renders.push(names[i] + (i % 2 ? "_1920x1080.png" : "_23_976fps_1920x1080.mov"));
        var result = AEToolkitJSON.parse(aetoolkitCepImportSourceProjects(AEToolkitJSON.stringify({ paths: [a.fsName, b.fsName], records: [{ path: a.fsName, sourceNames: renders }, { path: b.fsName, sourceNames: renders }] })));
        check(result.imported === 2 && result.errors.length === 0, "Two actual AE projects imported successfully");
        check(result.matches.length === names.length * 2, "Every render has an import result");
        var target = aetoolkitCepProjectFolder("ImportedComps");
        for (i = 0; i < names.length; i++) {
            check(result.matches[i].compName === names[i], "Matched source comp with render suffix: " + names[i]);
            check(result.matches[i + names.length].status === "reused", "Second project does not duplicate isolated comp: " + names[i]);
            var count = 0; for (var n = 1; n <= target.numItems; n++) if (target.item(n) instanceof CompItem && target.item(n).name === names[i]) count++;
            check(count === 1, "Exactly one isolated composition: " + names[i]);
        }
        report.summary = result; report.aeVersion = app.version; report.passed = true;
    } catch (error) { report.error = "Line " + error.line + ": " + error.toString(); }
    finally {
        cleanup(); for (i = 0; i < selected.length; i++) try { selected[i].selected = true; } catch (ignoreSelection) {}
        if (suppress) app.endSuppressDialogs(false); if (undo) app.endUndoGroup(); AEToolkitHostDirectory = oldHostDirectory;
        if (temp.exists) { var files = temp.getFiles(); for (i = 0; i < files.length; i++) if (files[i] instanceof File) files[i].remove(); temp.remove(); }
        output.open("w"); output.write(AEToolkitJSON.stringify(report)); output.close();
    }
}());
