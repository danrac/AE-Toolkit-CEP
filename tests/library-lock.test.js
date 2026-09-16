const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const modulePath=path.resolve('client/js/library-lock.js'), lock=require(modulePath);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'toolbox-lock-')), target=path.join(dir,'state.json');
try {
 const release=lock.acquire(target);
 const attempt=cp.spawnSync(process.execPath,['-e',`try { require(${JSON.stringify(modulePath)}).acquire(${JSON.stringify(target)}); process.exit(2); } catch(e) { if (!/locked/.test(e.message)) throw e; }`],{encoding:'utf8'});
 assert.equal(attempt.status,0,attempt.stderr);
 release(); assert(!fs.existsSync(target+'.lock'));
 try { const unlock=lock.acquire(target); try { throw new Error('simulated write failure'); } finally {unlock();} } catch(e) {assert.equal(e.message,'simulated write failure');}
 assert(!fs.existsSync(target+'.lock'));
 const retry=lock.acquire(target);retry();retry();
 fs.writeFileSync(target+'.lock','crashed writer');assert.throws(()=>lock.acquire(target),/locked/);
 assert.equal(fs.readFileSync(target+'.lock','utf8'),'crashed writer');
 console.log('PASS independent-process exclusion, failure cleanup, retry, and fail-closed abandoned locks');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
