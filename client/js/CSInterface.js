(function (global) {
    function CSInterface() {}
    CSInterface.prototype.evalScript = function (script, callback) {
        if (global.__adobe_cep__ && global.__adobe_cep__.evalScript) {
            global.__adobe_cep__.evalScript(script, callback || function () {});
            return;
        }
        if (callback) setTimeout(function () { callback(""); }, 0);
    };
    global.CSInterface = CSInterface;
}(this));
