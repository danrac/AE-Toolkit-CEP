(function () {
 var output = new File(new File($.fileName).parent.parent.fsName + '/dist/ae-toolkit-cep-host-check.txt');
 var result;
 try {
  $.evalFile(new File(new File($.fileName).parent.parent.fsName + '/host/host.jsx'));
  if (aetoolkitCepSafeName('a/b:c') !== 'abc') throw new Error('Name sanitizer failed');
  if (!aetoolkitCepIsAbsolutePath('/Users/example/file.png') || !aetoolkitCepIsAbsolutePath('C:/Jobs/file.png') || aetoolkitCepIsAbsolutePath('file.png')) throw new Error('Absolute-path detection failed');
  var naming = AEToolkitJSON.parse('{"job":"ABA","format":"HD","style":"A","description":"NewCard","initials":"DR","namingOrder":["job","style","description","format","version","initials"]}');
  if (aetoolkitCepBuildCompName(naming, 1) !== 'ABA_A_NewCard_HD_v01_DR') throw new Error('Template naming order failed');
  var typed = AEToolkitJSON.parse('{"namingFields":[{"id":"custom","type":"text","value":"Acme"},{"id":"revision","type":"version","value":"1","prefix":"v","digits":2}],"namingValues":{"revision":"3"}}');
  if (aetoolkitCepBuildCompName(typed, 1) !== 'Acme_v03') throw new Error('Typed naming failed');
  var sample = { mac: '/Volumes/Jobs/A B/é.mov', windows: 'C:\\Jobs\\A B\\clip.mov', values: [true, false, null, 12.5], quote: '"line\nnext' };
  var decoded = AEToolkitJSON.parse(AEToolkitJSON.stringify(sample));
  if (decoded.mac !== sample.mac || decoded.windows !== sample.windows || decoded.quote !== sample.quote || decoded.values[2] !== null) throw new Error('JSON round-trip failed');
  if (!AEToolkitJSON.parse(aetoolkitCepDefaultState()).templates.length) throw new Error('Default state JSON failed');
  var imported = AEToolkitJSON.parse(aetoolkitCepImportAssetPaths(''));
  if (!imported.errors.length) throw new Error('Host response JSON failed');
  result = 'PASS: host loaded, JSON path round-trip, default state and host response executed in After Effects ' + app.version;
 } catch (e) { result = 'FAIL line ' + e.line + ': ' + e.toString(); }
 output.open('w'); output.write(result); output.close();
})();
