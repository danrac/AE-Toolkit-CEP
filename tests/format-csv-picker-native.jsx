(function () {
    var root = new File($.fileName).parent.parent.fsName, output = new File("/private/tmp/toolbox-csv-picker-native.txt"), result;
    try {
        $.evalFile(new File(root + "/host/host.jsx"));
        var response = aetoolkitCepChooseFormatCSV();
        if (!response) result = "CANCELLED: native CSV file picker returned without changing data.";
        else {
            if (response.indexOf("ERROR:") === 0) throw new Error(response);
            var file = AEToolkitJSON.parse(response);
            if (!file.path || file.text.indexOf("CLIENT,") !== 0) throw new Error("CSV read failed.");
            result = "PASS: native CSV file picker read the selected CSV (" + file.text.length + " characters) in AE " + app.version;
        }
    } catch (error) { result = "FAIL line " + error.line + ": " + error.toString(); }
    output.open("w"); output.write(result); output.close();
}());
