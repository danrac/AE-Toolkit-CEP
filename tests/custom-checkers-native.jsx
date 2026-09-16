// Run manually in an empty separate After Effects instance; never in a working project.
(function(){var result, repo=new File($.fileName).parent.parent.fsName, base=Folder.temp.fsName+'/toolbox2-native-check-'+new Date().getTime(), out=new File(repo+'/dist/custom-checkers-native.txt'), original=null, hidden=null; new Folder(base).create();
try {
 if(app.project && (app.project.numItems || app.project.file)) throw new Error('Run only in an empty, isolated After Effects instance. Existing project untouched.');
 if(!app.project)app.newProject();
 $.evalFile(new File(repo+'/host/host.jsx'));
 original=new File(base+'/checker-source.psd');new File(repo+'/host/guide-assets/HD_chart.psd').copy(original.fsName);
 var opts=new ImportOptions(original);opts.importAs=ImportAsType.COMP;
 var psd=app.project.importFile(opts);
 var holder=app.project.items.addComp('Placeholder',640,360,1,2,24),nested=app.project.items.addComp('Nested',640,360,1,2,24);
 var slot=nested.layers.add(holder);slot.name='REPLACE THIS LAYER WITH GRAPHIC COMP';
 var label=nested.layers.addText('XXXX');label.name='XXXX';nested.layers.add(psd);
 var a=app.project.items.addComp('Checker A',640,400,1,2,24);a.layers.add(nested);
 var b=app.project.items.addComp('Checker B',360,640,1,2,24);b.layers.add(nested);
 for(var i=1;i<=app.project.numItems;i++)app.project.item(i).selected=false;a.selected=true;b.selected=true;
 app.project.save(new File(base+'/portable-fixture.aep'));
 new Folder(base+'/library').create();
 var response=aetoolkitCepCaptureCheckerTemplates(AEToolkitJSON.stringify({libraryRoot:base+'/library'}));if(response.indexOf('ERROR:')===0)throw new Error(response);
 if(app.project.file.fsName!==base+'/portable-fixture.aep')throw new Error('Original project path not restored');
 var captured=AEToolkitJSON.parse(response);if(captured.captured!==2)throw new Error('Batch capture failed');
 var oldFolder=new Folder(base+'/library/'+captured.packageId);var newName='checkers-moved-'+new Date().getTime();if(!oldFolder.rename(newName))throw new Error('Cannot move test package');
 if(!original.rename('checker-source-hidden.psd'))throw new Error('Cannot hide source media');hidden=new File(base+'/checker-source-hidden.psd');
 for(i=1;i<=app.project.numItems;i++)app.project.item(i).selected=false;
 var g1=app.project.items.addComp('Graphic 1',640,360,1,2,24),g2=app.project.items.addComp('Graphic 2',640,360,1,2,24);g1.selected=true;g2.selected=true;
 var before={};for(i=1;i<=app.project.numItems;i++)before[app.project.item(i).id]=true;
 response=aetoolkitCepCreateCustomCheckers(AEToolkitJSON.stringify({libraryRoot:base+'/library',packageId:newName,templateIndex:0,jobCode:'ABA'}));if(response.indexOf('ERROR:')===0)throw new Error(response);
 var found=0,layered=0;
 for(i=1;i<=app.project.numItems;i++){var item=app.project.item(i);if(before[item.id])continue;
 if(item instanceof FootageItem && item.file){if(item.file.fsName.indexOf(base+'/library/'+newName+'/media/')!==0)throw new Error('Nonportable footage path: '+item.file.fsName);if(item.name.indexOf('HDTV/')!==0)throw new Error('Layered source name changed: '+item.name);layered++;}
 if(item instanceof CompItem && item.name.indexOf('CHK_Graphic')===0){found++;aetoolkitCepCheckerWalk(item,function(l){if(l.name==='XXXX'&&l.property('ADBE Text Properties').property('ADBE Text Document').value.text!=='ABA')throw new Error('Job code not replaced');if(l.name==='REPLACE THIS LAYER WITH GRAPHIC COMP'&&l.source!==g1&&l.source!==g2)throw new Error('Wrong graphic');});}}
 if(found!==2||layered!==2)throw new Error('Wrong checker/layered source count '+found+'/'+layered);
 if(label.property('ADBE Text Properties').property('ADBE Text Document').value.text!=='XXXX')throw new Error('Template mutated');
 result='PASS: two templates exported natively; original .aep path restored; package relocated; original PSD hidden; two checkers imported with layered PSD identity preserved and package-relative media resolved; Job codes and graphics replaced.';
}catch(e){result='FAIL: '+e.toString();}
finally{if(hidden&&hidden.exists)hidden.rename('checker-source.psd');out.open('w');out.write(result);out.close();}
}());
