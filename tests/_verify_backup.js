// 多地备份（容灾）P0 专项验证：复用测试台提取方式，模拟 fetch/localStorage/DOM
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag){const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},replaceChild(){},remove(){},setAttribute(){},getAttribute(){return null;},removeAttribute(){},focus(){},style:{},click(){}};Object.defineProperty(self,'innerHTML',{set(v){this._html=v;this.children=[];},get(){return this._html;}});return self;}
const elements={};
const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
const doc={getElementById:getEl,createElement:t=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],body:{classList:makeClassList()},addEventListener(){}};
const localStore={};
const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
let fetchLog=[];
const fetch=(url,opts)=>{const u=String(url);const method=(opts&&opts.method)||'GET';fetchLog.push({u,method,body:opts&&opts.body});return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});};
const ctx={console,setTimeout:(f)=>f?setTimeout(f,0):0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,fetch,alert:m=>{ctx.__alert=m;},confirm:()=>true,prompt:()=>'',URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,WebSocket:function(){return{readyState:1,send(){},close(){}};},Image:function(){},FileReader:function(){},navigator:{onLine:true},location:{protocol:'https:',href:'https://x/'},globalThis:null};
ctx.globalThis=ctx;ctx.window=ctx;ctx.btoa=globalThis.btoa;ctx.atob=globalThis.atob;
let loadErr=null;
try{ vm.createContext(ctx); vm.runInContext(script,ctx,{filename:'wujin-backup-test'}); }catch(e){ loadErr=e; }

let pass=0,fail=0;const fails=[];
function ok(c,m){if(c)pass++;else{fail++;fails.push(m);console.log('  FAIL '+m);}}
if(loadErr){ console.log('脚本加载抛错：'+loadErr.message); process.exit(1); }

function pushP(t){return new Promise(res=>{ try{ ctx.pushToTarget(t, r=>res(r)); }catch(e){ res('throw:'+e.message); } }); }

(async()=>{
console.log('=== 多地备份 P0 专项验证 ===');
// 1. 读写往返
ctx.saveBackups([{id:'bk1',type:'supabase',name:'B',enabled:true}]);
ok(ctx.getBackups().length===1 && ctx.getBackups()[0].id==='bk1','备份读写往返');

// 2. collectBackupData 含7类
const d=ctx.collectBackupData();
ok(['products','cash','flow','todos','parties','ar','delLog','stockLog'].every(k=>k in d),'collectBackupData 含全部7类数据');

// 3. supabase 推送
fetchLog=[];
const r1=await pushP({id:'bk1',type:'supabase',url:'https://x.supabase.co',key:'k',book:'bk-test',token:''});
ok(r1===true,'supabase 推送回调成功');
const put=fetchLog.find(f=>f.method==='PUT');
ok(!!put,'supabase 发起 PUT 请求');
ok(put && put.u.indexOf('book=eq.bk-test')>=0,'PUT URL 含 book=eq.bk-test');
ok(put && (put.body||'').indexOf('"products"')>=0 && (put.body||'').indexOf('"stockLog"')>=0,'PUT body 含全量数据(含台账)');

// 4. baidu 推送（模拟器放行）
fetchLog=[];
const r2=await pushP({id:'bk2',type:'baidu',token:'TOK',path:'/apps/wujin/backup.json'});
ok(!!fetchLog.find(f=>f.u.indexOf('pan.baidu.com')>=0),'baidu 发起上传请求');
ok(r2===true,'baidu 回调成功(模拟环境)');

// 5. webdav 推送（模拟器放行）
fetchLog=[];
const r3=await pushP({id:'bk3',type:'webdav',url:'https://dav.x.com/w.json',user:'u',pass:'p'});
const wf=fetchLog.find(f=>f.u.indexOf('dav.x.com')>=0);
ok(!!wf && wf.method==='PUT','webdav 发起 PUT 请求');
ok(r3===true,'webdav 回调成功(模拟环境)');

// 6. 未知类型回调失败不抛
const r4=await pushP({id:'bk4',type:'weird'});
ok(r4===false,'未知类型回调 false（不抛）');

// 7. 上限：4 处时加号禁用
ctx.saveBackups([
 {id:'1',type:'supabase',url:'u',key:'k',book:'b1',enabled:true},
 {id:'2',type:'supabase',url:'u',key:'k',book:'b2',enabled:true},
 {id:'3',type:'supabase',url:'u',key:'k',book:'b3',enabled:true},
 {id:'4',type:'supabase',url:'u',key:'k',book:'b4',enabled:true}
]);
ctx.renderBackupTargets();
ok(getEl('btnAddBackup').disabled===true,'达 4 处额外备份时加号禁用（上限=主+4=5）');

// 8. 空列表渲染不抛
ctx.saveBackups([]);
try{ ctx.renderBackupTargets(); ok(true,'空列表渲染不抛'); }catch(e){ ok(false,'空列表渲染抛错:'+e.message); }

// 9. runAllBackups：启用才备份，未启用跳过
ctx.saveBackups([
 {id:'a',type:'supabase',url:'https://x.supabase.co',key:'k',book:'b_a',enabled:true},
 {id:'b',type:'supabase',url:'https://x.supabase.co',key:'k',book:'b_b',enabled:true},
 {id:'c',type:'supabase',url:'https://x.supabase.co',key:'k',book:'b_c',enabled:false}
]);
fetchLog=[];
ctx.runAllBackups();
await new Promise(r=>setTimeout(r,80));
const after=ctx.getBackups();
ok(after.find(x=>x.id==='a').lastOk===true,'runAllBackups 启用 a 备份成功');
ok(after.find(x=>x.id==='b').lastOk===true,'runAllBackups 启用 b 备份成功');
ok(after.find(x=>x.id==='c').lastOk===undefined || after.find(x=>x.id==='c').lastOk===null,'runAllBackups 未启用 c 不备份');
ok(fetchLog.filter(f=>f.method==='PUT').length===2,'runAllBackups 仅对2个启用目标发起 PUT');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
if(fail){ console.log('失败项：\n'+fails.join('\n')); process.exit(1); }
})();
