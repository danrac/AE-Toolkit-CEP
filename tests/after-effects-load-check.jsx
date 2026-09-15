(function () {
 var output = new File(Folder.temp.fsName + '/ae-toolkit-cep-host-check.txt');
 var result;
 try {
  $.evalFile(new File(new File($.fileName).parent.parent.fsName + '/host/host.jsx'));
  if (aetoolkitCepSafeName('a/b:c') !== 'abc') throw new Error('Name sanitizer failed');
  result = 'PASS: entire host parsed and name sanitizer executed in After Effects ' + app.version;
 } catch (e) { result = 'FAIL line ' + e.line + ': ' + e.toString(); }
 output.open('w'); output.write(result); output.close();
})();
