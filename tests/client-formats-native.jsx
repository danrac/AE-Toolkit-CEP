(function () {
    var root = new File($.fileName).parent.parent.fsName, output = new File("/private/tmp/toolbox-client-formats-native.txt"), original = {}, selected = [], created, source, checker, item, i, guideCount = 0, result;
    for (i = 1; i <= app.project.numItems; i++) { item = app.project.item(i); original[item.id] = true; if (item.selected) selected.push(item); }
    try {
        $.evalFile(new File(root + "/host/host.jsx"));
        AEToolkitHostDirectory = root + "/host";
        for (i = 0; i < selected.length; i++) selected[i].selected = false;
        source = app.project.items.addComp("Toolbox CSV temporary source",1920,1080,1,2,24); source.selected = true;
        created = aetoolkitCepCreateCheckers(AEToolkitJSON.stringify({width:1080,height:1920,frame:10,guideAssets:{chartOne:"bundled:HD_chart.psd"}}));
        if (created.indexOf("ERROR:") === 0) throw new Error(created);
        if (AEToolkitJSON.parse(created).created !== 1) throw new Error("Checker count mismatch.");
        for (i = 1; i <= app.project.numItems; i++) { item = app.project.item(i); if (!original[item.id] && item instanceof CompItem && item !== source && item.name.indexOf("CKR_") === 0) checker = item; }
        if (!checker || checker.width !== 1080 || checker.height !== 1920) throw new Error("Target dimensions mismatch.");
        if (checker.frameRate !== source.frameRate || checker.duration !== source.duration) throw new Error("Checker timing mismatch.");
        for (i = 1; i <= checker.numLayers; i++) { item = checker.layer(i); if (item.comment === "Toolbox2:format-guide:chartOne") { guideCount++; if (!item.guideLayer) throw new Error("Guide switch missing."); if (item.transform.position.value[0] !== 540 || item.transform.position.value[1] !== 960) throw new Error("Guide position mismatch."); } }
        if (guideCount !== 1) throw new Error("Preset guide was not added exactly once.");
        if (source.width !== 1920 || source.height !== 1080) throw new Error("Source composition changed.");
        result = "PASS: native client checker dimensions, source timing, configured guide, guide center, and source preservation in AE " + app.version;
    } catch (error) { result = "FAIL line " + error.line + ": " + error.toString(); }
    finally {
        for (i = app.project.numItems; i >= 1; i--) { item = app.project.item(i); if (!original[item.id]) try { item.remove(); } catch (cleanupError) {} }
        for (i = 0; i < selected.length; i++) try { selected[i].selected = true; } catch (selectionError) {}
        output.open("w"); output.write(result); output.close();
    }
}());
