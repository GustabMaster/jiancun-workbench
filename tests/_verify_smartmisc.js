// 专项：一句话录入的「结算方式判定」+「修改历史的时间显示」。
// 选题：零覆盖区（源 464 − 测试语料，余 50），本轮攻 smart 族剩余与历史显示族。
//
// D1（P2 · 账目错误）「收回欠款」被判成赊账：
//   smartSettle 里 /欠/ 会命中「收回欠款 / 收欠款 / 还清欠款」——但这类句子说的是**把以前欠的钱收回来**，
//   是收到钱（收入），不是新赊一笔。同一句传给 guessCashCat 得到的类别恰恰是「收回欠款」（收入），
//   两个函数口径打架。后果：明明钱已经收了，这笔销售仍落 settle:credit → 生成一条应收记录，
//   账上凭空多出一笔欠款（对账单、应收明细都跟着错）。
//   项目笔记早有定论：「收回欠款」属收入——smartSettle 这一站当年漏改。
// D2（P3 · 显示）fmtHistTime 用 try/catch 兜底，但 new Date(坏值).getFullYear() 返回 **NaN 不抛错**，
//   try/catch 完全抓不到，界面上直接显示「NaN-NaN-NaN NaN:NaN」。
//   同族 v1.15.26 已修过备份状态文本的同类问题，这里是漏网点。
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
function makeDevice(name){
  const elements={};
  const getEl=id=>{ if(!(id in elements))elements[id]=elStub('div'); return elements[id]; };
  const doc={getElementById:getEl,createElement:t=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],
    addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v);},removeItem:k=>{delete localStore[k];}};
  const D={__toasts:[],__timers:[],__local:localStore};
  D.document=doc;D.localStorage=localStorage;
  const ctx={console,
    setTimeout:(f,ms)=>{D.__timers.push({f:f,ms:ms});return D.__timers.length;},clearTimeout:()=>{},
    setInterval:()=>1,clearInterval:()=>{},
    document:doc,localStorage,alert:()=>{},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,TextDecoder,Blob,Uint8Array,ArrayBuffer,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){},btoa:s=>Buffer.from(String(s),'binary').toString('base64'),
    FileReader:function(){this.readAsText=()=>{this.result='';if(this.onload)this.onload();};},
    fetch:()=>Promise.resolve({ok:true,status:200,text:()=>Promise.resolve('')}),
    confirm:()=>true,prompt:()=>null,
    location:{protocol:'https:',href:'https://demo.example/index.html',reload:function(){}},
    caches:{keys:()=>Promise.resolve([]),delete:()=>Promise.resolve(true)},
    navigator:{serviceWorker:{register:()=>Promise.resolve({update:()=>Promise.resolve()}),getRegistration:()=>Promise.resolve(null)}}};
  ctx.globalThis=ctx;ctx.window=ctx;
  D.location=ctx.location;
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  smartSettle, smartDir, smartClassify, guessCashCat, smartParseOne, smartParseLine,
  fmtHistTime, fmtHistVal, histBody, pad2,
  renderConvEditor, readConvEditor, convRow, addConvRow, delConvRow, packSelectHTML,
  lvPageWindow, catOptionsHTML, srcBadge, nameSpecTag, computeResolvedProduct, syncFlowPid, guessPartyType,
  save, load, renderAll, todayStr, esc, jsStr,
  get products(){return products;}, set products(v){products=v;},
  get cfg(){return cfg;}, set cfg(v){cfg=v;},
  get flow(){return flow;}, set flow(v){flow=v;},
  get ar(){return ar;}, set ar(v){ar=v;}
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(m,k){D.__toasts.push({m:String(m),k:k});};
  ctx.renderAll=function(){};
  return {ctx:ctx,__api:ctx.__api,D:D,document:doc};
}

const M=makeDevice('smartmisc');
const api=M.__api;const D=M.D;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

(async function main(){
console.log('结算方式判定 / 历史时间显示 · 专项\n');

// ============================ A 组：结算方式（D1 核心） ============================
console.log('A 结算方式判定');
{
  // A1 核心缺陷：收回欠款 = 收到钱，不能记成赊账
  const s1='卖 电钻 5台 130元 收回欠款';
  ok(api.smartSettle(s1)==='cash','A1a 「收回欠款」判为现结（原判成赊账→凭空多一笔应收）');
  ok(api.guessCashCat(s1)==='收回欠款','A1b 同一句在收支类别里判为「收回欠款」（既有行为，锁定）');
  ok(api.smartSettle(s1)==='cash'&&api.guessCashCat(s1)==='收回欠款','A1c 两个判定不再打架（同为「收到钱」）');
}
{
  ok(api.smartSettle('卖 扳手 3把 45元 已收款')==='cash','A2 「已收款」判为现结');
  ok(api.smartSettle('卖 电钻 5台 130元 收欠款')==='cash','A3 「收欠款」判为现结');
  ok(api.smartSettle('卖 电钻 2台 130元 还清欠款')==='cash','A4 「还清欠款」判为现结');
}
{
  // A5 反向锁定：真赊账不能被上面几条误伤
  ok(api.smartSettle('卖出 螺丝 10盒 20元 赊账')==='credit','A5a 明确的「赊账」仍判赊账');
  ok(api.smartSettle('卖 电钻 5台 130元 月结')==='credit','A5b 「月结」仍判赊账');
  ok(api.smartSettle('卖 电钻 5台 130元 未付')==='credit','A5c 「未付」仍判赊账');
  ok(api.smartSettle('进货 钻头 50个 5元 欠款')==='credit','A5d 进货欠款（应付）仍判赊账——「欠款」前无「收」字');
  ok(api.smartSettle('卖 电钻 5台 130元 挂账')==='credit','A5e 「挂账」仍判赊账');
}
{
  ok(api.smartSettle('卖 电钻 2台 现金')==='cash','A6a 「现金」判现结');
  ok(api.smartSettle('卖 电钻 2台 微信')==='cash','A6b 「微信」判现结');
  ok(api.smartSettle('卖 电钻 2台')==='cash','A6c 无结算词默认现结（既有行为，锁定）');
}
{
  // A7 端到端：走完整解析，确认落出来的结算方式是现结
  const r=api.smartParseOne('卖 电钻 5台 130元 收回欠款','flow',null);
  ok(!!r,'A7a 能解析出一条');
  ok(!r||r.settle==='cash','A7b 整句解析后结算方式为现结（不生成应收）');
}

// ============================ B 组：历史时间显示（D2） ============================
console.log('B 修改历史的时间显示');
{
  const bad=['abc',undefined,'', '2026-13-45', {}];
  bad.forEach((v,i)=>{
    const t=api.fmtHistTime(v);
    ok(t.indexOf('NaN')<0,'B1.'+(i+1)+' 坏值 '+JSON.stringify(String(v)).slice(0,14)+' 不显示 NaN（原输出 NaN-NaN-NaN NaN:NaN）');
  });
}
{
  const good=new Date(2026,0,15,10,30).getTime();
  const t=api.fmtHistTime(good);
  ok(/^2026-01-15 10:30$/.test(t),'B2a 正常时间戳格式化正确（正向锁定，不能修坏）');
  ok(t.indexOf('NaN')<0,'B2b 正常值不含 NaN');
}
{
  ok(api.fmtHistVal(undefined)==='（空）','B3a 空值显示「（空）」（既有行为，锁定）');
  ok(api.fmtHistVal('abc')==='abc','B3b 正常值原样返回（既有行为，锁定）');
}
{
  // B4 端到端：历史面板渲染不出现 NaN
  const rec={_hist:[{t:undefined,ch:[{f:'名称',from:'旧',to:'新'}]},{t:'bad',ch:[]}]};
  const h=api.histBody(rec);
  ok(h.indexOf('NaN')<0,'B4a 历史面板渲染不含 NaN');
  ok(h.indexOf('hist-item')>=0,'B4b 历史面板仍正常渲染条目');
}

// ============================ C 组：相邻链路锁定（防改坏） ============================
console.log('C 相邻功能不被改坏');
{
  ok(api.pad2(5)==='05','C1a pad2 补零（既有行为）');
  ok(api.pad2(12)==='12','C1b pad2 两位数不变');
}
{
  const w=api.lvPageWindow(1,10);
  ok(w.length===5&&w[0]===1&&w[4]===5,'C2a 分页窗口首页 5 项 [1..5]');
  const w2=api.lvPageWindow(10,10);
  ok(w2.length===5&&w2[0]===6&&w2[4]===10,'C2b 分页窗口末页 5 项 [6..10]');
  const w3=api.lvPageWindow(1,3);
  ok(w3.length===3,'C2c 总页数不足时窗口收敛');
  const w4=api.lvPageWindow(1,1);
  ok(w4.length===1&&w4[0]===1,'C2d 单页不越界');
}
{
  const h=api.packSelectHTML('桶');
  ok(h.indexOf('桶')>=0,'C3a 自定义单位出现在下拉里（预设外单位不丢）');
  ok(h.indexOf('（旧值）')>=0,'C3b 预设外单位标注「旧值」');
  ok(h.indexOf('__add__')>=0,'C3c 保留「新增包装」入口');
}
{
  ok(api.nameSpecTag('马<img>','12V').indexOf('<img>')<0,'C4 名称规格标签已转义');
  ok(api.srcBadge('sell').indexOf('销售')>=0,'C5a 来源徽章映射正确');
  ok(api.srcBadge('未知来源').indexOf('未知')>=0,'C5b 未知来源有兜底');
  ok(api.guessPartyType('张记五金厂')==='供应商','C6a 往来类型推断供应商');
  ok(api.guessPartyType('客户王老板')==='客户','C6b 往来类型推断客户');
}
{
  let threw=null;
  try{ api.renderConvEditor('convList',{'盒':4,'桶':12}); }catch(e){ threw=e; }
  ok(threw===null,'C7 换算编辑器渲染不抛错');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
