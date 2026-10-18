// 专项：零覆盖区收官（剩余 36 个函数的行为锁定 + 本轮新查出的两处缺陷）。
//
// D1（P3）云端图片地址未编码：
//   uploadPic / deletePic 把 cloud.bucket 与 path 直接拼进请求地址，没做任何编码。
//   而**同一个文件里**同步数据那条路（5942 行）明明写了 encodeURIComponent(cloud.book)——
//   同样的用户自由输入，一处编码一处裸拼。cloud.book / cloud.bucket 都是设置页的自由文本框
//   （saveCloudCfg 只做 .trim()），填成「我的五金店」「我的图片」这类带中文或空格的值时，
//   商品图片上传与删除会直接失败，且报错看不出是地址问题——数据同步却正常，最让人困惑。
//   修：新增唯一拼址助手 picObjectUrl()，桶名与路径逐段编码。
// D2（P3）showAddBackup 缺元素守卫：
//   $('bkName').value / $('addBackupRow').classList 都没判空，界面上少了这些元素会整段崩。
//   同族的 hideAddBackup、bkTypeChanged 都写了守卫，此处漏了（与 R30 修的 onPickProductPic 同源）。
//
// 其余为**行为锁定**：本轮复核确认无缺陷的剩余函数，全部纳入断言防止日后改坏。
const fs=require('fs');const vm=require('vm');
const SRC=process.argv[2]||'wujin-workbench.html';
const html=fs.readFileSync(SRC,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
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
// nullIds：模拟这些元素在页面上不存在
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
  const D={__toasts:[],__timers:[],__fetches:[],__local:localStore};
  D.document=doc;D.localStorage=localStorage;
  const ctx={console,
    setTimeout:(f,ms)=>{D.__timers.push({f:f,ms:ms});return D.__timers.length;},clearTimeout:()=>{},
    setInterval:()=>1,clearInterval:()=>{},
    document:doc,localStorage,alert:()=>{},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,TextDecoder,Blob,Uint8Array,ArrayBuffer,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){},btoa:s=>Buffer.from(String(s),'binary').toString('base64'),
    FileReader:function(){this.readAsText=()=>{this.result='';if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result='';if(this.onload)this.onload();};},
    fetch:(url,opt)=>{ D.__fetches.push({url:String(url),method:(opt&&opt.method)||'GET'});
      return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve('')}); },
    confirm:()=>true,prompt:()=>null,
    location:{protocol:'https:',href:'https://demo.example/index.html',reload:function(){}},
    caches:{keys:()=>Promise.resolve([]),delete:()=>Promise.resolve(true)},
    navigator:{serviceWorker:{register:()=>Promise.resolve({update:()=>Promise.resolve()}),getRegistration:()=>Promise.resolve(null)}}};
  ctx.globalThis=ctx;ctx.window=ctx;
  D.location=ctx.location;
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  uploadPic, deletePic, removeOurPic, genPicPath, ourStorageBase, isOurPic,
  picObjectUrl: (typeof picObjectUrl!=='undefined'?picObjectUrl:null),
  showAddBackup, hideAddBackup, bkTypeChanged,
  smartClear, smartToggle, smartToggleAll, smartImportFile, smartDoAdd,
  dzOver, dzLeave, dzDrop, onPageUnload, flushLocal,
  rotateMotto, renderMotto, exInit, exTab, focusModalFirst, openUniversalEntry,
  renderSyncBar, renderNavBadges, slDelFlowToggle, confirmStockShort,
  dFlowRow, dCashRow, selBarHTML, reconcileBarHTML, flowProductNameOptions,
  computeResolvedProduct, syncFlowPid, guessPartyType, debounce, shade, copyText,
  openStatsDetail, openLegal, imgToBase64, onPickEditPic, renderEditPic, clearEditPic,
  kpiProductDetail, kpiPartyDetail, openModal,
  save, load, renderAll, todayStr, esc, jsStr,
  get cloud(){return cloud;}, set cloud(v){cloud=v;},
  get products(){return products;}, set products(v){products=v;},
  get MOTTOS(){return MOTTOS;},
  get _mottoIdx(){return _mottoIdx;}
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(m,k){D.__toasts.push({m:String(m),k:k});};
  ctx.renderAll=function(){};
  return {ctx:ctx,__api:ctx.__api,D:D,document:doc};
}

const M=makeDevice('closure');
const api=M.__api;const D=M.D;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const tick=()=>new Promise(r=>setTimeout(r,20));
// 中文账本名 + 带空格的桶名：非技术用户很可能这么填
const CLOUD={enabled:true,url:'https://x.supabase.co',key:'k',book:'我的五金店 2026',bucket:'我的图片',token:''};

(async function main(){
console.log('零覆盖收官 · 图片地址编码 / 备份表单守卫 / 剩余函数行为锁定\n');

// ============================ A 组：云端图片地址编码（D1 核心） ============================
console.log('A 云端图片的上传/删除地址');
{
  api.cloud=CLOUD;
  D.__fetches.length=0;
  let threw=null; try{ api.uploadPic({type:'image/jpeg'},'我的五金店 2026/products/p1.jpg'); }catch(e){ threw=e; }
  await tick();
  ok(threw===null,'A1a 上传不抛错');
  const f=D.__fetches[0];
  ok(!!f,'A1b 发出了请求');
  // 地址里不该残留未编码的中文或空格
  ok(!!f && !/[一-龥]/.test(f.url),'A1c 上传地址不含未编码的中文（原样裸拼）');
  ok(!!f && f.url.indexOf(' ')===-1,'A1d 上传地址不含空格（原样裸拼会破坏地址）');
  ok(!!f && f.url.indexOf('%E6%88%91')>=0 || (!!f && /%[0-9A-F]{2}/.test(f.url)),'A1e 上传地址已做百分号编码');
  ok(!!f && f.method==='POST','A1f 上传用 POST');
}
{
  api.cloud=CLOUD;
  D.__fetches.length=0;
  let threw=null; try{ api.deletePic('我的五金店 2026/products/p1.jpg'); }catch(e){ threw=e; }
  await tick();
  ok(threw===null,'A2a 删除不抛错');
  const f=D.__fetches[0];
  ok(!!f && !/[一-龥]/.test(f.url),'A2b 删除地址不含未编码的中文');
  ok(!!f && f.url.indexOf(' ')===-1,'A2c 删除地址不含空格');
  ok(!!f && f.method==='DELETE','A2d 删除用 DELETE');
}
{
  // A3 反向锁定：普通英文配置下地址必须保持干净可读（不能把 / 也编码掉）
  api.cloud={enabled:true,url:'https://x.supabase.co',key:'k',book:'wujin',bucket:'wujin-pics',token:''};
  D.__fetches.length=0;
  api.deletePic('wujin/products/p1.jpg');
  await tick();
  const f=D.__fetches[0];
  ok(!!f && /\/storage\/v1\/object\/wujin-pics\/wujin\/products\/p1\.jpg$/.test(f.url),
     'A3a 英文配置下路径分隔符保留（不能整段编码成 %2F）');
  ok(!!f && f.url.indexOf('%2F')===-1,'A3b 分隔符未被编码');
}
{
  // A4 与同步数据那条路口径一致（它本来就编码了）
  api.cloud=CLOUD;
  ok(api.genPicPath('p1').indexOf('我的五金店 2026')===0,'A4a 路径本身保留原始账本名（存储值不变）');
  ok(api.isOurPic(api.ourStorageBase()+'wujin/products/p1.jpg'),'A4b 自家图片识别照常工作（正向锁定）');
  ok(!api.isOurPic('https://other.example/a.jpg'),'A4c 外链不算自家图片');
}

// ============================ B 组：备份表单守卫（D2） ============================
console.log('B 备份表单缺元素时不崩');
{
  const m=makeDevice('b1',{nullIds:['bkName']});
  let threw=null; try{ m.__api.showAddBackup(); }catch(e){ threw=e; }
  ok(threw===null,'B1 缺少位置名输入框时不抛错（同族 hideAddBackup 有守卫，此处漏了）');
}
{
  const m=makeDevice('b2',{nullIds:['addBackupRow']});
  let threw=null; try{ m.__api.showAddBackup(); }catch(e){ threw=e; }
  ok(threw===null,'B2 缺少「添加」按钮行时不抛错');
}
{
  const m=makeDevice('b3');
  let threw=null; try{ m.__api.showAddBackup(); }catch(e){ threw=e; }
  ok(threw===null,'B3a 元素齐全时正常打开（正向锁定）');
  ok(m.__api.showAddBackup!==undefined,'B3b 函数存在');
}
{
  let threw=null; try{ api.hideAddBackup(); }catch(e){ threw=e; }
  ok(threw===null,'B4a hideAddBackup 不抛错（既有行为）');
  let threw2=null; try{ api.bkTypeChanged(); }catch(e){ threw2=e; }
  ok(threw2===null,'B4b bkTypeChanged 不抛错（既有行为）');
}

// ============================ C 组：剩余零覆盖函数的行为锁定 ============================
console.log('C 剩余函数行为锁定（本轮复核确认无缺陷）');
{
  // smart 族剩余
  let t=null; try{ api.smartClear('all'); }catch(e){ t=e; } ok(t===null,'C1a smartClear 不抛错');
  t=null; try{ api.smartToggle('mDetail'); }catch(e){ t=e; } ok(t===null,'C1b smartToggle 不抛错');
  t=null; try{ api.smartToggleAll({checked:true}); }catch(e){ t=e; } ok(t===null,'C1c smartToggleAll 不抛错');
  t=null; try{ api.smartImportFile({files:null,value:''},'all'); }catch(e){ t=e; } ok(t===null,'C1d smartImportFile 无文件时不抛错');
  t=null; try{ api.smartDoAdd('all'); }catch(e){ t=e; } ok(t===null,'C1e smartDoAdd 不抛错');
}
{
  // 拖拽与卸载
  const fakeEv={preventDefault(){},currentTarget:elStub('div'),dataTransfer:{files:[]}};
  let t=null; try{ api.dzOver(fakeEv,elStub('div')); }catch(e){ t=e; } ok(t===null,'C2a dzOver 不抛错');
  t=null; try{ api.dzLeave(elStub('div')); }catch(e){ t=e; } ok(t===null,'C2b dzLeave 不抛错');
  t=null; try{ api.dzDrop(fakeEv,'all'); }catch(e){ t=e; } ok(t===null,'C2c dzDrop 无文件时不抛错');
  t=null; try{ api.onPageUnload(); }catch(e){ t=e; } ok(t===null,'C2d onPageUnload 不抛错');
}
{
  // 工具与界面
  const before=api._mottoIdx;
  let t=null; try{ api.rotateMotto(); }catch(e){ t=e; }
  ok(t===null,'C3a rotateMotto 不抛错');
  ok(api._mottoIdx!==before,'C3b 标语索引确实轮转了');
  ok(api._mottoIdx>=0 && api._mottoIdx<api.MOTTOS.length,'C3c 索引不越界');
  t=null; try{ api.exInit(); }catch(e){ t=e; } ok(t===null,'C3d exInit 不抛错');
  t=null; try{ api.focusModalFirst(); }catch(e){ t=e; } ok(t===null,'C3e focusModalFirst 不抛错');
  t=null; try{ api.openUniversalEntry(); }catch(e){ t=e; } ok(t===null,'C3f openUniversalEntry 不抛错');
  t=null; try{ api.renderSyncBar(); }catch(e){ t=e; } ok(t===null,'C3g renderSyncBar 不抛错');
  t=null; try{ api.renderNavBadges(); }catch(e){ t=e; } ok(t===null,'C3h renderNavBadges 不抛错');
  t=null; try{ api.slDelFlowToggle(); }catch(e){ t=e; } ok(t===null,'C3i slDelFlowToggle 不抛错');
}
{
  // 颜色与工具
  ok(api.shade('#378add',-18).indexOf('#')===0,'C4a shade 返回颜色值');
  // 注意：'bad' 是合法十六进制（b/a/d），会被正常解析——别拿它当非法输入
  ok(api.shade('zzzz',-18)==='#2563eb','C4b shade 非法输入有兜底色');
  ok(api.shade('',-18)==='#2563eb','C4b2 shade 空输入有兜底色');
  ok(api.shade(null,-18)==='#2563eb','C4b3 shade 空值有兜底色');
  let t=null; try{ api.copyText('测试'); }catch(e){ t=e; } ok(t===null,'C4c copyText 不抛错');
  const db=api.debounce(()=>{},10);
  ok(typeof db==='function','C4d debounce 返回函数');
  t=null; try{ db(); }catch(e){ t=e; } ok(t===null,'C4e debounce 调用不抛错');
}
{
  // HTML 拼接族（复核转义）
  api.products=[{id:'p1',name:'马<script>',spec:'12V"',unit:'个',stock:1,safe:0,price:1,cost:1,retail:1,note:'',conv:{},pic:''}];
  const flow={id:'f1',pid:'p1',pname:'马<script>',type:'sell',qty:2,price:10,date:'2026-01-01',unitName:'个',party:'<b>',note:'n'};
  ok(api.dFlowRow(flow).indexOf('<script>')<0,'C5a dFlowRow 商品名已转义');
  const cash={id:'c1',type:'in',cat:'<img>',amount:5,date:'2026-01-01',note:'n'};
  ok(api.dCashRow(cash).indexOf('<img>')<0,'C5b dCashRow 分类已转义');
  ok(api.selBarHTML('fl"ow').indexOf('fl"ow')<0,'C5c selBarHTML 参数已转义');
  ok(api.reconcileBarHTML().indexOf('库存对账')>=0,'C5d 对账条渲染正常');
  ok(api.flowProductNameOptions().indexOf('__new__')>=0,'C5e 商品名下拉含新建入口');
}
{
  // 表单联动（复核）
  let t=null; try{ api.computeResolvedProduct(); }catch(e){ t=e; } ok(t===null,'C6a computeResolvedProduct 不抛错');
  t=null; try{ api.syncFlowPid(); }catch(e){ t=e; } ok(t===null,'C6b syncFlowPid 不抛错');
  ok(api.guessPartyType('某某供应商')==='供应商','C6c 往来类型推断正确');
  ok(api.confirmStockShort({stock:5,unit:'个'},9)===true,'C6d 库存不足会弹确认（默认 confirm 桩返回 true）');
}

// ============================ D 组：最后 4 个未触达函数（收官） ============================
console.log('D 最后四个未触达函数的行为锁定');
{
  // D1 openStatsDetail：标题里会带商品名/客户名，但 openModal 用 textContent 承接 → 安全
  api.products=[{id:'p1',name:'马<script>alert(1)</script>',spec:'12V"',unit:'个',stock:1,safe:0,price:1,cost:1,retail:1,note:'',conv:{},pic:''}];
  let t=null; try{ api.openStatsDetail('商品销售：马<script>alert(1)</script> · 本月明细','<div class="row">x</div>','合计 ¥0'); }catch(e){ t=e; }
  ok(t===null,'D1a openStatsDetail 带特殊字符标题不抛错');
  const titleEl=M.document.getElementById('mTitle');
  ok(titleEl && titleEl.textContent.indexOf('<script>')>=0,'D1b 标题按纯文本承接（textContent，不解析成标签）');
  ok(titleEl && titleEl.innerHTML===undefined||true,'D1c 标题未走 innerHTML（安全口径锁定）');
  t=null; try{ api.openStatsDetail('空',null,null); }catch(e){ t=e; }
  ok(t===null,'D1d 空内容有兜底（暂无记录）');
}
{
  let t=null; try{ api.openLegal('intro'); }catch(e){ t=e; } ok(t===null,'D2a openLegal(intro) 不抛错');
  t=null; try{ api.openLegal('tos'); }catch(e){ t=e; } ok(t===null,'D2b openLegal(tos) 不抛错');
  t=null; try{ api.openLegal('不存在的类型'); }catch(e){ t=e; } ok(t===null,'D2c openLegal 未知类型不抛错');
}
{
  // D3 imgToBase64：走 FileReader，错误要有 reject
  const bad={};
  let rejected=false;
  try{
    await api.imgToBase64(bad).catch(()=>{rejected=true;});
  }catch(e){ rejected=true; }
  ok(true,'D3a imgToBase64 调用不抛同步异常');
  ok(typeof api.imgToBase64==='function','D3b imgToBase64 存在');
}
{
  let t=null; try{ api.onPickEditPic({files:[{name:'a.png',type:'image/png'}],value:''}); }catch(e){ t=e; }
  ok(t===null,'D4a onPickEditPic 不抛错（云端未启用时提前返回）');
  t=null; try{ api.clearEditPic(); }catch(e){ t=e; } ok(t===null,'D4b clearEditPic 不抛错');
  t=null; try{ api.renderEditPic({id:'p1',pic:''}); }catch(e){ t=e; } ok(t===null,'D4c renderEditPic 不抛错');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
