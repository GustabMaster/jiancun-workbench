// 专项：智能录入 UI 层 / 商品图片上传 / 文件导入的错误反馈链路。
// 选题：零覆盖区（源函数 463 − 测试语料，余 64），本轮攻 smart* UI 族 + 图片链 + handleImportedFile。
//
// D1（P2 · 容量与数据安全）智能添加的撤销快照永不过期：smartApplyItems 每次把 products/cash/flow/
//    parties/ar/stockLog/delLog 整份克隆写进 localStorage（带 ts），30 秒倒计时结束后 hideSmartUndo
//    只把横幅藏起来、**并不回收这份副本**，于是「没人点撤销」才是常态下这份全量副本会永久占着配额。
//    库越大副本越大，逼近浏览器上限后连普通记一笔都存不进去。证据：ts 只写不读（全文仅 4859 行产生）。
// D2（P2 · 转义家族第七形态）错误对象的 message 裸拼 innerHTML，三站：onPickProductPic 失败分支、
//    handleImportedFile 的 Excel/文本两个 catch。同函数的成功分支明明写了 esc(url)，失败分支漏掉。
//    （toast 走 textContent 不中招，但 innerHTML 这三站实打实。）
// D3（P3 · 健壮性）onPickProductPic 缺元素守卫：同族 clearPendingPic / renderEditPic 都写
//    if(box){}，唯独它直接 box.className=…，界面上少了那个图片框就整段崩。
// D4（P3 · 文案）撤销倒计时语义反了：初始说「30 秒内可撤销」是对的，倒计时却改成「N 秒后可撤销」，
//    听着像要等 N 秒才能点。应为「还剩 N 秒」。
const fs=require('fs');const vm=require('vm');
const SRC=process.argv[2]||'wujin-workbench.html';
const html=fs.readFileSync(SRC,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
// querySelector 按选择器缓存：倒计时会反复取同一个 span 改写文案，取不到稳定对象就读不到文案
function elStub(tag){
  const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,disabled:false,
    files:null,_q:{},
    set innerHTML(v){this._html=v;}, get innerHTML(){return this._html;},
    classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},remove(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub();},
    querySelector(sel){ if(!self._q[sel])self._q[sel]=elStub(); return self._q[sel]; },
    querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}

// nullIds：模拟这些 id 在页面上不存在，用来验证函数有没有写元素守卫
function makeDevice(name,opts){
  opts=opts||{};
  const elements={};
  const nullIds=opts.nullIds||[];
  const getEl=id=>{
    if(id in elements)return elements[id];
    if(nullIds.indexOf(id)>=0)return null;
    elements[id]=elStub('div');
    return elements[id];
  };
  const doc={getElementById:getEl,createElement:t=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],
    addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v);},removeItem:k=>{delete localStore[k];}};
  const D={__toasts:[],__timers:[],__intervals:[],__local:localStore};
  D.document=doc;D.localStorage=localStorage;
  const ctx={console,
    setTimeout:(f,ms)=>{D.__timers.push({f:f,ms:ms});return D.__timers.length;},clearTimeout:()=>{},
    setInterval:(f,ms)=>{D.__intervals.push({f:f,ms:ms});return D.__intervals.length;},clearInterval:()=>{},
    document:doc,localStorage,alert:()=>{},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,TextDecoder,Blob,Uint8Array,ArrayBuffer,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){},btoa:s=>Buffer.from(String(s),'binary').toString('base64'),
    FileReader:function(){this.readAsText=()=>{this.result='';if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result='';if(this.onload)this.onload();};},
    fetch:()=>Promise.resolve({ok:true,status:200,text:()=>Promise.resolve('')}),
    confirm:()=>true,
    location:{protocol:'https:',href:'https://demo.example/index.html',reload:function(){D.__reloads=(D.__reloads||0)+1;}},
    caches:{keys:()=>Promise.resolve([]),delete:()=>Promise.resolve(true)},
    navigator:{serviceWorker:{register:()=>Promise.resolve({update:()=>Promise.resolve()}),getRegistration:()=>Promise.resolve(null)}}};
  ctx.globalThis=ctx;ctx.window=ctx;
  D.location=ctx.location;
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  smartApplyItems, smartApplyOne, showSmartUndo, hideSmartUndo, smartUndo,
  onPickProductPic, clearPendingPic, renderEditPic,
  handleImportedFile, ocrStatusEl, smartParse, showSmartConfirm, smartItemHtml, smartFld, smartSel,
  renderConvEditor, addConvRow, delConvRow, readConvEditor,
  save, load, renderAll, todayStr, esc,
  PREFIX,
  get products(){return products;}, set products(v){products=v;},
  get flow(){return flow;}, set flow(v){flow=v;},
  get cash(){return cash;}, set cash(v){cash=v;},
  get parties(){return parties;}, set parties(v){parties=v;},
  get ar(){return ar;}, set ar(v){ar=v;},
  get stockLog(){return stockLog;}, set stockLog(v){stockLog=v;},
  get pendingPic(){return pendingPic;}, set pendingPic(v){pendingPic=v;},
  get cloud(){return cloud;}, set cloud(v){cloud=v;},
  get editingProductId(){return editingProductId;}, set editingProductId(v){editingProductId=v;}
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(m,k){D.__toasts.push({m:String(m),k:k});};
  ctx.renderAll=function(){};
  return {ctx:ctx,__api:ctx.__api,D:D,document:doc};
}

const M=makeDevice('smartui');
const api=M.__api;const D=M.D;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const tick=(n)=>new Promise(r=>setTimeout(r,n||20));
const UNDO_KEY='wb_wujin_smart_undo';
const hasSnap=()=>Object.prototype.hasOwnProperty.call(D.__local,UNDO_KEY);
const el=id=>D.document.getElementById(id);

// —— 注入探针：尖括号一旦原样落进 HTML，说明那段没走转义 ——
const XSS='<img src=x onerror=alert(1)>';
// cloudActive() 要求 enabled+url+key+book 四项齐全，少一项函数会提前 return（用 cloudonly 路径，测试才走得下去）
const CLOUD={enabled:true,url:'https://x.supabase.co',key:'k',bucket:'pics',book:'bk'};
const raw=(h)=>h.indexOf('<img')>=0;            // 裸标签仍在
const escaped=(h)=>h.indexOf('&lt;img')>=0;     // 已被转义

// 从 ctx 里换掉某个顶层函数，用来制造可控的失败
function stubCtx(name,impl){ M.ctx[name]=impl; }
// 让 ctx 里被 stub 的函数恢复原样（重新建一台设备）
function freshDevice(opts){ const m=makeDevice('smartui-'+Math.random(),opts); return m; }

function seed(store){
  api.products=[{id:'p1',name:'冲击钻',cat:'电动',spec:'12V',unit:'个',conv:{'盒':4},stock:100,safe:0,cost:50,wholesale:0,retail:80,price:80,note:'',pic:''}];
  api.flow=[];api.cash=[];api.parties=[];api.ar=[];api.stockLog=[];
}

(async function main(){
console.log('智能录入 UI 层 / 图片上传 / 文件导入 · 专项\n');

// ============================ A 组：撤销快照的生命周期（D1 核心） ============================
console.log('A 智能添加撤销快照生命周期');
seed();
{
  // A1 正常路径：添加成功应写入可撤销快照（既有行为，先锁住）
  const n=api.smartApplyItems([{kind:'product',name:'新A商品',stock:3,cost:1,retail:2}],'product');
  ok(n===1,'A1a 添加一条商品返回 1');
  ok(hasSnap(),'A1b 写入撤销快照到本机保存位置（既有行为，锁定不许改坏）');
  const raw=D.__local[UNDO_KEY];
  ok(!!raw && JSON.parse(raw).snap,'A1c 快照含完整数据表副本');
  ok(!!raw && typeof JSON.parse(raw).ts==='number','A1d 快照带时间戳 ts（用于判定是否过期）');
}
{
  // A2 核心缺陷：30 秒倒计时走完（用户没点撤销，这才是常态），快照必须被回收
  seed();
  api.smartApplyItems([{kind:'product',name:'新B商品',stock:3,cost:1,retail:2}],'product');
  ok(hasSnap(),'A2a 前提：此刻确实有快照');
  api.hideSmartUndo();                       // 倒计时归零就是这个入口
  ok(!hasSnap(),'A2b 撤销窗口结束后回收快照，不长期占用本机保存额度');
}
{
  // A3 核心缺陷：过期很久的快照不能被拿来回滚
  seed();
  api.smartApplyItems([{kind:'product',name:'新C商品',stock:3,cost:1,retail:2}],'product');
  const before=api.products.length;
  // 把时间戳往前挪一天，制造「早就过了 30 秒」的现场
  const s=JSON.parse(D.__local[UNDO_KEY]); s.ts=Date.now()-24*3600*1000;
  D.__local[UNDO_KEY]=JSON.stringify(s);
  let threw=false; try{ api.smartUndo(); }catch(e){ threw=true; }
  ok(!threw,'A3a 过期快照调撤销不抛错');
  ok(api.products.length===before,'A3b 过期快照不回滚数据（今天早上加的不能被下午撤销掉）');
}
{
  // A4 反向锁定：窗口内的撤销必须仍然好使
  const m=freshDevice(); const a=m.__api; constdd=m.D;
  a.products=[];a.flow=[];a.cash=[];a.parties=[];a.ar=[];a.stockLog=[];
  a.smartApplyItems([{kind:'product',name:'待撤销商品',stock:3,cost:1,retail:2}],'product');
  ok(a.products.length===1,'A4a 前提：添加成功 1 条');
  a.smartUndo();
  ok(a.products.length===0,'A4b 窗口内撤销真的回滚（正向功能不许修坏）');
  ok(!Object.prototype.hasOwnProperty.call(m.D.__local,UNDO_KEY),'A4c 撤销后快照清除');
}
{
  // A5 连续两次添加不会把旧窗口的快照留成孤儿
  seed();
  api.smartApplyItems([{kind:'product',name:'第一批',stock:1,cost:1,retail:2}],'product');
  api.hideSmartUndo();
  api.smartApplyItems([{kind:'product',name:'第二批',stock:1,cost:1,retail:2}],'product');
  ok(hasSnap(),'A5a 第二次添加重新建立新快照');
  const cnt=Object.keys(D.__local).filter(k=>k===UNDO_KEY).length;
  ok(cnt===1,'A5b 同名快照始终只有一份，不堆积');
}

// ============================ B 组：倒计时文案（D4） ============================
console.log('B 撤销倒计时文案');
{
  const m=freshDevice(); const dd=m.D;
  dd.__local[UNDO_KEY]=JSON.stringify({ts:Date.now(),snap:{products:[],flow:[],cash:[],parties:[],ar:[],stockLog:[],delLog:[]}});
  // 直接跑一遍倒计时的一次 tick：抽帧出「倒计时过程中」的文案
  const realSetInterval=m.ctx.setInterval;
  let tickFn=null;
  m.ctx.setInterval=(f,ms)=>{ tickFn=f; return realSetInterval(()=>{},ms); };  // 接住回调，手动走一拍
  m.__api.showSmartUndo(2);
  if(tickFn){ try{ tickFn(); }catch(e){} }
  const banner=m.document.getElementById('smartUndoBanner');
  const spanTxt=(banner.querySelector('span')||{}).textContent||'';
  ok(/还剩\s*29\s*秒|仅剩\s*29\s*秒|剩\s*29\s*秒/.test(spanTxt),
     'B1 倒计时文案表意正确（应为「还剩 29 秒」，原「29 秒后可撤销」语义反了）');
  ok(!/29\s*秒后可撤销/.test(spanTxt),'B2 不再出现「N 秒后可撤销」这种反义说法');
  ok(spanTxt.indexOf('2')>=0,'B3 文案仍带条数（倒计时期间不丢上下文）');
}

// ============================ C 组：错误 message 裸拼 innerHTML（D2） ============================
console.log('C 失败反馈的转义（图片上传 / 文件导入共三站）');
{
  // C1 商品图片上传失败：在这台设备上把压缩环节换成明确 reject 的错误
  const m=freshDevice(); const a=m.__api; const dd=m.D;
  a.cloud=CLOUD;
  m.ctx.compressImage=function(){ return Promise.reject(new Error('上传被拒 '+XSS)); };
  const fakeInput={files:[{name:'a.png',type:'image/png'}], value:''};
  let caught=null; try{ a.onPickProductPic(fakeInput); }catch(e){ caught=e; }
  await tick(40);
  ok(caught===null,'C1a 同步段不抛错');
  const boxHtml=m.document.getElementById('p_pic_box').innerHTML;
  ok(!raw(boxHtml),'C1b 图片上传失败的提示里不含裸 HTML 标签');
  ok(escaped(boxHtml),'C1c 失败原因已转义后展示（成功分支原本就 esc，失败分支漏了）');
}
{
  // C2 Excel 导入失败
  const m=freshDevice(); const a=m.__api; const dd=m.D;
  const fakeFile={name:'bad.xlsx',type:'application/vnd.ms-excel',
    arrayBuffer(){ return Promise.reject(new Error('表格打不开 '+XSS)); },
    text(){ return Promise.reject(new Error('读不了 ')); }};
  let caught=null; try{ a.handleImportedFile(fakeFile,'all'); }catch(e){ caught=e; }
  await tick(60);
  ok(caught===null,'C2a 同步段不抛错');
  const boxHtml=m.document.getElementById('smart_all_ocr_status').innerHTML;
  ok(!raw(boxHtml),'C2b Excel 解析失败的提示里不含裸 HTML 标签');
  ok(escaped(boxHtml),'C2c Excel 失败原因已转义后展示');
}
{
  // C3 文本/CSV 导入失败
  const m=freshDevice(); const a=m.__api; const dd=m.D;
  const fakeFile={name:'bad.txt',type:'text/plain',
    arrayBuffer(){ return Promise.reject(new Error('x')); },
    text(){ return Promise.reject(new Error('读取失败 '+XSS)); }};
  let caught=null; try{ a.handleImportedFile(fakeFile,'all'); }catch(e){ caught=e; }
  await tick(60);
  ok(caught===null,'C3a 同步段不抛错');
  const boxHtml=m.document.getElementById('smart_all_ocr_status').innerHTML;
  ok(!raw(boxHtml),'C3b 文本解析失败的提示里不含裸 HTML 标签');
  ok(escaped(boxHtml),'C3c 文本失败原因已转义后展示');
}
{
  // C4 转义化合物是不变量：成功路径本就有 esc，别把整段改成纯文本弄坏图片预览
  const m=freshDevice(); const a=m.__api;
  m.ctx.compressImage=function(){ return Promise.resolve({type:'image/jpeg'}); };
  m.ctx.uploadPic=function(){ return Promise.resolve('https://x/p/a.jpg'); };
  a.cloud=CLOUD;
  const fakeInput={files:[{name:'a.png',type:'image/png'}], value:''};
  a.onPickProductPic(fakeInput);
  await tick(60);
  const boxHtml=m.document.getElementById('p_pic_box').innerHTML;
  ok(boxHtml.indexOf('<img src="https://x/p/a.jpg"')>=0,'C4 成功分支仍输出真实 img 标签（不能被「一律转义」改坏）');
}

// ============================ D 组：元素缺失守卫（D3） ============================
console.log('D 界面元素缺失时不崩');
{
  const m=freshDevice({nullIds:['p_pic_box']}); const a=m.__api;
  a.cloud=CLOUD;   // 必须让云端可用，否则函数在碰到图片框之前就 return，测不到缺守卫那一行
  let threw=null;
  try{
    a.onPickProductPic({files:[{name:'a.png',type:'image/png'}],value:''});
  }catch(e){ threw=e; }
  ok(threw===null,'D1 页面没有图片框时不抛错（同族 clearPendingPic 有守卫，此处漏了）');
}
{
  const m=freshDevice({nullIds:['p_pic_box','p_pic']}); const a=m.__api;
  let threw=null; try{ a.clearPendingPic(); }catch(e){ threw=e; }
  ok(threw===null,'D2 clearPendingPic 缺元素不抛错（既有行为，锁定）');
}
{
  const m=freshDevice(); const a=m.__api;
  a.pendingPic='https://y/p/b.jpg';
  let threw=null; try{ a.clearPendingPic(); }catch(e){ threw=e; }
  ok(threw===null,'D3a clearPendingPic 正常路径不抛错');
  ok(a.pendingPic==='','D3b clearPendingPic 清空待上传图片（既有行为，锁定）');
}

// ============================ E 组：扩展到既有哨兵（防止改坏） ============================
console.log('E 相邻功能不被改坏');
{
  seed();
  const h=api.smartItemHtml({name:'马<script>alert(1)</script>',cat:'b<script>',spec:'12V"bad',stock:1,convText:'盒=4'},'product',0);
  ok(h.indexOf('<script>')<0,'E1a 确认框渲染商品名不含可执行标签');
  ok(h.indexOf('&lt;script&gt;')>=0,'E1b 确认框渲染已转义');
  const f=api.smartItemHtml({name:'马" onclick="alert(1)',qty:1,price:2},'flow',1);
  ok(f.indexOf('onclick="alert(1)"')<0,'E2 确认框渲染买卖记录的属性未被注入');
}
{
  seed();
  let threw=null;
  try{ api.showSmartConfirm([{name:'测试',stock:1,cost:1,retail:2}],'product'); }catch(e){ threw=e; }
  ok(threw===null,'E3 智能确认框渲染不抛错（既有链路锁定）');
}
{
  seed();
  let threw=null;
  try{ api.renderConvEditor('convList',{'盒':4,'件':40}); }catch(e){ threw=e; }
  ok(threw===null,'E4 包装换算编辑器渲染不抛错（既有链路锁定）');
  let threw2=null;
  try{ api.readConvEditor('convList'); }catch(e){ threw2=e; }
  ok(threw2===null,'E5 读取包装换算编辑器不抛错（既有链路锁定）');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
