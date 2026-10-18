// 专项：快捷录入八件套（默认带出上次 / 连续记账待结算清单 / 一句话录单 / 整单模板 /
//       进货速录 / 历史克隆 / 商品即录即建 / 最近成交价记忆）
// 复用 _verify_bulk.js 的无头桩架（mock document/localStorage + __api shim）
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag){
  const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,indeterminate:false,
    set innerHTML(v){this._html=v;this.children=[];},
    get innerHTML(){return this.children.length?this.children.map(c=>c._html||'').join(''):this._html;},
    classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},replaceChild(){},remove(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub()},
    querySelector(){return elStub()},querySelectorAll(){return[]},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}}},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}
const elements={};
const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){},classList:makeClassList()}};
const localStore={};
const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,
  alert:(m)=>{ctx.__lastAlert=m;},
  confirm:(m)=>{ctx.__lastConfirm=m; return ctx.__confirmRet!==false;},
  URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
  WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
  Image:function(){const self=this;this.width=0;this.height=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
  FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};},
  __frResult:'data:image/png;base64,AAAA',__lastAlert:''};
ctx.globalThis=ctx;ctx.window=ctx;
ctx.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),ok:true});
vm.createContext(ctx);
const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cash(){return cash}, set cash(v){cash=v},
  get flow(){return flow}, set flow(v){flow=v},
  get parties(){return parties}, set parties(v){parties=v},
  get ar(){return ar}, set ar(v){ar=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  get flowDraft(){return flowDraft}, set flowDraft(v){flowDraft=v},
  get settle(){return settle}, set settle(v){settle=v},
  get flowType(){return flowType},
  load, save, toast,
  setFlowType, setSettle, renderAll,
  addFlow, addFlowToDraft, settleFlowDraft, readFlowLine, ensureDraftProduct,
  updDraftLine, delDraftLine, clearFlowDraft, draftTotal, renderFlowDraft,
  smartFillDraft, buyFastFillDraft, cloneFlowToDraft,
  smartFillDraftCore, smartFillDraftHome,
  saveFlowDraftAsTpl, loadFlowTpl, delFlowTpl, renderFlowTpls, tplLineToDraft,
  saveFlowLast, restoreFlowLast, lastFlowPrice, lastFlowPriceFor, refreshLastPriceHint,
  loadFlowProductHints, commitFlow,
  clearAll, runModal,
  get flowFilter(){return flowFilter}, set flowFilter(v){flowFilter=v},
  getFlowList, resetFlowView, renderFlow, fillFlowFilter,
  renderStock, renderParty, switchTab, renderActiveTab,
  getStockList, getProductMap,
  restoreLocal, addProduct,
  stmtRows, stmtBalance, showStatement, buildStatementCSV,
  exportFlowCSV, exportCashCSV,
  smartParseOne, smartAmount, smartDate, smartSplitItems, smartParty, smartPartyBest,
  extractPartyFromText, smartUndo, undoLast, parseImportData, importJSON,
  updDraftLine, delDraftLine, draftTotal,
  setCashType, addCash, saveCashEdit, adj, coerceNums,
  smartApplyProduct, smartApplyFlow, smartApplyCash,
  doCollect, saveFlowEdit, smartExtractConv, smartParseConvText,
  renderKPI, renderTodayKPI, renderFin,
  dateStr, hasMonth, addDays, byDateDesc,
  renderCash, renderSaleAna, renderFlowAna, renderStockAna,
  autoHealthCheck, exportCashCSV, exportFlowCSV, esc,
  dataSelfCheck, partyBalance, stmtBalance, recvSum, paySum, getStockStats,
  get delLog(){return delLog}, set delLog(v){delLog=v},
  tomb, applyTombstones, mergeArr, mergeIntoLocal, trimDelLog,
  get cloud(){return cloud}, set cloud(v){cloud=v},
  get dirty(){return dirty}, set dirty(v){dirty=v},
  syncOnce, cloudActive, autoSyncOn, coerceNums,
  trashSnapshot, clearProductRecordsKeep, clearAll, restoreLocal, clone,
  get flowFilter(){return flowFilter}, set flowFilter(v){flowFilter=v},
  get stockFilter(){return stockFilter}, set stockFilter(v){stockFilter=v},
  get partyFilter(){return partyFilter}, set partyFilter(v){partyFilter=v},
  get APP_VERSION(){return APP_VERSION},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  get usage(){return usage}, set usage(v){usage=v},
  propagateProductRename, propagatePartyRename,
  // 旧版本可能还没有该函数：包一层，让 A/B 对照能跑完并如实报 FAIL，而不是整份套件崩溃
  alignSpecSnapshots: (typeof alignSpecSnapshots === 'function') ? alignSpecSnapshots : function(){ throw new Error('alignSpecSnapshots 未实现（旧版本）'); },
  inventoryCost: (typeof inventoryCost === 'function') ? inventoryCost : function(){ throw new Error('inventoryCost 未实现（旧版本）'); },
  collectBackupData: (typeof collectBackupData === 'function') ? collectBackupData : function(){ throw new Error('collectBackupData 未实现（旧版本）'); },
  stmtRows: (typeof stmtRows === 'function') ? stmtRows : function(){ throw new Error('stmtRows 未实现（旧版本）'); }
};`;
vm.runInContext(script+shim,ctx,{filename:'wujin-quick'});

const D=ctx, api=D.__api;
const $=id=>D.document.getElementById(id);
let pass=0,fail=0;
let __swDone=Promise.resolve();   // 异步段（Service Worker 测试）完成信号，结尾汇总前等待它
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const TODAY=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();

/* ---------- 造数据 ---------- */
function seed(){
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:10,price:13,cat:'',spec:'',safe:0,retail:13,wholesale:11},
                {id:'p2',name:'螺母',unit:'个',conv:{},stock:50,cost:8,price:10,cat:'',spec:'',safe:0,retail:10,wholesale:9}];
  api.parties=[{id:'pa1',name:'张三',type:'客户'},{id:'pa2',name:'李四',type:'供应商'}];
  api.flow=[];api.cash=[];api.ar=[];api.stockLog=[];api.delLog=[];
  api.flowDraft=[];
  $('f_unit').innerHTML='<option value="1">基准单位（个）</option>';$('f_unit').value='1';
  $('f_spec').innerHTML='<option value="">（未设置）</option>';$('f_spec').value='';$('f_spec').disabled=true;
  $('f_pid').value='';$('f_product').value='';
  ['f_qty','f_price','f_note','f_smart','f_smart_home','f_buyfast','f_tplname','f_newname','f_newunit','f_newspec','f_newsafe','f_newpname'].forEach(i=>{$(i).value='';});
  $('f_party').value='';$('f_date').value=TODAY;
  D.localStorage.removeItem('wb_wujin_flowTpl');D.localStorage.removeItem('wb_wujin_flowLast');
}
// 以「已选商品」状态填一行表单
function fillForm(pid,name,qty,price,partyId){
  $('f_pid').value=pid;$('f_product').value=name;$('f_spec').value='';$('f_spec').disabled=false;
  $('f_qty').value=qty;$('f_price').value=price;$('f_party').value=partyId||'';
  $('f_date').value=TODAY;$('f_note').value='';$('f_unit').value='1';
}


/* ============================================================
   对抗性模糊测试（v1.15.1 复查第二轮）
   目标：解析器 / 导入导出 / OCR 表格 / 对账 / 模板损坏 / 克隆
   断言口径：不抛错、不出 NaN/undefined 数字、产出结构正确、无 XSS 漏渲染
   ============================================================ */
console.log('\n二轮对抗模糊测试 · 专项\n');

/* ---- A. 一句话录单：畸形文本不崩不出脏数据 ---- */
const SMART_CASES = [
  '', ' ', '   ', '\t\n', '。', '!!!', '<script>alert(1)</script>',
  '张三', '张三  ', ' 螺母5个', '螺母5个13元', '5个', '13元', '5个13元',
  '螺母 -5个 13元', '螺母 99999999999999999999个 13元',
  '螺母 5个 -13元', '螺母 5个 0元', '螺母 abc个 13元', '螺母 5.5.5个',
  '螺母5个13元 电钻3个30元 螺丝10个1元', 'a'.repeat(5000),
  '螺母\t5个\t13元', '螺母\n5个\n13元', '💰🔥 螺母 5个 13元',
  '张三 "引号" 螺母5个', '李四 螺丝 5斤 3.5元', '王五 2026-13-45 螺母5个13元',
];
smartCases: {
  let bad = 0;
  for (const t of SMART_CASES) {
    try {
      seed();
      $('f_smart_home').value = t;
      api.smartFillDraftHome();
      for (const l of api.flowDraft) {
        if (!(Number.isFinite(Number(l.qty)) && Number(l.qty) >= 0)) { bad++; console.log('    脏qty: ' + JSON.stringify(t.slice(0, 30)) + ' -> ' + l.qty); }
        if (!(Number.isFinite(Number(l.price)) && Number(l.price) >= 0)) { bad++; console.log('    脏price: ' + JSON.stringify(t.slice(0, 30)) + ' -> ' + l.price); }
        if (l.pid !== null && l.pid !== undefined && typeof l.pid !== 'string') { bad++; console.log('    脏pid'); }
      }
    } catch (e) { bad++; console.log('    抛错: ' + JSON.stringify(t.slice(0, 30)) + ' -> ' + e.message); }
  }
  ok(bad === 0, '一句话录单 ' + SMART_CASES.length + ' 个畸形文本：不抛错、qty/price 恒为有限非负数、pid 类型正确');
}

/* ---- B. 进货速录：多行垃圾文本 ---- */
const BUY_CASES = [
  '', '\n\n\n', '货', '货 1', '货 1 2', '货 x y', '货 -1 -2',
  '货 1 2\n\n货二 3 4\n', 'a'.repeat(3000) + ' 1 2', '货 1e3 2.5',
  '货 999999999999999999999 1', '货 1 2\n<script>',
  '货\t1\t2\n货二\t3\t4', '  货 1 2  \n   \n',
];
buyCases: {
  let bad = 0;
  for (const t of BUY_CASES) {
    try {
      seed();
      api.setFlowType('buy');
      $('f_buyfast').value = t;
      api.buyFastFillDraft();
      for (const l of api.flowDraft) {
        if (!(Number.isFinite(Number(l.qty)) && Number(l.qty) >= 0)) { bad++; console.log('    脏qty: ' + JSON.stringify(t.slice(0, 20))); }
        if (!(Number.isFinite(Number(l.price)) && Number(l.price) >= 0)) { bad++; console.log('    脏price'); }
      }
    } catch (e) { bad++; console.log('    抛错: ' + JSON.stringify(t.slice(0, 20)) + ' -> ' + e.message); }
  }
  ok(bad === 0, '进货速录 ' + BUY_CASES.length + ' 个畸形多行文本：不抛错、数字干净');
}

/* ---- C. 模板数据被写坏：各种非预期形状 ---- */
const TPL_CASES = [
  { id: 't1', name: '坏1', lines: null },
  { id: 't2', name: '坏2', lines: '字符串' },
  { id: 't3', name: '坏3', lines: 42 },
  { id: 't4', name: '坏4', lines: [{ pid: 'p1' }] },
  { id: 't5', name: '坏5', lines: [{ pid: 'p1', qty: 'abc', price: null }] },
  { id: 't6', name: '坏6', lines: [null, undefined, 5, 'x'] },
  { id: 't7', name: '坏7', lines: [{ pid: 'p_gone', pname: '电钻', qty: 1, price: 1 }] },
  { id: 't8', name: '坏8' },
  { id: 't9', lines: [] },
  {},
];
tplCases: {
  let bad = 0;
  for (const tpl of TPL_CASES) {
    try {
      seed();
      D.localStorage.setItem('wb_wujin_flowTpl', JSON.stringify([tpl]));
      api.loadFlowTpl(tpl.id || '');
      api.renderFlowTpls();
      for (const l of api.flowDraft) {
        if (l && l.pid !== null && typeof l.pid !== 'string' && l.pid !== undefined) { bad++; }
      }
    } catch (e) { bad++; console.log('    抛错: ' + JSON.stringify(tpl).slice(0, 60) + ' -> ' + e.message); }
  }
  ok(bad === 0, TPL_CASES.length + ' 种损坏模板：带入/渲染不抛错');
}

/* ---- D. 历史克隆：源流水缺字段/商品已删 ---- */
cloneCases: {
  let bad = 0;
  const flows = [
    { id: 'f1', type: 'sell', pid: 'p1', qty: 1, price: 1 },
    { id: 'f2', type: 'sell', pid: 'p_gone', pname: '已删货', qty: 2, price: 3 },
    { id: 'f3', type: 'sell', pid: 'p1', qty: 'abc', price: undefined },
    { id: 'f4' },
    { id: 'f5', type: 'buy', pid: 'p1', qty: 5, price: 8, unitFactor: 'x', unitName: 42 },
  ];
  for (const fl of flows) {
    try {
      seed();
      api.flow = [fl]; api.save('flow', api.flow);
      api.cloneFlowToDraft(fl.id);
    } catch (e) { bad++; console.log('    抛错: ' + JSON.stringify(fl).slice(0, 60) + ' -> ' + e.message); }
  }
  ok(bad === 0, '历史克隆 5 种残缺流水：不抛错');
}

/* ---- E. XSS 漏渲染：商品名/备注带 HTML 必须被转义后渲染 ---- */
xssCases: {
  seed();
  api.products = [{ id: 'p1', name: '<script>alert(1)</script>', unit: '个', conv: {}, stock: 10, cost: 1, price: 2, cat: '', spec: '', safe: 0, retail: 2, wholesale: 1 }];
  api.flow = [{ id: 'fl1', type: 'sell', pid: 'p1', pname: '<img src=x onerror=alert(1)>', qty: 1, price: 2, unitFactor: 1, date: TODAY, settle: 'cash', partyId: 'pa1', party: '张三', note: '<svg onload=alert(1)>' }];
  api.save('products', api.products); api.save('flow', api.flow);
  let threw = false, html = '';
  try { api.renderFlow(); html = $('flowList').innerHTML; } catch (e) { threw = true; }
  ok(!threw, '带恶意 HTML 的流水渲染不抛错');
  // 有效口径：未转义的裸标签（< 后紧跟 script/img/svg）。onerror=/onload= 出现在 &lt;…&gt; 转义文本里属无害
  ok(!/<script/i.test(html) && !/<img/i.test(html) && !/<svg/i.test(html) && /&lt;script&gt;/.test(html), '恶意 HTML 已被转义（无未转义裸标签，且确认走过 esc）');
}

/* ---- F. 对账报表：畸形流水不崩不出 NaN ---- */
stmtCases: {
  seed();
  api.flow = [
    { id: 'a1', type: 'sell', pid: 'p1', pname: '电钻', qty: 2, price: 13, unitFactor: 1, date: TODAY, settle: 'cash', partyId: 'pa1', party: '张三' },
    { id: 'a2', type: 'sell', pid: 'p1', qty: 1, price: 10, date: TODAY, settle: 'credit', partyId: 'pa1' },
    { id: 'a3', type: 'buy', pid: 'p2', qty: 5, price: 8, date: TODAY, settle: 'cash', partyId: 'pa2', refund: true },
    { id: 'a4', type: 'sell', pid: 'p_gone', pname: '已删货', qty: 1, price: 5, date: TODAY, settle: 'cash' },
    { id: 'a5', type: 'sell', pid: 'p1', qty: 'abc', price: null, date: TODAY },
    { id: 'a6', type: 'sell', pid: 'p1', qty: 0, price: 0, date: TODAY },
    { id: 'a7' },
  ];
  api.save('flow', api.flow);
  let bad = 0;
  try {
    const rows = api.stmtRows('pa1');
    if (!Array.isArray(rows)) bad++;
    const bal = api.stmtBalance('pa1');
    if (!(Number.isFinite(Number(bal)) || typeof bal === 'object')) bad++;
    api.showStatement('pa1');
    api.buildStatementCSV('pa1');
  } catch (e) { bad++; console.log('    对账抛错: ' + e.message); }
  ok(bad === 0, '对账/报表 7 种畸形流水（含缺字段/零值/退款/挂空 pid）：不抛错');
}

/* ---- G. CSV 导出：字段含逗号/引号/换行不得击穿表格结构 ---- */
csvCases: {
  // 截获 downloadCSV 的输出
  vm.runInContext('downloadCSV=function(name,rows){globalThis.__lastCSV=rows.map(function(r){return r.map(csvCell).join(",");}).join("\\r\\n");};', D);
  seed();
  api.products = [{ id: 'p1', name: '螺母,大号"特制"\n第二行', unit: '个', conv: {}, stock: 10, cost: 1, price: 2, cat: '', spec: '', safe: 0, retail: 2, wholesale: 1 }];
  api.cash = [{ id: 'c1', type: 'in', amount: 100, cat: '销售,含"税"\n明细', date: TODAY, note: 'a,b\n"c"' }];
  api.save('products', api.products); api.save('cash', api.cash);
  let bad = 0;
  try {
    api.exportFlowCSV(); const csv1 = D.__lastCSV;
    api.exportCashCSV(); const csv2 = D.__lastCSV;
    // 表头 1 行 + 1 条记录 = 2 行；若字段里的换行未转义，行数会 >2
    if (csv2.split('\r\n').length !== 2) { bad++; console.log('    收支 CSV 行数被击穿: ' + csv2.split('\r\n').length); }
    if (!csv2.includes('"销售,含""税""')) { bad++; console.log('    引号未双写: ' + JSON.stringify(csv2.slice(0, 120))); }
  } catch (e) { bad++; console.log('    CSV 导出抛错: ' + e.message); }
  ok(bad === 0, 'CSV 导出：逗号/引号/换行字段被正确包裹，表格结构不被击穿');
}

/* ---- H. 低层解析器直 fuzz ---- */
parserCases: {
  const INPUTS = [null, undefined, '', ' ', 0, 5, -1, 1e21, NaN, {}, [], true,
    '螺母', '螺母5个', '5个13元', 'abc', '2026-01-02', '1.5', '1,234.5', '¥99', '-0',
    'a'.repeat(2000), '<b>x</b>', '2026-13-45', '13:99', '  螺母  5  个  ', '五斤三两'];
  let bad = 0;
  for (const v of INPUTS) {
    try {
      const a1 = api.smartParseOne(v);
      const a2 = api.smartAmount(v);
      const a3 = api.smartDate(v);
      const a4 = api.smartSplitItems(v);
      const a5 = api.smartPartyBest ? api.smartPartyBest(String(v == null ? '' : v)) : null;
      const a6 = api.extractPartyFromText(String(v == null ? '' : v));
      if (a2 !== null && a2 !== undefined && !Number.isFinite(Number(a2))) { bad++; console.log('    smartAmount 出非有限数: ' + JSON.stringify(v) + ' -> ' + a2); }
      if (a4 !== null && a4 !== undefined && !Array.isArray(a4)) { bad++; console.log('    smartSplitItems 非数组'); }
      if (a6 && typeof a6 !== 'object') { bad++; console.log('    extractPartyFromText 返回非对象'); }
    } catch (e) { bad++; console.log('    解析器抛错: ' + JSON.stringify(String(v).slice(0, 20)) + ' -> ' + e.message); }
  }
  ok(bad === 0, '低层解析器 ' + INPUTS.length + ' 个畸形输入（含 null/数字/超长/非法日期）：不抛错、数字恒有限');
}

/* ---- I. 撤销路径：smart_undo 数据被写坏 ---- */
undoCases: {
  const BAD = [null, '字符串', 42, {}, { ts: 1 }, { snap: null, ts: 1 }, { snap: {}, ts: 'x' }, { snap: { products: 'x' }, ts: 1 }, []];
  let bad = 0;
  for (const u of BAD) {
    try {
      seed();
      D.localStorage.setItem('wb_wujin_smart_undo', JSON.stringify(u));
      api.undoLast();
    } catch (e) { bad++; console.log('    撤销抛错: ' + JSON.stringify(u).slice(0, 40) + ' -> ' + e.message); }
  }
  ok(bad === 0, '撤销路径 ' + BAD.length + ' 种损坏快照：不抛错');
}

/* ---- J. 草稿行操作与结算：行数据残缺 ---- */
draftCases: {
  let bad = 0;
  const lines = [
    { pid: 'p1', pname: '电钻', qty: 1, price: 2 },
    { pid: 'p_gone', pname: '已删货', qty: 1, price: 1 },
    { pid: null, pname: '', qty: 'abc', price: null },
    { qty: NaN, price: Infinity },
    {},
  ];
  for (const l of lines) {
    try {
      seed();
      api.flowDraft = [JSON.parse(JSON.stringify(l))];
      api.renderFlowDraft();
      api.draftTotal();
      api.settleFlowDraft();
    } catch (e) { bad++; console.log('    草稿抛错: ' + JSON.stringify(l).slice(0, 50) + ' -> ' + e.message); }
  }
  ok(bad === 0, '待结算清单 5 种残缺行：渲染/合计/结算不抛错');
}

/* ---- K. 数值溢出与消毒全链路（第三轮：Infinity 持久化 → JSON null → 导出再导入静默丢数据） ---- */
console.log('\nK. 数值溢出与消毒');
{
  const fin=v=>Number.isFinite(Number(v));
  // K1 快捷收支录入/编辑
  seed(); api.setCashType('out');
  $('c_cat').value='其他';$('c_date').value=TODAY;$('c_note').value='';
  $('c_amt').value='1e400'; api.addCash();
  ok(api.cash.length===0,'收支录入 1e400（→Infinity）：拒绝入库');
  $('c_amt').value='1e308'; api.addCash();
  ok(api.cash.length===1&&fin(api.cash[0].amount)&&api.cash[0].amount<=1e15,'收支录入 1e308：截断为有限数（'+api.cash[0].amount+'）');
  $('ec_type').value='out';$('ec_cat').value='其他';$('ec_date').value=TODAY;$('ec_note').value='';
  $('ec_amt').value='1e400'; api.saveCashEdit(api.cash[0].id);
  ok(fin(api.cash[0].amount),'编辑收支 1e400：不写坏值');
  $('ec_amt').value='1e308'; api.saveCashEdit(api.cash[0].id);
  ok(fin(api.cash[0].amount)&&api.cash[0].amount<=1e15,'编辑收支 1e308：截断为有限数（'+api.cash[0].amount+'）');
  // K2 库存调整（adj 弹窗链路；注意：adj() 末尾即调 adjHint()，须先设好输入值再开弹窗）
  seed();
  $('adj_unit').value='1'; $('adj_qty').value='1e400';
  api.adj('p1',1); api.runModal();
  ok(fin(api.products[0].stock)&&api.products[0].stock===100,'库存调整 1e400：数量归零、库存不动');
  $('adj_unit').value='1'; $('adj_qty').value='1e308';
  api.adj('p1',1); api.runModal();
  ok(fin(api.products[0].stock)&&api.products[0].stock>100&&api.products[0].stock<=1e15+100,'库存调整 1e308：截断为有限数（'+api.products[0].stock+'）');
  // K3 商品新增
  seed();
  $('p_name').value='溢出货';$('p_cat').value='';$('p_spec').value='';$('p_jian').value='1e400';
  $('p_stock').value='1e400';$('p_safe').value='1e308';
  $('p_cost').value='1e400';$('p_wholesale').value='1e308';$('p_retail').value='1e400';$('p_note').value='';$('p_loc').value='';
  api.addProduct();
  const np=api.products[api.products.length-1];
  ok(!!np&&fin(np.stock)&&fin(np.safe)&&fin(np.cost)&&fin(np.wholesale)&&fin(np.retail),'商品新增极端值：字段全有限（stock='+np.stock+' safe='+np.safe+' cost='+np.cost+'）');
  ok(!(np.conv&&Number(np.conv['件'])>1e15),'商品新增 件系数 1e400：不写入溢出系数');
  // K4 导入消毒（坏备份：JSON 里 1e400 字面量 → JSON.parse 得 Infinity）
  const bad={products:[{id:'p1',name:'x',stock:1e400,safe:'1e400',cost:'abc'}],
    cash:[{id:'c1',type:'in',cat:'x',amount:1e400},{id:'c2',type:'in',cat:'x',amount:'1e400'},{id:'c3',type:'in',cat:'x',amount:'12.5'}],
    flow:[{id:'f1',qty:1e400,price:1e308,unitFactor:'1e400'}],
    ar:[{id:'a1',amount:1e400,paidAmount:1e400}],stockLog:[{id:'s1',qty:1e400,price:1e400}],
    parties:[{id:'pa1',name:'y',type:'客户'}],todos:[]};
  const pi=api.parseImportData(bad);
  let allFin=true;
  [pi.products,pi.cash,pi.flow,pi.ar,pi.stockLog].forEach(a=>a.forEach(r=>['qty','price','unitFactor','amount','paidAmount','stock','safe','cost'].forEach(k=>{if(k in r&&!fin(r[k]))allFin=false;})));
  ok(!!pi&&allFin,'导入消毒：Infinity/坏串全部归零，有限值保留');
  ok(pi.cash[2].amount===12.5,'导入消毒：合法数字串原样保留');
  // K5 云端合并消毒
  seed();
  api.products=[{id:'p1',name:'x',unit:'个',conv:{},stock:1e400,cost:1e308,price:1e400,safe:0,retail:0,wholesale:0}];
  api.cash=[{id:'c1',type:'in',cat:'x',amount:1e400}];
  api.coerceNums();
  ok(fin(api.products[0].stock)&&fin(api.products[0].cost)&&fin(api.cash[0].amount),'云端合并消毒：非有限数归零');
  // K6 包装换算系数上限
  const huge='9'.repeat(400);
  ok(!('盒' in api.smartParseConvText('盒='+huge).conv),'换算文本 盒=400位9：溢出系数丢弃');
  ok(api.smartParseConvText('盒=4').conv['盒']===4,'换算文本 盒=4：正常系数保留');
  ok(!('盒' in api.smartExtractConv('每盒='+huge).conv),'换算抽取 每盒=400位9：溢出系数丢弃');
  ok(api.smartExtractConv('每盒=12').conv['盒']===12,'换算抽取 每盒=12：正常系数保留');
  // K7 智能录入落地三通道
  seed();
  ok(api.smartApplyCash({amount:1e400,type:'out',cat:'其他',date:TODAY,note:''})===false&&api.cash.length===0,'智能录收支 1e400：拒绝');
  api.smartApplyCash({amount:1e308,type:'out',cat:'其他',date:TODAY,note:''});
  ok(api.cash.length===1&&fin(api.cash[0].amount)&&api.cash[0].amount<=1e15,'智能录收支 1e308：截断');
  seed();
  api.smartApplyProduct({name:'智能货',spec:'',cat:'',convText:'',jian:1e400,stock:1e400,cost:1e308,retail:1e400,note:''});
  const sp=api.products[api.products.length-1];
  ok(fin(sp.stock)&&fin(sp.cost)&&fin(sp.retail)&&!(sp.conv&&Number(sp.conv['件'])>1e15),'智能录商品极端值：有限且无溢出件系数');
  seed();
  ok(api.smartApplyFlow({name:'电钻',qty:1e400,price:1e308,type:'sell',settle:'cash',date:TODAY})===false,'智能录流水 qty=1e400：拒绝');
  api.smartApplyFlow({name:'电钻',qty:1e308,price:1e308,type:'sell',settle:'cash',date:TODAY});
  ok(fin(api.cash[api.cash.length-1].amount)&&fin(api.products[0].stock),'智能录流水 1e308×1e308：现金/库存有限');
  // K8 买卖提交 + KPI 渲染（锁 v1.15.1 复现路径）
  seed();
  api.commitFlow({id:'',type:'sell',pid:'p1',pname:'电钻',partyId:'',partyName:'',settle:'cash',date:TODAY,qty:1e308,price:1e308,ufactor:1,uname:'个',note:''});
  ok(fin(api.cash[api.cash.length-1].amount)&&fin(api.products[0].stock),'买卖提交 1e308×1e308：现金 '+api.cash[api.cash.length-1].amount+'、库存有限');
  let kpiOk=true;
  try{api.renderKPI();api.renderTodayKPI();api.renderFin();}catch(e){kpiOk=false;}
  ok(kpiOk&&!/NaN/.test($('kpiBox')?$('kpiBox').innerHTML:''),'KPI/财务报表：不抛错、无 NaN');
  // K9 编辑买卖：老记录带 Infinity 的 unitFactor/stockDelta
  seed();
  api.flow=[{id:'f1',_t:Date.now(),type:'sell',pid:'p1',pname:'电钻',spec:'',partyId:'pa1',party:'张三',settle:'credit',date:TODAY,note:'',qty:1,price:10,unitName:'个',unitFactor:Infinity,stockDelta:Infinity,linkCashId:null,linkArIds:['a1']}];
  api.ar=[{id:'a1',_t:Date.now(),partyId:'pa1',party:'张三',kind:'receivable',amount:10,paidAmount:0,date:TODAY,due:'',note:''}];
  api.save('flow',api.flow); api.save('ar',api.ar);
  $('ef_qty').value='2';$('ef_price').value='5';$('ef_settle').value='credit';$('ef_party').value='';$('ef_date').value=TODAY;$('ef_note').value='';
  api.saveFlowEdit('f1');
  ok(fin(api.products[0].stock)&&api.products[0].stock===99,'编辑买卖·老记录 unitFactor=Infinity：按有限系数回算（库存 '+api.products[0].stock+'）');
  // K10 收欠款
  seed();
  api.ar=[{id:'a1',_t:Date.now(),partyId:'pa1',party:'张三',kind:'receivable',amount:1e308,paidAmount:0,date:TODAY,due:'',note:''}];
  api.save('ar',api.ar);
  api.doCollect('pa1','receivable',1e400);
  ok(api.cash.length===0,'收款 1e400：拒绝');
  api.doCollect('pa1','receivable',1e308);
  ok(api.cash.length===1&&fin(api.cash[0].amount)&&api.cash[0].amount<=1e15,'收款 1e308（欠款 1e308）：截断为有限数（'+api.cash[0].amount+'）');
  // K11 草稿行编辑
  seed();
  api.flowDraft=[{pid:'p1',pname:'电钻',qty:1,price:2,uname:'个'}];
  api.updDraftLine(0,'qty','1e400'); api.updDraftLine(0,'price','1e308');
  ok(fin(api.flowDraft[0].qty)&&fin(api.flowDraft[0].price)&&api.flowDraft[0].qty===0&&api.flowDraft[0].price===1e15,'草稿行编辑极端值：qty 归零、price 截断');
  // K12 草稿即建商品（注意：ensureDraftProduct 须在 find 回调外调用——find 长度缓存始于调用前，回调内 push 的新元素不会被遍历到）
  seed();
  const _dpId=api.ensureDraftProduct({pname:'草稿新货',price:1e308,newSafe:1e400,spec:''});
  const dp=api.products.find(x=>x.id===_dpId);
  ok(!!dp&&fin(dp.retail)&&fin(dp.price)&&fin(dp.safe)&&dp.retail<=1e15&&dp.safe===0,'草稿即建商品极端值：有限（retail='+(dp&&dp.retail)+' safe='+(dp&&dp.safe)+'）');
  // K13 模板坏行（锁 v1.15.1 修复）
  seed();
  D.localStorage.setItem('wb_wujin_flowTpl',JSON.stringify([{id:'t1',name:'坏模板',lines:[null,42,'str',{pid:'p1',pname:'电钻',qty:1,price:2},undefined]}]));
  let tplRender=true,tplLoad=true;
  try{api.renderFlowTpls();}catch(e){tplRender=false;}
  ok(tplRender,'模板含 null/数字/字符串行：渲染不抛错');
  try{api.loadFlowTpl('t1');}catch(e){tplLoad=false;}
  ok(tplLoad&&api.flowDraft.length===1,'模板加载：坏行被过滤，仅带入 1 条好行');
  // K14 日期解析非字符串（锁 v1.15.1 修复）
  let dOk=true;
  [null,undefined,42,{},[],'','2026-13-45','昨天','2026/8/29'].forEach(c=>{
    try{ if(typeof api.smartDate(c)!=='string')dOk=false; }catch(e){ dOk=false; }
  });
  ok(dOk,'日期解析 9 种非字符串/畸形输入：不抛错、恒返回字符串');
}

/* ---- L. 日期字段类型加固（第四轮：数字/对象日期 → .startsWith/.localeCompare/.split 直接 TypeError） ---- */
console.log('\nL. 日期字段类型加固');
{
  const isStr=v=>typeof v==='string';
  // L1 导入消毒：数字/对象/null/布尔日期与到期日全部转字符串
  const badJson={products:[{id:'p1',name:'货',unit:'个',conv:{},stock:1}],
    cash:[{id:'c1',type:'in',cat:'其他',amount:10,date:20260101},{id:'c2',type:'in',cat:'其他',amount:10,date:{y:2026}},{id:'c3',type:'in',cat:'其他',amount:10,date:null},{id:'c4',type:'in',cat:'其他',amount:10,date:true}],
    flow:[{id:'f1',type:'sell',qty:1,price:2,date:20260101,pid:'p1'},{id:'f2',type:'sell',qty:1,price:2,date:{},pid:'p1'}],
    ar:[{id:'a1',partyId:'pa1',kind:'receivable',amount:5,paidAmount:0,date:20260202,due:20260303}],
    stockLog:[{id:'s1',pid:'p1',qty:1,price:2,type:'in',date:20260404}],
    parties:[{id:'pa1',name:'张三',type:'客户'}],todos:[]};
  const pi=api.parseImportData(badJson);
  let allStr=true;
  ['cash','flow','ar','stockLog'].forEach(k=>pi[k].forEach(r=>{ if('date' in r && r.date!=null && r.date!=='' && !isStr(r.date)) allStr=false; }));
  if(!isStr(pi.ar[0].due)) allStr=false;
  ok(allStr,'导入日期消毒：数字/对象/布尔日期与到期日全部转字符串');

  // L2 导入全链路（FileReader→解析→落库→renderAll）后渲染不抛错
  seed();
  D.__frResult=JSON.stringify(badJson);
  let impOk=true;
  try{ api.importJSON({target:{files:[{}],value:''}}); }catch(e){ impOk=false; }
  ok(impOk && api.cash.length===4,'导入含坏日期的文件：整链路不抛错、4 条收支入库');
  let rendOk=true;
  try{ api.renderCash();api.renderKPI();api.renderTodayKPI();api.renderFin();api.renderSaleAna();api.renderFlowAna();api.renderStockAna();api.stmtRows('pa1'); }catch(e){ rendOk=false; }
  ok(rendOk,'导入后全套渲染（收支/KPI/今日/财务/销售/流水/库存/对账单）：不抛错');

  // L3 存量坏数据（绕过导入直接污染存储）后渲染与导出不抛错——锁渲染层防线
  seed();
  api.cash=[{id:'c1',_t:1,type:'in',cat:'其他',amount:10,date:20260101},{id:'c2',_t:2,type:'out',cat:'其他',amount:3,date:{}},{id:'c3',_t:3,type:'in',cat:'其他',amount:1,date:TODAY}];
  api.flow=[{id:'f1',_t:1,type:'sell',pid:'p1',pname:'电钻',qty:1,price:2,date:20260101,partyId:'pa1',party:'张三',settle:'cash',refund:false},
            {id:'f2',_t:2,type:'sell',pid:'p1',pname:'电钻',qty:2,price:3,date:TODAY,partyId:'pa1',party:'张三',settle:'cash',refund:false}];
  api.ar=[{id:'a1',_t:1,partyId:'pa1',party:'张三',kind:'receivable',amount:5,paidAmount:0,date:20260101,due:{}}];
  api.stockLog=[{id:'s1',_t:1,pid:'p1',pname:'电钻',qty:1,price:2,type:'in',date:20260101}];
  api.save('cash',api.cash);api.save('flow',api.flow);api.save('ar',api.ar);api.save('stocklog',api.stockLog);
  let rend2=true;
  try{ api.renderCash();api.renderKPI();api.renderTodayKPI();api.renderFin();api.renderSaleAna();api.renderFlowAna();api.renderStockAna();api.exportCashCSV();api.exportFlowCSV(); }catch(e){ rend2=false; }
  ok(rend2,'存量坏日期（数字/对象）：渲染与 CSV 导出均不抛错');
  ok(api.stmtRows('pa1').length===3,'对账单：坏日期记录仍列出（3 行），不丢数据');

  // L4 addDays：非字符串/畸形日期不抛错、恒返回字符串；正常日期照常推算
  let dOk2=true,dallStr=true;
  [null,undefined,42,{},[],true,'2026-13-45','昨天','20260101','2026/8/29'].forEach(c=>{
    try{ const r=api.addDays(c,30); if(typeof r!=='string') dallStr=false; }catch(e){ dOk2=false; }
  });
  ok(dOk2&&dallStr,'addDays 10 种非字符串/畸形日期：不抛错、恒返回字符串');
  ok(api.addDays('2026-01-01',30)==='2026-01-31','addDays 正常日期：2026-01-01 +30 天 = '+api.addDays('2026-01-01',30));

  // L5 byDateDesc：数字/对象日期排序不抛错且返回数值
  ok(typeof api.byDateDesc({date:20260101},{date:TODAY})==='number','byDateDesc 数字日期 vs 正常日期：不抛错、返回数值');
  ok(typeof api.byDateDesc({date:{}},{date:null})==='number','byDateDesc 对象日期 vs 空日期：不抛错');

  // L6 hasMonth 语义
  ok(api.hasMonth({date:TODAY},TODAY.slice(0,7))===true,'hasMonth：正常日期按月份命中');
  ok(api.hasMonth({date:20260101},'2026-01')===false&&api.hasMonth({date:{}},'2026-01')===false&&api.hasMonth({date:null},'2026-01')===false&&api.hasMonth(null,'2026-01')===false,'hasMonth：数字/对象/空/缺记录不崩且不误配月份');

  // L7 conv 系数 Infinity 泄漏（旧判据 !(Infinity>0) 为假 → 不删）
  const cj={products:[{id:'p1',name:'货',unit:'个',conv:{'盒':Infinity,'箱':4,'袋':'4','捆':0,'扎':-2,'包':'abc'},stock:1}],
    cash:[{id:'c1',type:'in',cat:'其他',amount:1,date:TODAY}],flow:[{id:'f1',type:'sell',qty:1,price:1,date:TODAY}],
    ar:[],stockLog:[],parties:[],todos:[]};
  const pc=api.parseImportData(cj).products[0];
  ok(!('盒' in pc.conv),'导入 conv 盒=Infinity：非法系数被清除');
  ok(pc.conv['箱']===4&&Number(pc.conv['袋'])===4,'导入 conv 箱=4 / 袋="4"：正常系数保留');
  ok(!('捆' in pc.conv)&&!('扎' in pc.conv)&&!('包' in pc.conv),'导入 conv 0 / 负数 / 非数字：清除');

  // L8 开机自检自愈：数字日期转字符串 + conv 非法系数清除
  seed();
  api.cash=[{id:'c1',_t:1,type:'in',cat:'其他',amount:10,date:20260101}];
  api.products=[{id:'p1',name:'货',unit:'个',conv:{'盒':Infinity,'箱':4},stock:1,cost:1,retail:2,wholesale:1,safe:0}];
  api.save('cash',api.cash);api.save('products',api.products);
  api.autoHealthCheck();
  ok(typeof api.cash[0].date==='string','自检自愈：数字日期转字符串');
  ok(!('盒' in api.products[0].conv)&&api.products[0].conv['箱']===4,'自检自愈：conv 非法系数清除、合法系数保留');
}

/* ---- M. 配置与转义的结构守卫（第五轮：导入配置预设数组 / esc 单引号） ---- */
console.log('\nM. 配置与转义结构守卫');
{
  // M1 导入配置：预设数组被写成字符串/数字/混入非字符串 → 一律归零数组，合法值保留
  const c1=api.parseImportData({products:[{id:'p1',name:'x'}],cfg:{catPresets:'abc',specPresets:5,packPresets:{a:1},locPresets:['1库']}});
  ok(Array.isArray(c1.cfg.catPresets)&&c1.cfg.catPresets.length===0,'导入 cfg 分类预设=字符串：归零为数组');
  ok(Array.isArray(c1.cfg.specPresets)&&c1.cfg.specPresets.length===0,'导入 cfg 规格预设=数字：归零为数组');
  ok(Array.isArray(c1.cfg.packPresets)&&c1.cfg.packPresets.length===0,'导入 cfg 包装预设=对象：归零为数组');
  const c2=api.parseImportData({products:[{id:'p1',name:'x'}],cfg:{catPresets:['五金','耗材'],specPresets:['A']}});
  ok(c2.cfg.catPresets.length===2&&c2.cfg.specPresets.length===1,'导入 cfg 合法预设数组：原样保留');
  const c3=api.parseImportData({products:[{id:'p1',name:'x'}],cfg:{catPresets:['五金',7]}});
  ok(Array.isArray(c3.cfg.catPresets)&&c3.cfg.catPresets.length===0,'导入 cfg 预设混入非字符串：整体归零');
  // M2 esc：单引号一并转义（属潜在的属性注入面）
  ok(api.esc("a'b")==='a&#39;b'&&api.esc('<x>')==='&lt;x&gt;','esc：单引号与尖括号均转义');
  ok(api.esc(null)===''&&api.esc(42)==='42','esc：空值与数字安全');
}

/* ---- N. 智能录入日期规范化 + 撤销历史上限（第六轮） ---- */
console.log('\nN. 日期规范化与撤销栈');
{
  // N1 表格粘贴 / OCR 通道：常见日期写法一律归一为标准格式
  seed();
  let dOk = true; const got = [];
  [['2026/10/1', '2026-10-01'], ['10月1日', '2026-10-01'], ['2026.10.01', '2026-10-01'], ['2026-10-01', '2026-10-01']].forEach(([inp, exp]) => {
    api.flow = []; api.save('flow', api.flow);
    api.smartApplyFlow({ name: '电钻', qty: 1, price: 2, type: 'sell', settle: 'cash', date: inp });
    const f = api.flow[api.flow.length - 1];
    got.push(inp + '→' + (f ? f.date : '(无)'));
    if (!f || f.date !== exp) dOk = false;
  });
  ok(dOk, '智能录流水 4 种日期写法归一为标准格式（' + got.join(' / ') + '）');

  // N2 无法解析的日期（表头文字 / 合计 / 纯数字 / 空）→ 回退今天，不再把乱码写进日期字段
  seed();
  let badOk = true; const got2 = [];
  ['合计', '日期', '20260101', ''].forEach(inp => {
    api.flow = []; api.save('flow', api.flow);
    api.smartApplyFlow({ name: '电钻', qty: 1, price: 2, type: 'sell', settle: 'cash', date: inp });
    const f = api.flow[api.flow.length - 1];
    got2.push(JSON.stringify(inp) + '→' + (f ? f.date : '(无)'));
    if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) badOk = false;
  });
  ok(badOk, '智能录流水 表头/合计/纯数字/空日期：回退今天，不写乱码（' + got2.join(' / ') + '）');

  // N3 收支通道同样归一
  seed();
  api.smartApplyCash({ amount: 5, type: 'out', cat: '其他', date: '2026/10/1', note: '' });
  ok(api.cash.length === 1 && api.cash[0].date === '2026-10-01', '智能录收支 2026/10/1：归一为 2026-10-01');

  // N4 撤销历史上限：同一条记录反复编辑，栈不再无限增长（无上限时长期编辑会撑满本机存储）
  seed();
  api.flow = [{ id: 'f1', _t: Date.now(), type: 'sell', pid: 'p1', pname: '电钻', spec: '', partyId: 'pa1', party: '张三', settle: 'credit', date: TODAY, note: '', qty: 1, price: 10, unitName: '个', unitFactor: 1, linkCashId: null, linkArIds: ['a1'] }];
  api.ar = [{ id: 'a1', _t: Date.now(), partyId: 'pa1', party: '张三', kind: 'receivable', amount: 10, paidAmount: 0, date: TODAY, due: '', note: '' }];
  api.save('flow', api.flow); api.save('ar', api.ar);
  $('ef_settle').value = 'credit'; $('ef_party').value = ''; $('ef_date').value = TODAY; $('ef_note').value = '';
  for (let i = 1; i <= 25; i++) { $('ef_qty').value = String(i); $('ef_price').value = String(10 + i); api.saveFlowEdit('f1'); }
  const hf = api.flow.find(x => x.id === 'f1');
  ok(hf && hf._hist && hf._hist.length === 20, '撤销历史：编辑 25 次后栈长为 20（上限生效，实测 ' + ((hf && hf._hist) ? hf._hist.length : '?') + '）');
  ok(hf && hf._hist[hf._hist.length - 1].snap && hf._hist[hf._hist.length - 1].snap.flow.qty === 24, '撤销历史：保留最近 20 次（末条快照数量 24）');

  // N5 存量超限自愈：老数据里的 40 条痕迹开机裁剪到 20
  seed();
  api.flow = [{ id: 'f1', _t: Date.now(), type: 'sell', pid: 'p1', pname: '电钻', qty: 1, price: 2, date: TODAY, settle: 'cash', _hist: new Array(40).fill(0).map((_, i) => ({ t: i, ch: [{ f: '数量', from: '1', to: '2' }], snap: { flow: { id: 'f1', qty: 1, price: 2 } } })) }];
  api.save('flow', api.flow);
  api.autoHealthCheck();
  const hf2 = api.flow.find(x => x.id === 'f1');
  ok(hf2 && hf2._hist.length === 20, '开机自愈：存量 40 条撤销痕迹裁剪到 20（实测 ' + ((hf2 && hf2._hist) ? hf2._hist.length : '?') + '）');

  // N6 裁剪后撤销功能仍可用
  let undoOk = false;
  try { api.undoLast('flow', 'f1'); const hf3 = api.flow.find(x => x.id === 'f1'); undoOk = !!hf3 && hf3._hist.length === 19; } catch (e) { undoOk = false; }
  ok(undoOk, '撤销历史裁剪后：撤销仍可用（栈长 20 → 19）');
}

/* ---- O. 导入不再静默丢记录 + 时间戳保真 + 备份往返一致（第七轮） ---- */
console.log('\nO. 导入完整性与往返一致');
{
  const T = '2026-10-01';
  // O1 缺编号的记录不再被静默丢弃（与开机自愈「补号保留」同策略）
  const d1 = {
    flow: [{ id: 'f1', type: 'sell', qty: 1, price: 2, date: T }, { type: 'buy', qty: 3, price: 4, date: T, pname: '螺母' }],
    cash: [{ id: 'c1', type: 'in', amount: 5, date: T }, { type: 'out', amount: 7, date: T, cat: '房租' }],
    products: [{ id: 'p1', name: '有号' }, { name: '无号货', stock: 9 }]
  };
  const p1r = api.parseImportData(d1);
  ok(p1r.flow.length === 2 && p1r.cash.length === 2 && p1r.products.length === 2, '缺编号记录：三张表各 2 条全部保留（不再静默丢弃）');
  ok(p1r.flow.every(r => !!r.id) && p1r.products.every(r => !!r.id), '缺编号记录：导入后均补上编号');

  // O2 垃圾行仍然过滤（不能因为放宽就把垃圾也收进来）
  const d2 = { flow: [null, 42, 'str', [], {}, undefined, { id: 'f9', qty: 1, price: 1, date: T }] };
  const p2r = api.parseImportData(d2);
  ok(p2r.flow.length === 1 && p2r.flow[0].id === 'f9', '垃圾行（null/数字/字符串/数组/空对象）：仍被过滤，只留 1 条有效记录');

  // O3 重号：两条都保留（换号），不丢数据
  const d3 = { flow: [{ id: 'dup', type: 'sell', qty: 1, price: 1, date: T }, { id: 'dup', type: 'sell', qty: 2, price: 2, date: T }] };
  const p3r = api.parseImportData(d3);
  ok(p3r.flow.length === 2 && p3r.flow[0].id !== p3r.flow[1].id, '重号记录：两条都保留且编号已区分（不丢数据）');

  // O4 时间戳为数字字符串时保留原值，不再重置为「此刻」（否则本机伪装成最新，会吞掉另一台设备的更新）
  const old = 1699999999999;
  const d4 = { flow: [{ id: 'f1', type: 'sell', qty: 1, price: 1, date: T, _t: String(old) }] };
  const p4r = api.parseImportData(d4);
  ok(p4r.flow[0]._t === old, '导入 时间戳为数字字符串：转为数值并保留原值（' + p4r.flow[0]._t + '）');
  seed();
  api.flow = [{ id: 'f1', type: 'sell', qty: 1, price: 1, date: T, _t: String(old), pid: 'p1', pname: '电钻', settle: 'cash' }];
  api.save('flow', api.flow);
  api.autoHealthCheck();
  const f4 = api.flow.find(x => x.id === 'f1');
  ok(f4 && f4._t === old, '开机自检 时间戳为数字字符串：保留原值而非重置为当前（' + (f4 ? f4._t : '?') + '）');

  // O5 导出 → 再导入 往返一致：条数与关键字段都不变
  const products = [
    { id: 'p1', name: '电钻', spec: 'A1', cat: '五金', unit: '个', conv: { 盒: 4, 件: 12 }, stock: 100, safe: 10, cost: 50, wholesale: 60, retail: 80, price: 80, _t: 1 },
    { id: 'p2', name: '螺母', unit: '个', conv: {}, stock: 5, cost: 1, retail: 2, price: 2, _t: 1, _hist: [{ t: 1, ch: [{ f: '库存', from: '1', to: '5' }], snap: { product: { id: 'p2', fields: { stock: 1 } } } }] }
  ];
  const flowRT = [
    { id: 'f1', type: 'sell', pid: 'p1', pname: '电钻', partyId: 'pa1', party: '张三', settle: 'credit', date: T, qty: 2, price: 80, unitName: '盒', unitFactor: 4, linkArIds: ['a1'], _t: 1 },
    { id: 'f2', type: 'buy', pid: 'p2', pname: '螺母', settle: 'cash', date: T, qty: 10, price: 1, unitFactor: 1, linkCashId: 'c2', linkArIds: [], _t: 1 }
  ];
  const dataRT = {
    _app: 'wujin-workbench', _v: 3, exported: T, products, cash: [{ id: 'c2', type: 'out', cat: '房租水电', amount: 30, date: T, _t: 1 }],
    flow: flowRT, todos: [{ id: 't1', title: '催款', done: false, date: T, _t: 1 }], parties: [{ id: 'pa1', name: '张三', type: '客户', _t: 1 }],
    ar: [{ id: 'a1', partyId: 'pa1', party: '张三', kind: 'receivable', amount: 160, paidAmount: 60, date: T, due: '2026-10-31', _t: 1 }],
    stockLog: [{ id: 's1', pid: 'p1', pname: '电钻', type: 'in', qty: 8, unit: '盒', price: 80, date: T, _t: 1 }],
    cfg: { shop: '小店', font: 16, catPresets: ['五金'], specPresets: ['A1'], packPresets: ['盒'], locPresets: ['1库'] }, delLog: [{ id: 'x1', type: 'cash', t: 5 }]
  };
  const back = api.parseImportData(JSON.parse(JSON.stringify(dataRT)));
  const same = back.products.length === 2 && back.cash.length === 1 && back.flow.length === 2 && back.todos.length === 1
    && back.parties.length === 1 && back.ar.length === 1 && back.stockLog.length === 1 && back.delLog.length === 1;
  ok(same, '备份往返：八张表条数全部一致（无静默丢失）');
  const bp1 = back.products.find(x => x.id === 'p1'), bf1 = back.flow.find(x => x.id === 'f1'), bp2 = back.products.find(x => x.id === 'p2');
  ok(bp1 && bp1.conv['盒'] === 4 && bp1.conv['件'] === 12, '备份往返：商品包装换算系数保留（盒=4 / 件=12）');
  ok(bf1 && bf1.unitFactor === 4 && bf1.unitName === '盒' && JSON.stringify(bf1.linkArIds) === '["a1"]', '备份往返：买卖的单位系数、单位名、关联欠款编号保留');
  ok(bp2 && bp2._hist && bp2._hist.length === 1, '备份往返：商品修改痕迹保留');
  ok(back.cfg && back.cfg.catPresets.length === 1 && back.cfg.font === 16 && back.cfg.shop === '小店', '备份往返：店铺配置保留');
}

{
  // P1 自检必须能报出「无穷大」金额（旧写法 isNaN(Infinity)===false 会漏报，只报得出 NaN）
  seed();
  api.cash = [{ id: 'c1', _t: 1, type: 'in', cat: '销售货款', amount: Infinity, date: TODAY },
              { id: 'c2', _t: 1, type: 'out', cat: '房租水电', amount: NaN, date: TODAY }];
  api.ar = []; api.save('cash', api.cash); api.save('ar', api.ar);
  let iss = api.dataSelfCheck().filter(i => /收支金额为非法数值/.test(i.t));
  ok(iss.length === 2, '自检报出全部非法收支金额（无穷大 1 + NaN 1，实际 ' + iss.length + '）');

  // P2 应收金额为无穷大 → 必须报出
  seed();
  api.cash = [];
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: Infinity, paidAmount: 0, date: TODAY }];
  api.save('cash', api.cash); api.save('ar', api.ar);
  iss = api.dataSelfCheck().filter(i => /应收\/应付金额为非法数值/.test(i.t));
  ok(iss.length === 1, '自检报出应收金额为无穷大（1 条，实际 ' + iss.length + '）');

  // P3 缺 paidAmount 的欠款不得被静默漏计（旧写法 undefined < 金额 恒为 false → 整笔漏掉）
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, paidAmount: 0, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa2', party: '李四', kind: 'receivable', amount: 200, date: TODAY }];
  api.save('ar', api.ar);
  ok(api.recvSum() === 300, '缺 paidAmount 的记录仍计入应收合计（100+200=300，实际 ' + api.recvSum() + '）');
  ok(api.partyBalance('pa2', 'receivable') === 200, '缺 paidAmount 的单位名下应收 = 200（实际 ' + api.partyBalance('pa2', 'receivable') + '）');

  // P4 无穷大金额不得污染合计（旧写法 recvSum 会变成 Infinity）
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, paidAmount: 0, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: Infinity, paidAmount: 0, date: TODAY }];
  api.save('ar', api.ar);
  const rs = api.recvSum();
  ok (Number.isFinite(rs) && rs === 100, '无穷大金额不污染应收合计（应为 100，实际 ' + rs + '）');

  // P5 对账单余额与往来页余额完全同一口径
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 160, paidAmount: 60, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa1', party: '张三', kind: 'payable', amount: 80, paidAmount: 0, date: TODAY }];
  api.save('ar', api.ar);
  const sb = api.stmtBalance('pa1');
  ok(sb.recv === api.partyBalance('pa1', 'receivable') && sb.pay === api.partyBalance('pa1', 'payable'),
     '对账单余额与往来页余额同一口径（应收 ' + sb.recv + ' / 应付 ' + sb.pay + '）');

  // P6 正常口径回归保护：全额付清不计入 / 部分付款按净额 / 退货按负向冲减
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, paidAmount: 100, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, paidAmount: 40, date: TODAY },
            { id: 'a3', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 30, paidAmount: 0, date: TODAY, refund: true }];
  api.save('ar', api.ar);
  ok(api.partyBalance('pa1', 'receivable') === 30,
     '已付清不计 + 部分付按净额 + 退货负向（0 + 60 − 30 = 30，实际 ' + api.partyBalance('pa1', 'receivable') + '）');

  // P7 缺 stock / 库存无穷大不得把库存总额变成 NaN 或 ∞
  seed();
  api.products = [{ id: 'p1', name: '电钻', unit: '个', conv: {}, stock: 10, price: 13 },
                  { id: 'p2', name: '缺库存字段货', unit: '个', conv: {}, price: 10 },
                  { id: 'p3', name: '库存无穷大', unit: '个', conv: {}, stock: Infinity, price: 10 }];
  api.save('products', api.products);
  const sv = api.getStockStats().val;
  ok(Number.isFinite(sv) && sv === 130, '缺字段/非法库存不污染库存总额（应为 10×13=130，实际 ' + sv + '）');

  // P8 库存为非法数值被自检报出
  iss = api.dataSelfCheck().filter(i => /库存为非法数值/.test(i.t));
  ok(iss.length === 2, '自检报出库存为非法数值（缺字段 1 + 无穷大 1，实际 ' + iss.length + '）');
}

{
  // Q1 墓碑合并取「较晚的删除」：本机 t=100、云端 t=500 → 应取 500，且记录（_t=300）被清除
  seed();
  api.cash = [{ id: 'c1', _t: 300, type: 'in', cat: '销售货款', amount: 50, date: TODAY }];
  api.delLog = [{ id: 'c1', type: 'cash', t: 100 }];
  api.save('cash', api.cash); api.save('del', api.delLog);
  api.mergeIntoLocal({ cash: [{ id: 'c1', _t: 300, type: 'in', cat: '销售货款', amount: 50, date: TODAY }],
                       delLog: [{ id: 'c1', type: 'cash', t: 500 }] });
  const q1t = (api.delLog.find(d => d.id === 'c1') || {}).t;
  ok(q1t === 500, '墓碑合并取较晚的删除（100 → 500，实际 ' + q1t + '）');
  ok(!api.cash.some(c => c.id === 'c1'), '较晚的删除生效：在两次删除之间编辑过的记录被清除');

  // Q2 对称性（收敛）：反过来（本机 500、云端 100）也必须保留 500 —— 两端合并后时间戳一致
  seed();
  api.cash = [{ id: 'c1', _t: 300, type: 'in', cat: '销售货款', amount: 50, date: TODAY }];
  api.delLog = [{ id: 'c1', type: 'cash', t: 500 }];
  api.save('cash', api.cash); api.save('del', api.delLog);
  api.mergeIntoLocal({ cash: [{ id: 'c1', _t: 300, type: 'in', cat: '销售货款', amount: 50, date: TODAY }],
                       delLog: [{ id: 'c1', type: 'cash', t: 100 }] });
  const q2t = (api.delLog.find(d => d.id === 'c1') || {}).t;
  ok(q2t === 500, '合并结果与先后无关（本机 500 / 云端 100 → 仍 500，两端收敛一致）');

  // Q3 应用墓碑：同键出现重复墓碑时取较大 t（而非「后出现者覆盖」）
  seed();
  api.cash = [{ id: 'c1', _t: 80, type: 'in', cat: '销售货款', amount: 5, date: TODAY }];
  api.delLog = [{ id: 'c1', type: 'cash', t: 100 }, { id: 'c1', type: 'cash', t: 50 }];
  api.save('cash', api.cash); api.save('del', api.delLog);
  api.applyTombstones();
  ok(!api.cash.some(c => c.id === 'c1'), '重复墓碑取较大 t（100 > 80 → 记录被删除，而非按 50 保留）');

  // Q4 记录合并仍取较大 _t（回归保护）
  const q4 = api.mergeArr([{ id: 'x', _t: 100, v: '本地' }], [{ id: 'x', _t: 200, v: '云端' }]);
  ok(q4.length === 1 && q4[0].v === '云端', '记录合并取较大时间戳（云端更新者胜）');

  // Q5 时间戳相同时取本地（文档化行为）
  const q5 = api.mergeArr([{ id: 'x', _t: 100, v: '本地' }], [{ id: 'x', _t: 100, v: '云端' }]);
  ok(q5.length === 1 && q5[0].v === '本地', '时间戳并列时取本地（既定行为，避免无谓翻转）');

  // Q6 并集：两台设备各自新增的记录都保留
  const q6 = api.mergeArr([{ id: 'a', _t: 1 }], [{ id: 'b', _t: 1 }]);
  ok(q6.length === 2, '合并为并集：两端各自新增的记录都保留（'+q6.length+' 条）');

  // Q7 无编号记录不进入并集（避免凭空造号造成重复；此类记录本就不可能与本地同键）
  const q7 = api.mergeArr([{ id: 'a', _t: 1 }], [{ _t: 1, v: '无编号' }]);
  ok(q7.length === 1 && q7[0].id === 'a', '无编号记录不进入并集（无键可合并，跳过）');
}

{
  // ============ R. 存储键一致性（v1.15.9）：写入必须落到「被 load() 读取」的规范键，不得产生幽灵键 ============
  // 背景：曾有两处把数据写到了从不被读取的键——importJSON 写 save('delLog')（应为 'del'）、
  //       autoHealthCheck 写 save('stockLog')（应为 'stocklog'）→ 重启后数据/修复静默丢失。

  // R1 导入备份：删除标记写到规范键 'del'，并按「并集、同键取较晚 t」并入（不丢任何一端的删除知识）
  api.delLog = [{ id: 'old', type: 'product', t: 1 }];
  D.localStorage.removeItem('wb_wujin_delLog');
  D.__frResult = JSON.stringify({ _app: 'wujin-workbench', _v: 3, products: [{ id: 'p1', name: '电钻', unit: '个', conv: {}, stock: 5, _t: 1 }],
    cash: [], flow: [], todos: [], parties: [], ar: [], stockLog: [],
    delLog: [{ id: 'gone1', type: 'product', t: 9999 }, { id: 'gone2', type: 'flow', t: 8888 }] });
  api.importJSON({ target: { files: [{}], value: '' } });
  const r1del = api.delLog;
  ok(r1del.some(d => d.id === 'old') && r1del.some(d => d.id === 'gone1') && r1del.some(d => d.id === 'gone2'),
     '导入备份：删除标记并入（本机 1 条 + 备份 2 条，实际 ' + r1del.length + ' 条）');
  ok(D.localStorage.getItem('wb_wujin_del') !== null, '导入备份：删除标记写到规范键');
  ok(D.localStorage.getItem('wb_wujin_delLog') === null, '导入备份：不再产生幽灵键 wb_wujin_delLog');

  // R2 开机自检：对出入库明细的修复必须落到规范键 'stocklog'
  D.localStorage.removeItem('wb_wujin_stocklog'); D.localStorage.removeItem('wb_wujin_stockLog');
  api.stockLog = [{ id: 's1', pid: 'p1', type: 'in', qty: 'oops', date: TODAY }];
  api.autoHealthCheck();
  const r2 = JSON.parse(D.localStorage.getItem('wb_wujin_stocklog') || '[]');
  ok(r2.length === 1 && r2[0].qty === 0, '开机自检：出入库明细的修复写入规范键（qty 由 "oops" 修为 0，实际 ' + JSON.stringify(r2[0] && r2[0].qty) + '）');
  ok(D.localStorage.getItem('wb_wujin_stockLog') === null, '开机自检：不再产生幽灵键 wb_wujin_stockLog');

  // R3 开机自检顺手清理历史遗留的幽灵键
  D.localStorage.setItem('wb_wujin_delLog', '[]'); D.localStorage.setItem('wb_wujin_stockLog', '[]');
  api.autoHealthCheck();
  ok(D.localStorage.getItem('wb_wujin_delLog') === null && D.localStorage.getItem('wb_wujin_stockLog') === null,
     '开机自检清理历史遗留幽灵键（delLog / stockLog 均已移除）');

  // R4 静态守卫：源码中不得再出现 save('delLog' / save('stockLog' 这类写错键的调用
  ok(!/save\('delLog'/.test(html) && !/save\('stockLog'/.test(html),
     "源码静态扫描：不存在 save('delLog') / save('stockLog') 笔误键");

  // R5 导入 = 整体回退到备份时刻（v1.15.10 行为变更）：备份里活着的记录，其本机较新的删除标记被作废，
  // 否则本机较新的删除标记会在下次同步时把刚导入的记录又删掉（症状：导入成功、条数也对，重启后记录悄悄消失）
  seed();
  api.delLog = [{ id: 'p1', type: 'product', t: 9999999999999 }];
  D.__frResult = JSON.stringify({ products: [{ id: 'p1', name: '电钻', unit: '个', conv: {}, stock: 5, _t: 1 }],
    cash: [], flow: [], todos: [], parties: [], ar: [], stockLog: [], delLog: [] });
  api.importJSON({ target: { files: [{}], value: '' } });
  ok(!api.delLog.some(d => d && d.id === 'p1'), '导入备份：备份里活着的记录，其本机删除标记被作废（残留 ' + api.delLog.filter(d => d && d.id === 'p1').length + ' 条）');
  api.applyTombstones();
  ok(api.products.some(p => p.id === 'p1'), '导入备份：应用删除标记后记录仍在（导入后不再被同步删掉）');

  // R6 收款分摊：缺 paidAmount 的欠款也要分摊（旧写法 undefined<金额 恒 false → 收了钱却不销账）
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, date: TODAY }];
  api.cash = []; api.save('ar', api.ar); api.save('cash', api.cash);
  ok(api.partyBalance('pa1', 'receivable') === 100, '收款前：缺 paidAmount 的欠款计入应收（实际 ' + api.partyBalance('pa1','receivable') + '）');
  api.doCollect('pa1', 'receivable', 100);
  const r6a = api.ar.find(a => a.id === 'a1') || {};
  ok(Number(r6a.paidAmount) === 100, '收款 100 后：该笔欠款已销账（paidAmount=' + JSON.stringify(r6a.paidAmount) + '）');
  ok(api.partyBalance('pa1', 'receivable') === 0, '收款 100 后：应收清零（实际 ' + api.partyBalance('pa1','receivable') + '）');

  // R7 改名贯穿：快照变更必须打 _t（否则多设备合并时两边时间戳相同、各自保留本地，改名永不同步）
  seed();
  api.flow = [{ id: 'f1', _t: 100, pid: 'p1', pname: '旧名', spec: '', type: 'sell', qty: 1, price: 1, date: TODAY }];
  api.stockLog = [{ id: 's1', _t: 100, pid: 'p1', pname: '旧名', spec: '', type: 'in', qty: 1, unit: '个', date: TODAY }];
  api.ar = [{ id: 'a1', _t: 100, partyId: 'pa1', party: '旧客', kind: 'receivable', amount: 1, paidAmount: 0, date: TODAY }];
  api.products[0].name = '新名'; api.save('products', api.products);
  api.propagateProductRename('p1', '新名');
  ok(api.flow[0].pname === '新名' && typeof api.flow[0]._t === 'number' && api.flow[0]._t > 100,
     '商品改名：流水快照更新且打 _t（实际 ' + JSON.stringify(api.flow[0].pname) + ' / ' + api.flow[0]._t + '）');
  ok(api.stockLog[0].pname === '新名' && api.stockLog[0]._t > 100, '商品改名：台账快照更新且打 _t');
  api.parties[0].name = '新客'; api.save('parties', api.parties);
  api.propagatePartyRename('pa1', '新客');
  ok(api.ar[0].party === '新客' && api.ar[0]._t > 100, '往来改名：应收快照更新且打 _t');

  // R8 规格快照对齐：改规格后流水/台账的旧规格快照一并对齐；已一致时是空操作（幂等）
  seed();
  api.flow = [{ id: 'f1', _t: 100, pid: 'p1', pname: '电钻', spec: '旧规格', type: 'sell', qty: 1, price: 1, date: TODAY }];
  api.stockLog = [{ id: 's1', _t: 100, pid: 'p1', pname: '电钻', spec: '旧规格', type: 'in', qty: 1, unit: '个', date: TODAY }];
  api.products[0].spec = '新规格'; api.save('products', api.products);
  let r8a = false, r8b = false, r8c = false, r8err = null;
  try {
    api.alignSpecSnapshots();
    r8a = (api.flow[0].spec === '新规格' && api.flow[0]._t > 100);
    r8b = (api.stockLog[0].spec === '新规格' && api.stockLog[0]._t > 100);
    const _r8t = api.flow[0]._t; api.alignSpecSnapshots(); r8c = (api.flow[0]._t === _r8t);
  } catch (e) { r8err = (e && e.message) || String(e); }
  ok(r8a, '规格对齐：流水快照更新且打 _t' + (r8err ? ('（' + r8err + '）') : ('（实际 ' + JSON.stringify(api.flow[0].spec) + '）')));
  ok(r8b, '规格对齐：台账快照更新且打 _t' + (r8err ? ('（' + r8err + '）') : ''));
  ok(r8c, '规格对齐：已一致时不重复打 _t（幂等）' + (r8err ? ('（' + r8err + '）') : ''));

  // R9 经营分析「应收未收／应付未付」与首页同一实现（recvSum/paySum），缺 paidAmount 的记录两边都计入
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa1', party: '张三', kind: 'payable', amount: 30, date: TODAY }];
  api.cash = []; api.flow = []; api.save('ar', api.ar); api.save('cash', api.cash); api.save('flow', api.flow);
  api.renderFin();
  const r9h = $('an_fin').innerHTML;
  ok(r9h.indexOf('¥100') >= 0, '经营分析：应收未收 = ¥100（与首页同口径）');
  ok(r9h.indexOf('¥30') >= 0, '经营分析：应付未付 = ¥30');

  // R10 存货总值（按成本）唯一实现：坏库存不污染合计，且「财务」与「库存分析」两处同一数字
  seed();
  api.products[0].stock = 'oops'; api.save('products', api.products);
  let r10v = null, r10err = null;
  try { r10v = api.inventoryCost(); } catch (e) { r10err = (e && e.message) || String(e); }
  ok(r10v === 400, '存货总值：坏库存按 0 计、正常记录照常累加（100×10 坏 + 50×8 = 400，实际 ' + (r10err || r10v) + '）');
  api.renderFin();
  const r10fin = $('an_fin').innerHTML;
  ok(r10fin.indexOf('¥400') >= 0, '财务页：存货总值 = ¥400（坏记录不拖零、不出现 ¥0/¥NaN）');
  api.renderStockAna();
  ok($('an_stock').innerHTML.indexOf('¥400') >= 0, '库存分析：存货总值 = ¥400（与财务页同一实现）');

  // R11 流水分类占比：字符串金额按数字相加（旧写法 100 + '50' 拼成 "10050"）
  seed();
  api.cash = [{ id: 'c1', _t: 1, type: 'in', cat: '销售货款', amount: 100, date: TODAY },
              { id: 'c2', _t: 1, type: 'in', cat: '销售货款', amount: '50', date: TODAY }];
  api.save('cash', api.cash);
  api.renderFlowAna();
  const r11h = $('an_flow').innerHTML;
  ok(r11h.indexOf('¥150') >= 0, '流水分类占比：字符串金额按数字相加（合计 ¥150）');
  ok(r11h.indexOf('¥10,050') < 0, '流水分类占比：不再出现字符串拼接出的 ¥10,050');

  // R12 数据自检补盲区：缺类型的应收（不计入任何合计）、缺已收金额、买卖数量非法值
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', amount: 100, paidAmount: 0, date: TODAY },
            { id: 'a2', _t: 1, partyId: 'pa1', party: '李四', kind: 'receivable', amount: 50, date: TODAY }];
  api.cash = []; api.flow = []; api.save('ar', api.ar); api.save('cash', api.cash);
  ok(api.dataSelfCheck().some(i => /缺少类型字段/.test(i.t)), '自检：报出缺类型的应收（该笔不计入任何欠款合计）');
  ok(api.dataSelfCheck().some(i => /缺已收金额字段/.test(i.t)), '自检：报出缺已收金额的应收');
  api.flow = [{ id: 'f1', _t: 1, type: 'sell', pid: 'p1', pname: '电钻', qty: 'oops', price: 5, date: TODAY }];
  api.save('flow', api.flow);
  ok(api.dataSelfCheck().some(i => /买卖数量或单价为非法值/.test(i.t)), '自检：报出买卖数量为非法值');

  // R13 多地备份（容灾）包含店铺配置：灾难恢复后分类/规格/包装预设不丢
  seed();
  api.cfg.shop = '测试店'; api.save('cfg', api.cfg);
  let r13 = null, r13err = null;
  try { r13 = api.collectBackupData(); } catch (e) { r13err = (e && e.message) || String(e); }
  ok(!!r13 && !!r13.cfg && r13.cfg.shop === '测试店', '多地备份：备份内容包含店铺配置' + (r13err ? ('（' + r13err + '）') : ''));

  // R14 欠款净额最后两处裸算收敛到 arNet：缺 paidAmount 的欠款在对账单/往来明细里显示真实金额（而非 NaN→¥0）
  seed();
  api.ar = [{ id: 'a1', _t: 1, partyId: 'pa1', party: '张三', kind: 'receivable', amount: 100, date: TODAY }];
  api.cash = []; api.flow = []; api.save('ar', api.ar); api.save('cash', api.cash); api.save('flow', api.flow);
  const r14rows = api.stmtRows('pa1');
  const r14row = r14rows.filter(r => r.type === '应收')[0] || {};
  ok(r14row.amt === 100, '对账单：缺已收金额的欠款按全额计入明细（实际 ' + JSON.stringify(r14row.amt) + '）');
  ok(!/a\.amount-a\.paidAmount/.test(html), '源码静态扫描：欠款净额不再有裸算（全部走 arNet）');

  // R15 备份前向兼容提示：备份里有本版本不认识的顶层字段时如实告知（多来自更高版本）
  const r15 = api.parseImportData({ products: [{ id: 'x', name: 'a' }], someNewTable: [{ a: 1 }], anotherKey: 'v' });
  ok(r15 && Array.isArray(r15.extra) && r15.extra.indexOf('someNewTable') >= 0 && r15.extra.indexOf('anotherKey') >= 0,
     '导入：识别备份里的未知字段（实际 ' + JSON.stringify(r15 && r15.extra) + '）');
  const r15b = api.parseImportData({ products: [{ id: 'x', name: 'a' }] });
  ok(r15b && r15b.extra && r15b.extra.length === 0, '导入：常规备份不误报未知字段');
  seed();
  D.__frResult = JSON.stringify({ products: [{ id: 'p9', name: '电钻', unit: '个', conv: {}, stock: 1, _t: 1 }],
    cash: [], flow: [], todos: [], parties: [], ar: [], stockLog: [], delLog: [], futureTable: [1] });
  api.importJSON({ target: { files: [{}], value: '' } });
  ok(String(D.__lastAlert || '').indexOf('未导入') >= 0, '导入：含未知字段时提示「未导入」（实际提示：' + String(D.__lastAlert || '').slice(0, 40) + '…）');

  // R16 usage（常用置顶频次）陈旧数据清理：开机自检剔除死键；导入备份时一并作废
  seed();
  api.usage = { p: { p1: 5, dead1: 3 }, pa: { pa1: 2, deadp: 1 } };
  api.autoHealthCheck();
  ok(api.usage.p.p1 === 5 && api.usage.p.dead1 === undefined, '自检：清理已删除商品的使用频次死键（保留在用键）');
  ok(api.usage.pa.pa1 === 2 && api.usage.pa.deadp === undefined, '自检：清理已删除往来的使用频次死键');
  api.usage = { p: { p1: 5 }, pa: {} };
  D.__frResult = JSON.stringify({ products: [{ id: 'p9', name: '电钻', unit: '个', conv: {}, stock: 1, _t: 1 }],
    cash: [], flow: [], todos: [], parties: [], ar: [], stockLog: [], delLog: [] });
  api.importJSON({ target: { files: [{}], value: '' } });
  ok(Object.keys(api.usage.p).length === 0, '导入备份：本机使用频次一并作废（按新数据重新累计）');
  ok(/常用置顶频次一并作废/.test(html), '源码静态扫描：清空数据路径同样作废常用置顶频次');
}

{
  // ============ S. Service Worker 行为（v1.15.13，首次为 sw.js 建测试）============
  // 背景：非导航的同源 GET 原先无差别「缓存优先 + 写入缓存」，而「检查更新」用唯一 ?_t= 探活 →
  // 每次点击都往当前缓存写入一份数百 KB 且永不清理的副本，长期撑爆配额。
  const swSrc = fs.readFileSync('sw.js', 'utf8');
  const swCache = (swSrc.match(/const CACHE\s*=\s*'([^']+)'/) || [])[1];
  ok(swCache === 'jiancun-shell-v' + api.APP_VERSION,
     'PWA：sw.js 缓存号与版本号一致（' + swCache + ' / v' + api.APP_VERSION + '）');

  // —— mock SW 环境 ——
  const mkResp = t => ({ _text: String(t == null ? '' : t), status: 200, clone() { return mkResp(this._text); } });
  const keyOf = k => (k && typeof k === 'object' && k.url) ? k.url : String(k);
  const store = {}, putLog = [];
  const mockCaches = {
    open: () => Promise.resolve({
      put: (k, v) => { const kk = keyOf(k); store[kk] = (v && v._text); putLog.push(kk); return Promise.resolve(); },
      addAll: () => Promise.resolve(),
      match: k => Promise.resolve(store[keyOf(k)] !== undefined ? mkResp(store[keyOf(k)]) : undefined)
    }),
    keys: () => Promise.resolve([swCache]),
    delete: () => Promise.resolve(true),
    match: k => Promise.resolve(store[keyOf(k)] !== undefined ? mkResp(store[keyOf(k)]) : undefined)
  };
  const netCalls = [];
  const netBody = u => u.indexOf('?_t=') >= 0 ? 'FRESH-PROBE' : (u.indexOf('icon.svg') >= 0 ? 'ICON' : 'HTML');
  const handlers = {};
  const swSelf = {
    addEventListener: (t, fn) => { handlers[t] = fn; },
    skipWaiting: () => {}, clients: { claim: () => Promise.resolve() },
    location: { origin: 'https://app.example' }
  };
  const swCtx = {
    self: swSelf, caches: mockCaches, URL, console,
    fetch: req => { const u = keyOf(req); netCalls.push(u); return Promise.resolve(mkResp(netBody(u))); },
    Response: function (b, i) { this._text = String(b == null ? '' : b); this.status = (i && i.status) || 200; this.headers = (i && i.headers) || {}; this.clone = function () { return mkResp(this._text); }; },
    Promise, Math, JSON, Date, String, Number, Array, Object, decodeURIComponent, RegExp, Error
  };
  swCtx.globalThis = swCtx;
  vm.createContext(swCtx);
  vm.runInContext(swSrc, swCtx, { filename: 'sw-test' });
  const fire = (url, mode) => {
    let responded = null;
    handlers.fetch({ request: { url, mode: mode || 'no-cors', method: 'GET' }, respondWith: p => { responded = p; } });
    return responded;
  };

  __swDone = (async () => {
    // S2 导航请求：网络优先，并把新响应写进缓存（离线兜底靠它）
    let r = await fire('https://app.example/index.html', 'navigate');
    ok(r && r._text === 'HTML', 'SW：导航请求网络优先（拿到线上最新版）');
    ok(store['https://app.example/index.html'] === 'HTML', 'SW：导航响应写入缓存（断网可兜底）');

    // S3 检查更新探针（唯一 ?_t=）：必须走网络、且不写入缓存
    const puts0 = putLog.length;
    r = await fire('https://app.example/index.html?_t=1700000000000');
    ok(r && r._text === 'FRESH-PROBE', 'SW：带 ?_t= 的探针请求直连网络（能读到线上真实版本）');
    ok(putLog.length === puts0, 'SW：探针响应不写入缓存（每次检查不再攒一份数百 KB 副本）');

    // S4 跨源请求（Supabase / OCR / 网盘备份）：不拦截
    ok(fire('https://other.example/rest/v1/x') === null, 'SW：跨源请求不拦截（云端同步/识图/网盘备份直连）');

    // S5 白名单静态资产：仍走缓存优先
    await fire('https://app.example/icon.svg');
    const netAfter1 = netCalls.length;
    r = await fire('https://app.example/icon.svg');
    ok(r && r._text === 'ICON' && netCalls.length === netAfter1, 'SW：图标等白名单资产仍走缓存优先（第二次不再发网络请求）');
  })();
}

{
  // ============ T. 内联事件 id 转义（v1.15.14，第 4 轮 XSS 清扫的漏网点）============
  // 复现：导入一份 id 带引号的备份 → 首页商品排行渲染出 onclick="kpiProductDetail('a');alert(1);//')"
  //       → 点一下该行就执行注入代码。第 4 轮只用 esc() 转了文本内容，漏了内联事件属性里的 id。
  const evil = "a');alert(1);//";
  seed();
  D.__frResult = JSON.stringify({ products: [{ id: evil, name: '电钻', unit: '个', conv: {}, stock: 5, cost: 1, price: 2, _t: 1 }],
    cash: [], flow: [{ id: 'f1', _t: 1, type: 'sell', pid: evil, pname: '电钻', qty: 1, price: 2, date: TODAY }],
    todos: [], parties: [], ar: [], stockLog: [], delLog: [] });
  api.importJSON({ target: { files: [{}], value: '' } });
  api.switchTab('stock');   // renderAll 只渲染当前标签，先切回库存页确保表格真的重画
  const tHtml = $('stockList').innerHTML;
  ok(tHtml.indexOf(evil) < 0, '库存表：带引号的 id 不再原样进入 HTML（不再可注入）');
  ok(tHtml.indexOf("a\\')") >= 0, '库存表：id 已按 JS 字符串规则转义（且可原样取回）');
  const kpHtml = $('rankProduct').innerHTML;
  ok(kpHtml.indexOf(evil) < 0, '首页商品排行：带引号的 id 不再原样进入 onclick');
  ok(kpHtml.indexOf("kpiProductDetail('a\\')") >= 0, '首页商品排行：onclick 内 id 已转义');
  // 正常 id 不受影响（回归保护：不能为了安全把正常行为改坏）
  seed();
  api.flow = [{ id: 'f1', _t: 1, type: 'sell', pid: 'p1', pname: '电钻', spec: '', partyId: 'pa1', party: '张三',
    settle: 'cash', date: TODAY, qty: 1, price: 10, unitName: '个', unitFactor: 1, stockDelta: 1, linkCashId: null, linkArIds: [] }];
  api.save('products', api.products); api.save('flow', api.flow); api.save('cash', api.cash);
  api.renderAll(); api.switchTab('stock');
  ok($('stockList').innerHTML.indexOf("editProduct('p1')") >= 0, '库存表：正常 id 的 onclick 与原行为一致');
  ok($('stockList').innerHTML.indexOf('id="tr_prod_p1"') >= 0, '库存表：正常 id 的行 id 与原行为一致');
  ok($('rankProduct').innerHTML.indexOf("kpiProductDetail('p1')") >= 0, '首页商品排行：正常 id 的 onclick 与原行为一致');
  // 静态扫描：不得再有未包裹的内联事件插值
  // v1.15.24 扩容：原哨兵只查「首参 + ${} 模板」形态，第 25 轮实测漏了「任意参数位模板」
  // 与「'+x+' 拼接」两种形态（29 处，含 4 处死按钮）；现四形态全锁（白名单同 _verify_inline.js C1）：
  //   jsStr() 包裹 / it.fn·onClick 整体处理器 / this.getAttribute 运行时取值 / 数字索引（gi/i/lp/buy/wh/rt/p/pages）
  ok(!/on[a-z]+="[^"]*\$\{(?!jsStr\(|it\.fn|(?:i|buy|wh|rt|p|pages)\})[a-z$][\w$]*(?:\.[\w$]+)?\}/.test(html),
     '源码静态扫描：内联事件模板插值全部包裹 jsStr()/整体处理器/数字');
  ok(!/on(?:click|change|input)="[^"]*'\+(?!jsStr\(|this\.|onClick\+|(?:gi|i|lp)\+)[\w$]/.test(html),
     '源码静态扫描：内联事件拼接插值全部包裹 jsStr()（v1.15.24 新增锁，历史从未清扫）');
}

{
  // ============ U. 筛选条件指向已删除选项（v1.15.15）============
  // 复现：流水按商品「电钻」筛选 → 删除该商品 → 下拉回落成「全部商品」，
  // 但 flowFilter.pid 仍是「电钻」→ 列表仍被过滤（少一笔），界面却显示「全部」，用户无从判断。
  // 库存按分类筛选同理：分类下商品被清空后列表显示 0 条却写着「全部分类」，像数据丢了一样。
  seed();
  api.flow = [{ id: 'f1', _t: 1, type: 'sell', pid: 'p1', pname: '电钻', spec: '', partyId: 'pa1', party: '张三',
    settle: 'cash', date: TODAY, qty: 1, price: 10, unitName: '个', unitFactor: 1, stockDelta: -1, linkCashId: null, linkArIds: [] },
    { id: 'f2', _t: 1, type: 'sell', pid: 'p2', pname: '螺母', spec: '', partyId: 'pa1', party: '张三',
      settle: 'cash', date: TODAY, qty: 2, price: 5, unitName: '个', unitFactor: 1, stockDelta: -2, linkCashId: null, linkArIds: [] }];
  api.save('products', api.products); api.save('flow', api.flow); api.save('parties', api.parties);

  // U1 被筛商品已删 → 筛选条件一并清除
  $('flt_pid').value = '电钻';
  api.flowFilter = { pid: '电钻', partyId: '', from: '', to: '' };
  ok(api.getFlowList().length === 1, 'U 铺垫：按商品筛选后只剩该商品的流水（1 笔）');
  api.products = api.products.filter(p => p.id !== 'p1'); api.save('products', api.products);
  api.fillFlowFilter();
  ok(api.flowFilter.pid === '', '流水筛选：被筛商品已删 → 筛选条件一并清除（不再「界面显示全部却仍过滤」）');
  ok(api.getFlowList().length === 2, '流水筛选：清除后历史流水全部可见（2 笔）');

  // U2 选项仍存在 → 不被误清（回归保护）
  seed(); api.save('products', api.products);
  $('flt_pid').value = '电钻';
  api.flowFilter = { pid: '电钻', partyId: '', from: '', to: '' };
  api.fillFlowFilter();
  ok(api.flowFilter.pid === '电钻', '流水筛选：选项仍存在时筛选条件不被误清');

  // U3 被筛往来已删 → 同上
  $('flt_party').value = 'pa1';
  api.flowFilter = { pid: '', partyId: 'pa1', from: '', to: '' };
  api.parties = api.parties.filter(p => p.id !== 'pa1'); api.save('parties', api.parties);
  api.fillFlowFilter();
  ok(api.flowFilter.partyId === '', '流水筛选：被筛往来已删 → 筛选条件一并清除');

  // U4 库存分类：该分类下商品被清空 → 清除筛选（否则显示 0 条却写着「全部分类」）
  seed();
  api.products = api.products.map(p => Object.assign({}, p, { cat: p.id === 'p1' ? '五金' : '' }));
  api.save('products', api.products);
  $('stCat').value = '五金';
  api.stockFilter = { q: '', cat: '五金', status: '' };
  api.renderStock();
  ok(api.getStockList().length === 1, 'U 铺垫：按分类筛选后只剩该分类商品（1 个）');
  api.products = api.products.map(p => Object.assign({}, p, { cat: '' }));   // 分类被删 → 商品分类清空
  api.save('products', api.products);
  api.renderStock();
  ok(api.stockFilter.cat === '', '库存筛选：该分类下商品已清空 → 筛选条件一并清除');
  ok(api.getStockList().length === 2, '库存筛选：清除后全部商品可见（2 个）');
}

// 等异步段（Service Worker 测试）跑完再汇总并退出——否则进程提前退出，它们的断言一条都不会执行
__swDone.catch(function (e) { ok(false, 'SW 段执行异常：' + ((e && e.message) || e)); })
  .then(function () {
    console.log('\n==== 二轮对抗模糊 结果：' + pass + ' PASS / ' + fail + ' FAIL ====');
    process.exit(fail ? 1 : 0);
  });
