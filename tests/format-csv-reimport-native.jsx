(function () {
    var repo = new File($.fileName).parent.parent.fsName, previousRoot = typeof AEToolkitLibraryRoot === "undefined" ? "" : AEToolkitLibraryRoot, report = {passed:false,checks:[]}, root, output;
    function read(path) { var file = new File(path); if (!file.open("r")) throw new Error("Cannot read " + path); var text = file.read(); file.close(); return text; }
    function check(condition,message) { if (!condition) throw new Error(message); report.checks.push(message); }
    function verify(data,aspectCount,checkerCount) {
        check(data.compPresets.length === aspectCount && data.checkerPresets.length === checkerCount,"Stored aspect and checker counts match");
        var categories = [data.compPresets,data.checkerPresets], i,j,seen,imported,entry,key;
        for(i=0;i<categories.length;i++) {
            seen={};imported={};
            for(j=0;j<categories[i].length;j++) {
                entry=categories[i][j]; check(!seen[entry.id],"Unique ID: "+entry.id);seen[entry.id]=true;
                if(entry.importSource === "format-csv") { key=String(entry.client).toLowerCase()+"|"+String(entry.formatCode).toLowerCase();check(!imported[key],"Unique client/code: "+key);imported[key]=true; }
            }
        }
    }
    try {
        $.evalFile(new File(repo + "/host/host.jsx"));
        var meta=AEToolkitJSON.parse(read("/private/tmp/toolbox-csv-reimport-latest.json"));root=meta.root;output=new File(root+"/native-reimport-results.json");
        var states=AEToolkitJSON.parse(read(root+"/native-import-states.json"));
        AEToolkitLibraryRoot=root+"/library";
        check(aetoolkitCepSaveState(AEToolkitJSON.stringify(states.first)) === "OK","Original CSV definitions saved through native library storage");
        var first=AEToolkitJSON.parse(aetoolkitCepLoadState());verify(first,35,21);check(first.libraryRevision===1,"First save revision is 1");
        check(aetoolkitCepSaveState(AEToolkitJSON.stringify(states.second)) === "OK","Updated CSV definitions saved through native library storage");
        var second=AEToolkitJSON.parse(aetoolkitCepLoadState());verify(second,38,24);check(second.libraryRevision===2,"Second save revision is 2");
        var originalStory,updatedStory;
        for(var n=0;n<first.compPresets.length;n++) if(first.compPresets[n].client==="Amazon" && first.compPresets[n].formatCode==="AZ-STRY") originalStory=first.compPresets[n];
        for(n=0;n<second.compPresets.length;n++) if(second.compPresets[n].client==="Amazon" && second.compPresets[n].formatCode==="AZ-STRY") updatedStory=second.compPresets[n];
        check(originalStory.id===updatedStory.id && updatedStory.name==="Amazon Story - QA Updated" && updatedStory.fps===25,"Existing entry updated in place, retaining its ID");
        var path=root+"/library/project-templates.json",before=read(path);
        verify(states.third,38,24);check(states.third.libraryRevision===2,"Unchanged repeat does not require another save revision");
        check(before===read(path),"Unchanged repeat leaves the native library file untouched");
        report.passed=true;report.aeVersion=app.version;report.revision=second.libraryRevision;report.aspectPresets=38;report.checkerPresets=24;report.duplicateIDs=0;report.duplicateClientCodes=0;
    }catch(error){report.error="Line "+error.line+": "+error.toString();}
    finally {AEToolkitLibraryRoot=previousRoot;if(output){output.open("w");output.write(AEToolkitJSON.stringify(report));output.close();}}
}());
