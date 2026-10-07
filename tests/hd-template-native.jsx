(function () {
    var repo = new File($.fileName).parent.parent.fsName, root = "/private/tmp/toolbox-hd-fixtures", output = new File(root + "/native-results.json"), report = {checks:[],passed:false}, comp, folder, second, plain, i;
    function check(condition,message) { if (!condition) throw new Error(message); report.checks.push(message); }
    function find(id) { for (var n = 1; n <= app.project.numItems; n++) if (app.project.item(n).id === id) return app.project.item(n); return null; }
    function create(options) { var response = aetoolkitCepCreateComp(AEToolkitJSON.stringify(options)); if (response.indexOf("ERROR:") === 0) throw new Error(response); return find(AEToolkitJSON.parse(response).id); }
    try {
        $.evalFile(new File(repo + "/host/host.jsx")); AEToolkitHostDirectory = repo + "/host";
        var file = new File(root + "/test-template.json"); file.open("r"); var preset = AEToolkitJSON.parse(file.read()); file.close();
        // Reverse the declared asset order to verify that ordering is deliberate.
        var assets = {chartTwo:preset.assets.chartTwo,matte:preset.assets.matte,chartOne:preset.assets.chartOne};
        var options = {job:"TEST",format:preset.formatCode,style:"A",description:"HD_guides",initials:"DR",width:preset.width,height:preset.height,fps:preset.fps,duration:10,addGuides:true,guideAssets:assets};
        // Remove only unfinished fixture comps from earlier attempts in this test folder.
        for (i = app.project.numItems; i >= 1; i--) {
            var previous = app.project.item(i), isFixture = previous instanceof CompItem && previous.numLayers === 3 && previous.parentFolder.name === "Toolbox HD Template Test (Temporary)";
            if (isFixture) {
                for (var n = 1; n <= previous.numLayers; n++) if (!previous.layer(n).source || !previous.layer(n).source.file || previous.layer(n).source.file.fsName.indexOf(root + "/TEST_HD_") !== 0) isFixture = false;
                if (isFixture) previous.remove();
            }
        }
        for (i = app.project.numItems; i >= 1; i--) { var empty = app.project.item(i); if (empty instanceof FolderItem && empty.name === "Toolbox HD Template Test (Temporary)" && empty.numItems === 0) empty.remove(); }
        comp = create(options);
        folder = app.project.items.addFolder("Toolbox HD Template Test (Temporary)"); comp.parentFolder = folder;
        check(comp.width === 1920 && comp.height === 1080,"Composition is 1920x1080");
        check(comp.frameRate === 24,"Composition uses the template's 24 FPS");
        check(comp.numLayers === 3,"One matte and two guides imported");
        report.actualOrder = [];
        for (i = 1; i <= comp.numLayers; i++) report.actualOrder.push({name:comp.layer(i).name,comment:comp.layer(i).comment});
        check(comp.layer(1).comment === "Toolbox2:format-guide:chartOne" && comp.layer(2).comment === "Toolbox2:format-guide:chartTwo" && comp.layer(3).comment === "Toolbox2:format-guide:matte","Layer order is Guide 1, Guide 2, Matte");
        var sources = [], layers = [];
        for (i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i), position = layer.transform.position.value, anchor = layer.transform.anchorPoint.value;
            check(layer.source.width === 1920 && layer.source.height === 1080,layer.name + " dimensions match");
            check(position[0] === 960 && position[1] === 540 && anchor[0] === 960 && anchor[1] === 540,layer.name + " centered with centered anchor");
            check(layer.guideLayer,layer.name + " is a non-rendering reference layer");
            check(layer.opacity.value === (i === 3 ? 100 : 50),layer.name + " reference opacity correct");
            sources.push(layer.source); layer.source.parentFolder = folder;
            layers.push({name:layer.name,tag:layer.comment,source:layer.source.file.fsName,position:position,anchor:anchor,opacity:layer.opacity.value,guideLayer:layer.guideLayer});
        }
        second = create(options);
        check(second.layer(1).source.id === sources[0].id && second.layer(2).source.id === sources[1].id && second.layer(3).source.id === sources[2].id,"Repeat creation reuses the imported asset sources"); second.remove(); second = null;
        options.addGuides = false; plain = create(options); check(plain.numLayers === 0,"Add Guides off creates no reference layers"); plain.remove(); plain = null;
        var count = app.project.numItems;
        options.addGuides = true; options.guideAssets = {matte:root + "/MISSING_TEST_MATTE.png"};
        check(aetoolkitCepCreateComp(AEToolkitJSON.stringify(options)).indexOf("ERROR:") === 0 && app.project.numItems === count,"Missing asset fails before creating a partial composition");
        var background = comp.layers.addSolid([0.16,0.22,0.30],"Graphic Placeholder Background (test only)",1920,1080,1,10); background.moveToEnd(); background.source.parentFolder = folder;
        var title = comp.layers.addText("TOOLBOX HD TEMPLATE TEST\n1920 x 1080  |  24 FPS"), document = title.property("ADBE Text Properties").property("ADBE Text Document").value;
        document.fontSize = 64; document.fillColor = [0.9,0.94,1]; document.justification = ParagraphJustification.CENTER_JUSTIFY;
        title.property("ADBE Text Properties").property("ADBE Text Document").setValue(document); title.name = "Graphic Placeholder Title (test only)";
        title.transform.position.setValue([960,540]); title.moveAfter(comp.layer(4));
        comp.time = 0; comp.openInViewer();
        report.passed = true; report.comp = {id:comp.id,name:comp.name,width:comp.width,height:comp.height,fps:comp.frameRate,duration:comp.duration}; report.references = layers; report.aeVersion = app.version;
    } catch (error) { report.error = "Line " + error.line + ": " + error.toString(); }
    finally { if (second) second.remove(); if (plain) plain.remove(); output.open("w"); output.write(AEToolkitJSON.stringify(report)); output.close(); }
}());
