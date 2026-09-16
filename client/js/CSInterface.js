(function (global) {
    function CSInterface() {}
    CSInterface.prototype.getExtensionPath = function () {
        if (!global.__adobe_cep__ || !global.__adobe_cep__.getSystemPath) return "";
        var path = global.__adobe_cep__.getSystemPath("extension");
        if (/^file:/i.test(path)) {
            path = path.replace(/^file:\/\/localhost/i, "").replace(/^file:\/\//i, "");
            if (/^\/[A-Za-z]:/.test(path)) path = path.substring(1);
            try { path = decodeURI(path); } catch (error) {}
        }
        return path;
    };
    CSInterface.prototype.evalScript = function (script, callback) {
        if (global.__adobe_cep__ && global.__adobe_cep__.evalScript) {
            global.__adobe_cep__.evalScript(script, callback || function () {});
            return;
        }
        if (callback) setTimeout(function () { callback(""); }, 0);
    };
    global.CSInterface = CSInterface;
}(this));
