// 专项：多地备份的推送执行族（pushToTarget/runOneBackup/runAllBackups/autoCloudBackup/bkStatusText/delBackup）
// 背景：v1.15.24 修过备份族的 UI 层（saveBackupTarget/delBackup 编辑态/runAllBackups 刷新），
// 但「推送执行层」从未被无头测试覆盖。本轮拿下三处：
//   D1（P2）autoCloudBackup 的 6 小时冷却原先只用内存变量 _bkLastRun——开机即重置为 0，
//     「距上次备份不足 6 小时就跳过」跨会话完全失效：每次打开页面都全量推送一遍
//     所有已启用备份位置（一天开关 N 次就推 N 次），API 配额/流量/失败提示全浪费。
//     修：在原有会话内节流（_bkLastRun）之外，增加落盘基准 lastBackup 的最大值做跨会话冷却（双重冷却）。
//   D2（P3）bkStatusText 在 lastOk===true 但 lastBackup 非有限值（老数据/坏导入）时
//     显示 "Invalid Date"。修：有限性守卫。
//   D3（P3）delBackup 的 _bkEditing=null 放在 confirm 之前——用户点「取消」不删了，
//     编辑态也被清掉，再点保存落到不存在的地方。修：挪到确认通过之后。
const fs=require('fs');const vm=require('vm');
const SRC=process.argv[2]||'wujin-workbench.html';
const html=fs.readFileSync(SRC,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag){
  const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,indeterminate:false,
    set innerHTML(v){this._html=v;this.children=[];},
    get innerHTML(){return this.children.length?this.children.map(c=>c._html||'').join(''):this._html;},
    classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},replaceChild(){},remove(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub();},
    querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}
function makeDevice(name){
  const elements={};
  const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const timers=[];
  const ctx={console,setTimeout:(f,ms)=>{return f?setTimeout(f,ms||0):0;},clearTimeout:()=>{},
    setInterval:(f,ms)=>{timers.push({f,ms});return timers.length;},clearInterval:()=>{},
    document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};},
    __frResult:'data:image/png;base64,AAAA',__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.__fetchLog=[];ctx.__fetchOk=true;
  ctx.fetch=(url,opts)=>{ctx.__fetchLog.push({url:url,method:opts&&opts.method});return Promise.resolve({ok:ctx.__fetchOk,status:ctx.__fetchOk?200:500,json:()=>Promise.resolve(ctx.__fetchOk?{}:{error_code:31066})});};
  ctx.__confirmRet=true;
  ctx.confirm=()=>ctx.__confirmRet;
  ctx.btoa=s=>Buffer.from(String(s),'binary').toString('base64');
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cash(){return cash}, set cash(v){cash=v},
  get flow(){return flow}, set flow(v){flow=v},
  get parties(){return parties}, set parties(v){parties=v},
  get ar(){return ar}, set ar(v){ar=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  get delLog(){return delLog}, set delLog(v){delLog=v},
  get todos(){return todos}, set todos(v){todos=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  get _bkEditing(){return _bkEditing}, set _bkEditing(v){_bkEditing=v},
  get _bkTimer(){return _bkTimer}, set _bkTimer(v){_bkTimer=v},
  get _bkLastRun(){return _bkLastRun}, set _bkLastRun(v){_bkLastRun=v},
  getBackups, saveBackups, collectBackupData,
  pushToTarget, pushSupabase, pushBaidu, pushWebDAV,
  runOneBackup, runAllBackups, autoCloudBackup,
  bkStatusText, bkTypeLabel, delBackup, renderBackupTargets,
  save, load, renderAll
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(){};ctx.showTrashBanner=function(){};ctx.renderAll=function(){};
  ctx.__timers=timers;
  return ctx;
}

const D=makeDevice('backuppush');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const tick=()=>new Promise(r=>setTimeout(r,20));   // 等 fetch mock 的 promise 链跑完

// 种子：两处已启用的数据库型备份位置 + 一处禁用
function seed(lastBackupA,lastBackupB){
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:10,cost:8,price:10,cat:'A',spec:'',safe:0,_t:1}];
  api.flow=[];api.cash=[];api.ar=[];api.todos=[];api.parties=[];api.delLog=[];api.stockLog=[];api.cfg={};
  api.saveBackups([
    {id:'bkA',type:'supabase',name:'备用甲',enabled:true,url:'https://a.supabase.co',key:'ka',book:'bka',lastBackup:lastBackupA,lastOk:true},
    {id:'bkB',type:'supabase',name:'备用乙',enabled:true,url:'https://b.supabase.co',key:'kb',book:'bkb',lastBackup:lastBackupB,lastOk:true},
    {id:'bkC',type:'supabase',name:'停用丙',enabled:false,url:'https://c.supabase.co',key:'kc',book:'bkc',lastBackup:0,lastOk:null}
  ]);
}
const NOW=Date.now();
const H6=6*3600*1000;

(async function main(){
console.log('多地备份 · 推送执行族专项\n');

// ===== D1：autoCloudBackup 的 6 小时冷却必须跨会话有效 =====
console.log('D1 autoCloudBackup 冷却基准（落盘 lastBackup）');
// A1：最晚备份在 1 小时前（落盘）→ 不得推送（未修代码：_bkLastRun=0 → 必推 2 次）
{
  seed(NOW-1*3600*1000, NOW-2*3600*1000);
  api._bkLastRun=0;   // 每个区块模拟一次新开页：内存节流变量归零，只剩落盘基准兜底
  D.__fetchLog=[]; D.__timers.length=0;
  api.autoCloudBackup(); await tick();
  ok(D.__fetchLog.length===0,'A1 距最晚备份仅 1 小时：开机不推送（实际推送 '+D.__fetchLog.length+' 次）');
  ok(D.__timers.length===1 && D.__timers[0].ms===H6,'A2 冷却期内仍建立 6 小时定时器（不建则本会话后续再也不自动备份）');
}
// A3：最晚备份在 7 小时前 → 推送 2 处（停用的不推）
{
  seed(NOW-7*3600*1000, NOW-8*3600*1000);
  api._bkLastRun=0;
  D.__fetchLog=[]; D.__timers.length=0;
  api.autoCloudBackup(); await tick();
  ok(D.__fetchLog.length===2,'A3 距最晚备份 7 小时：推送 2 处已启用目标（实际 '+D.__fetchLog.length+' 次）');
}
// A4：从未备份过（lastBackup=0）→ 推送
{
  seed(0,0);
  api._bkLastRun=0;
  D.__fetchLog=[];
  api.autoCloudBackup(); await tick();
  ok(D.__fetchLog.length===2,'A4 从未备份：开机推送 2 处');
}
// A5：未配备份位置 → 不推不定时
{
  api.saveBackups([]);
  D.__fetchLog=[]; D.__timers.length=0;
  api.autoCloudBackup(); await tick();
  ok(D.__fetchLog.length===0 && D.__timers.length===0,'A5 无备份位置：不推不定时');
}

// ===== D2：bkStatusText 边界 =====
console.log('D2 bkStatusText 坏数据边界');
// B1：lastOk=true 但 lastBackup 非有限值 → 不得出现 Invalid Date
{
  const t1={lastOk:true,lastBackup:NaN};
  const t2={lastOk:true,lastBackup:undefined};
  const t3={lastOk:true,lastBackup:'abc'};
  ok(!/Invalid Date/.test(api.bkStatusText(t1)),'B1 lastBackup=NaN：不显示 Invalid Date');
  ok(!/Invalid Date/.test(api.bkStatusText(t2)),'B2 lastBackup=undefined：不显示 Invalid Date');
  ok(!/Invalid Date/.test(api.bkStatusText(t3)),'B3 lastBackup=字符串：不显示 Invalid Date');
}
// B4 回归：正常时间戳照旧显示
{
  const s=api.bkStatusText({lastOk:true,lastBackup:NOW});
  ok(/上次成功/.test(s) && !/Invalid Date/.test(s),'B4 正常时间戳：照显「上次成功」');
  ok(/尚未备份/.test(api.bkStatusText({lastOk:null,lastBackup:0})),'B5 从未备份：照显「尚未备份」');
  ok(/上次失败/.test(api.bkStatusText({lastOk:false,lastBackup:NOW,lastMsg:'HTTP 500'})),'B6 失败态：照显失败原因');
}

// ===== D3：delBackup 取消删除不清编辑态 =====
console.log('D3 delBackup 取消删除的编辑态');
// C1：confirm 取消 → 编辑态保留（未修代码：confirm 前就清了）
{
  seed(NOW-H6*2,NOW-H6*2);
  api._bkEditing='bkA'; D.__confirmRet=false;
  api.delBackup('bkA');
  ok(api._bkEditing==='bkA','C1 取消删除：编辑态保留（仍指向 bkA）');
  ok(api.getBackups().length===3,'C2 取消删除：位置未被删');
}
// C2：confirm 通过 → 删除 + 清编辑态
{
  seed(NOW-H6*2,NOW-H6*2);
  api._bkEditing='bkA'; D.__confirmRet=true;
  api.delBackup('bkA');
  ok(api._bkEditing===null && api.getBackups().length===2,'C3 确认删除：位置删除且编辑态清空');
}

// ===== E 组：runOneBackup 落盘与边界 =====
console.log('E 组 runOneBackup 边界');
// E1：成功 → lastOk=true、lastBackup 更新、lastMsg 空
{
  seed(0,0); D.__fetchOk=true; D.__fetchLog=[];
  api.runOneBackup('bkA'); await tick();
  const t=api.getBackups().find(x=>x.id==='bkA');
  ok(t.lastOk===true && t.lastBackup>0 && !t.lastMsg,'E1 推送成功：状态落盘（lastOk/lastBackup/lastMsg）');
}
// E2：失败（HTTP 500）→ lastOk=false、lastMsg 有内容
{
  seed(0,0); D.__fetchOk=false; D.__fetchLog=[];
  api.runOneBackup('bkA'); await tick();
  const t=api.getBackups().find(x=>x.id==='bkA');
  ok(t.lastOk===false && !!t.lastMsg,'E2 推送失败：失败原因落盘（'+t.lastMsg+'）');
  D.__fetchOk=true;
}
// E3：停用目标 + confirm 取消 → 不推
{
  seed(0,0); D.__fetchLog=[]; D.__confirmRet=false;
  api.runOneBackup('bkC');
  ok(D.__fetchLog.length===0,'E3 停用目标且取消：不推送');
  D.__confirmRet=true;
}
// E4：未知类型 → cb(false) 不抛错
{
  seed(0,0);
  api.saveBackups([{id:'bkX',type:'weird',name:'怪',enabled:true,lastBackup:0}]);
  let got=null; api.pushToTarget({id:'bkX',type:'weird'},r=>{got=r;});
  ok(got===false,'E4 未知备份类型：回调 false 不抛错');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
