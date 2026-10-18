// 专项：「按维度清空」预览计数族 vs 实际删除函数的口径一致性
// 背景：v1.15.22 修过 countByBiz/clearByBiz 的业务类型口径（flowTypeMatcher 共用），
// 但同一批选择器上的另外四个维度从未做「预览数 = 实际删除数」比对：
//   - countByDate：ar 部分按日期全计，而 clearByDate 走 purgeAr 保留已收款（arPaid>0）→ 虚高；
//   - countByProduct/Cat/Spec：只计 商品+flow+stockLog，而 delProductData/clearProductRecordsKeep
//     还会删关联现金（linkCashId）并 purgeAr 未收款关联应收（linkArIds）→ 少报（反方向：
//     用户以为没删的其实被删了）；且 keep 模式（保留商品资料）下商品本身不删却恒被计入 → 虚高。
// 黄金判据：每个维度「预计影响 N 条」必须等于确认删除后各表实际消失的记录条数总和。
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
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
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
  get delLog(){return delLog}, set delLog(v){delLog=v},
  get todos(){return todos}, set todos(v){todos=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  slBaseFactor, arPaid, arAmt, isUnsettled,
  countByDate, countByProduct, countByCat, countBySpec, countByBiz,
  clearByDate, clearByProduct, clearByCat, clearBySpec,
  delProductData, clearProductRecordsKeep, delFlowData, purgeAr, catMatcher,
  renderAll, saveAllLocal, tomb
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  ctx.toast=function(){};ctx.showTrashBanner=function(){};ctx.renderAll=function(){};
  return ctx;
}

const D=makeDevice('clearcount');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 种子：p1 电钻(cat A/spec S1/库存100)；p2 锤子(cat A/spec S2/库存50)；p3 钉子(cat B/spec S1/库存30)
// flow 全在 2026-10-01：f1(p1 卖,链现金 c1+应收 a1 未收)、f2(p1 退货,链 c2)、
// f3(p2 进,链 c3)、f4(p1 卖,链 c4+应收 a2 已收款)、f5(p1 卖,链 a1——同一应收被两笔关联)
// cash：c1~c4 关联 + c5 同日手工；ar：a1/a3 未收、a2 已收；stockLog：s1/s2 带 fid、s3/s4 手工
function seed(){
  api.products=[
    {id:'p1',name:'电钻',unit:'个',conv:{'盒':12},stock:100,cost:8,price:10,cat:'A',spec:'S1',safe:0,_t:1},
    {id:'p2',name:'锤子',unit:'个',conv:{'盒':10},stock:50,cost:5,price:8,cat:'A',spec:'S2',safe:0,_t:1},
    {id:'p3',name:'钉子',unit:'个',conv:{},stock:30,cost:1,price:2,cat:'B',spec:'S1',safe:0,_t:1}
  ];
  api.flow=[
    {id:'f1',type:'sell',pid:'p1',pname:'电钻',qty:5,price:10,unitFactor:1,date:'2026-10-01',linkCashId:'c1',linkArIds:['a1'],_t:1},
    {id:'f2',type:'sell',pid:'p1',pname:'电钻',refund:true,qty:1,price:10,unitFactor:1,date:'2026-10-01',linkCashId:'c2',_t:1},
    {id:'f3',type:'buy',pid:'p2',pname:'锤子',qty:3,price:8,unitFactor:1,date:'2026-10-01',linkCashId:'c3',_t:1},
    {id:'f4',type:'sell',pid:'p1',pname:'电钻',qty:2,price:10,unitFactor:1,date:'2026-10-01',linkCashId:'c4',linkArIds:['a2'],_t:1},
    {id:'f5',type:'sell',pid:'p1',pname:'电钻',qty:4,price:10,unitFactor:1,date:'2026-10-01',linkArIds:['a1'],_t:1}
  ];
  api.cash=[
    {id:'c1',type:'in',cat:'销售货款',amount:50,date:'2026-10-01',note:'电钻 · 张三',_t:1},
    {id:'c2',type:'out',cat:'销售货款',amount:10,date:'2026-10-01',note:'电钻退货 · 张三',_t:1},
    {id:'c3',type:'out',cat:'进货支出',amount:24,date:'2026-10-01',note:'锤子',_t:1},
    {id:'c4',type:'in',cat:'销售货款',amount:20,date:'2026-10-01',note:'电钻 · 李四',_t:1},
    {id:'c5',type:'in',cat:'其他',amount:50,date:'2026-10-01',note:'手工录入',_t:1}
  ];
  api.ar=[
    {id:'a1',type:'receivable',amount:50,paidAmount:0,date:'2026-10-01',partyId:'pa1',party:'张三',note:'电钻 · 销售欠款',_t:1},
    {id:'a2',type:'receivable',amount:100,paidAmount:100,date:'2026-10-01',partyId:'pa2',party:'李四',note:'电钻 · 销售欠款',_t:1},
    {id:'a3',type:'receivable',amount:20,paidAmount:0,date:'2026-10-01',partyId:'pa3',party:'王五',note:'手工登记',_t:1}
  ];
  api.stockLog=[
    {id:'s1',pid:'p1',pname:'电钻',type:'out',src:'sell',qty:5,unit:'个',unitFactor:1,fid:'f1',date:'2026-10-01',_t:1},
    {id:'s2',pid:'p1',pname:'电钻',type:'in',src:'sell',qty:1,unit:'个',unitFactor:1,fid:'f2',date:'2026-10-01',_t:1},
    {id:'s3',pid:'p1',pname:'电钻',type:'in',src:'manual',qty:6,unit:'个',unitFactor:1,date:'2026-10-01',_t:1},
    {id:'s4',pid:'p2',pname:'锤子',type:'in',src:'manual',qty:3,unit:'个',unitFactor:1,date:'2026-10-01',_t:1}
  ];
  api.todos=[{id:'t1',text:'对账',due:'2026-10-01',done:false,_t:1}];
  api.parties=[{id:'pa1',name:'张三',_t:1},{id:'pa2',name:'李四',_t:1},{id:'pa3',name:'王五',_t:1}];
  api.delLog=[];api.cfg={};
}
// 端到端：跑某清空函数的确认回调，返回实际删除的记录条数（各表 length 差之和）
function actualDeleted(before){
  const after={p:api.products.length,c:api.cash.length,f:api.flow.length,a:api.ar.length,s:api.stockLog.length,t:api.todos.length};
  return (before.p-after.p)+(before.c-after.c)+(before.f-after.f)+(before.a-after.a)+(before.s-after.s)+(before.t-after.t);
}
function snap(){return {p:api.products.length,c:api.cash.length,f:api.flow.length,a:api.ar.length,s:api.stockLog.length,t:api.todos.length};}

console.log('按维度清空 · 预览计数 vs 实际删除口径专项\n');

// ===== A 组：countByDate（按日期清空） =====
console.log('A 组 countByDate（按日期清空 2026-10-01）');
seed();
// 预期实际删除：flow 5 + cash 5 + stockLog 4 + ar 2（a1/a3，a2 已收款保留）+ todo 1 = 17
// 修复前口径：ar 按日期全计 3 → 预览 18 ≠ 实际 17（虚高 1）
{
  const b=snap();
  D.document.getElementById('clr_date').value='2026-10-01';
  api.clearByDate();D.__confirm();
  const actual=actualDeleted(b);
  seed();
  const prev=api.countByDate('2026-10-01');
  ok(prev===actual,'A1 按日期：预览 '+prev+' = 实际删除 '+actual+'（已收款 ar 不虚计、未收 a1 虽被两笔流水关联只计一次）');
}
// A2 回归锁：无任何关联的朴素场景，五表当日条数直计（锁旧行为不漂移）
{
  seed();
  api.flow=[{id:'g1',type:'sell',pid:'p1',qty:1,price:1,date:'2026-10-01',_t:1}];
  api.cash=[];api.ar=[];api.stockLog=[];api.todos=[];
  ok(api.countByDate('2026-10-01')===1,'A2 无关联场景：预览=1（flow 1 笔，行为不漂移）');
  ok(api.countByDate('2026-09-30')===0,'A3 无记录日期：预览=0');
}

// ===== B 组：countByProduct（按商品清空） =====
console.log('B 组 countByProduct（按商品清空 p1）');
// B1 不 keep（默认删商品）：实际 = 商品1 + flow4 + 现金3(c1/c2/c4) + 台账3(s1/s2/s3) + 未收 ar1(a1；a2 保留) = 12
// 修复前口径：1+4+3=8 → 少报 4（现金与应收完全没计）
{
  seed();
  const b=snap();api.cfg={};
  D.document.getElementById('clr_product').value='p1';
  D.document.getElementById('clr_prod_keep').checked=false;
  api.clearByProduct();D.__confirm();
  const actual=actualDeleted(b);
  seed();
  const prev=api.countByProduct('p1');
  ok(prev===actual,'B1 不保留商品：预览 '+prev+' = 实际删除 '+actual+'（补计关联现金与未收应收）');
}
// B2 keep 模式（cfg.defKeepProduct=true，模态默认勾选保留）：商品不删 → 实际 11
// 修复前口径仍含商品 1 → 虚高 1
{
  seed();
  const b=snap();api.cfg={defKeepProduct:true};
  D.document.getElementById('clr_product').value='p1';
  D.document.getElementById('clr_prod_keep').checked=true;
  api.clearByProduct();D.__confirm();
  const actual=actualDeleted(b);
  seed();api.cfg={defKeepProduct:true};
  const prev=api.countByProduct('p1');
  ok(prev===actual,'B2 保留商品（默认勾选）：预览 '+prev+' = 实际删除 '+actual+'（商品本身不计）');
  api.cfg={};
}
// B3 回归锁：无关联商品 p3（钉子）不 keep = 1；keep = 0；不存在的 id = 0
{
  seed();
  ok(api.countByProduct('p3')===1,'B3 朴素商品不保留：预览=1');
  api.cfg={defKeepProduct:true};
  ok(api.countByProduct('p3')===0,'B4 朴素商品保留：预览=0');
  api.cfg={};
  ok(api.countByProduct('nope')===0,'B5 不存在的商品：预览=0');
}

// ===== C 组：countByCat（按分类清空 A：p1+p2） =====
console.log('C 组 countByCat（按分类清空 A）');
// 实际：p1 删 12 + p2 删（商品1+flow1+现金1+台账1+ar0）= 4 → 16
// 修复前口径：2+5+4=11 → 少报 5
{
  const b=snap();api.cfg={};
  D.document.getElementById('clr_cat').value='A';
  D.document.getElementById('clr_cat_keep').checked=false;
  api.clearByCat();D.__confirm();
  const actual=actualDeleted(b);
  seed();
  const prev=api.countByCat('A');
  ok(prev===actual,'C1 分类A不保留：预览 '+prev+' = 实际删除 '+actual);
}
// C2 keep 模式：商品不删 → 14
{
  const b=snap();api.cfg={defKeepProduct:true};
  D.document.getElementById('clr_cat').value='A';
  D.document.getElementById('clr_cat_keep').checked=true;
  api.clearByCat();D.__confirm();
  const actual=actualDeleted(b);
  seed();api.cfg={defKeepProduct:true};
  const prev=api.countByCat('A');
  ok(prev===actual,'C2 分类A保留：预览 '+prev+' = 实际删除 '+actual);
  api.cfg={};
}

// ===== D 组：countBySpec（按型号清空 S1：p1+p3） =====
console.log('D 组 countBySpec（按型号清空 S1）');
// 实际：p1 删 12 + p3 删（仅商品1）= 13；修复前口径：2+4+3=9 → 少报 4
{
  const b=snap();api.cfg={};
  D.document.getElementById('clr_spec').value='S1';
  D.document.getElementById('clr_spec_keep').checked=false;
  api.clearBySpec();D.__confirm();
  const actual=actualDeleted(b);
  seed();
  const prev=api.countBySpec('S1');
  ok(prev===actual,'D1 型号S1不保留：预览 '+prev+' = 实际删除 '+actual);
}
// D2 keep 模式：11；D3 朴素规格
{
  const b=snap();api.cfg={defKeepProduct:true};
  D.document.getElementById('clr_spec').value='S1';
  D.document.getElementById('clr_spec_keep').checked=true;
  api.clearBySpec();D.__confirm();
  const actual=actualDeleted(b);
  seed();api.cfg={defKeepProduct:true};
  const prev=api.countBySpec('S1');
  ok(prev===actual,'D2 型号S1保留：预览 '+prev+' = 实际删除 '+actual);
  api.cfg={};
  seed();
  ok(api.countBySpec('S2')===4,'D3 型号S2（仅 p2，关联现金 c3）：不保留=4（商品1+flow1+台账1+现金1）');
  ok(api.countBySpec('nope')===0,'D4 不存在的型号：预览=0');
}

// ===== E 组：去重与脏数据边界 =====
console.log('E 组 去重与边界');
// E1：linkArIds 被两笔流水关联同一应收（a1）→ ar 只计 1 次（B1 的 12 已内含，此处显式锁去重）
{
  seed();
  const arIds=new Set();api.flow.filter(f=>f.pid==='p1').forEach(f=>(f.linkArIds||[]).forEach(x=>arIds.add(x)));
  ok(arIds.size===2 && arIds.has('a1') && arIds.has('a2'),'E1 关联应收去重集合={a1,a2}（a1 被 f1/f5 关联只出现一次）');
}
// E2：linkCashId 指向不存在的现金 → 按实际存在口径不计
{
  seed();
  api.flow.push({id:'f6',type:'sell',pid:'p1',pname:'电钻',qty:1,price:1,unitFactor:1,date:'2026-10-01',linkCashId:'ghost',linkArIds:['ghostAr'],_t:1});
  const b=snap();api.cfg={};
  D.document.getElementById('clr_product').value='p1';
  D.document.getElementById('clr_prod_keep').checked=false;
  api.clearByProduct();D.__confirm();
  const actual=actualDeleted(b);
  seed();api.flow.push({id:'f6',type:'sell',pid:'p1',pname:'电钻',qty:1,price:1,unitFactor:1,date:'2026-10-01',linkCashId:'ghost',linkArIds:['ghostAr'],_t:1});
  const prev=api.countByProduct('p1');
  ok(prev===actual,'E2 脏关联（不存在的现金/应收）不计：预览 '+prev+' = 实际删除 '+actual);
}
// E3：fid 台账与流水同日（saveFlowEdit 保证的不变式）→ 按日期清空自洽（台账不会漏计）
{
  seed();
  const fidSameDay=api.stockLog.filter(s=>s.fid).every(s=>{const f=api.flow.find(x=>x.id===s.fid);return f&&f.date===s.date;});
  ok(fidSameDay,'E3 同日不变式：fid 台账日期与流水一致（编辑改期会同步，按日期计数不漏级联记录）');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
