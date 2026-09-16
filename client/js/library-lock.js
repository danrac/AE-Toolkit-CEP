/* Exclusive filesystem lock shared by all Toolbox writers. ES5 for CEP's Node runtime. */
var fs = require('fs');
exports.acquire = function (statePath) {
    var lockPath = statePath + '.lock', fd;
    try { fd = fs.openSync(lockPath, 'wx', 384); }
    catch (error) {
        if (error.code === 'EEXIST') throw new Error('Library is locked by another save. Retry after it finishes. If a computer crashed, close Toolbox on all writers before removing ' + lockPath);
        throw error;
    }
    var released = false;
    try { fs.writeSync(fd, JSON.stringify({pid:process.pid, started:new Date().toISOString()})); }
    catch (error) { fs.closeSync(fd); fs.unlinkSync(lockPath); throw error; }
    return function () {
        if (released) return;
        released = true;
        try { fs.closeSync(fd); } finally { fs.unlinkSync(lockPath); }
    };
};
