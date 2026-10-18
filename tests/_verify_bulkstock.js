// 专项：批量删除「同步回滚库存」与「撤销上次修改」在编辑后手工台账（带包装系数）上的口径
// 背景：v1.15.16 把对账/编辑/预览/单删四处收敛到 slBaseFactor（基准单位），
// 但批量删除的预览(stockAdjDelta)与提交(commitBulkDelete.adj)仍裸用 r.qty；
// editStockLog 编辑手工明细改单位后，记录 qty 即包装单位且自带 unitFactor（如 3 盒=36 个）。
// 另：undoLast 还原 sl 记录时不还原 unitFactor（flow 分支还原了）→ 撤销后 qty 与因子不一致。
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
  get delLog(){return delLog}, set delLog(v){delLog=v},
  slBaseFactor, stockAdjDelta, commitBulkDelete, undoLast, delStockLog,
  renderAll, saveAllLocal, tomb
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('bulkstock');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 种子：p1 电钻 1盒=12个，库存 100。
// m1/m2 = 编辑过单位的手工明细（qty 为包装单位、自带 unitFactor=12）；
// m3 = adj 新写风格（qty 即基准、因子 1）；m4 = 买卖生成的明细（带 fid）。
function seed(){
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{'盒':12},stock:100,cost:8,price:10,cat:'',spec:'',safe:0,_t:1}];
  api.flow=[{id:'f1',type:'buy',pid:'p1',pname:'电钻',qty:2,price:100,unitFactor:12,unitName:'盒',date:'2026-09-01',settle:'cash',partyId:'',linkArIds:[],_t:1}];
  api.stockLog=[
    {id:'m1',pid:'p1',pname:'电钻',type:'in', src:'manual',qty:3,unit:'盒',unitFactor:12,date:'2026-10-01',_t:1},
    {id:'m2',pid:'p1',pname:'电钻',type:'out',src:'manual',qty:2,unit:'盒',unitFactor:12,date:'2026-10-02',_t:1},
    {id:'m3',pid:'p1',pname:'电钻',type:'in', src:'manual',qty:5,unit:'个',unitFactor:1, date:'2026-10-03',_t:1},
    {id:'m4',pid:'p1',pname:'电钻',type:'in', src:'buy',   qty:2,unit:'盒',unitFactor:12,fid:'f1',date:'2026-09-01',_t:1}
  ];
  api.delLog=[];
}

console.log('批量删除库存回滚 · 编辑后因子 · 撤销还原专项\n');

// 0. 种子自校验（第 17 轮教训：先证明种子真是所想，避免假红）
seed();
ok(api.slBaseFactor(api.stockLog[0])===12&&api.slBaseFactor(api.stockLog[2])===1,
   '种子自校验：m1(3盒)系数=12、m3(5个)系数=1');

// A. 预览：删「入库 3 盒」→ 库存应减 36
seed();
ok(api.stockAdjDelta([api.stockLog[0]]).eff['p1'].delta===-36,
   '预览：删入库 3 盒 → 库存减 36（编辑后手工明细按基准折算）');

// B. 预览：删「出库 2 盒」→ 库存应加 24
seed();
ok(api.stockAdjDelta([api.stockLog[1]]).eff['p1'].delta===24,
   '预览：删出库 2 盒 → 库存加 24');

// C. 预览：三条混删（-36 +24 -5 = -17）
seed();
ok(api.stockAdjDelta([api.stockLog[0],api.stockLog[1],api.stockLog[2]]).eff['p1'].delta===-17,
   '预览：混删 3盒入+2盒出+5个入 → 净减 17');

// D. 买卖生成的明细不进「调整库存」预览（仅作用手工登记）
seed();
ok(api.stockAdjDelta([api.stockLog[3]]).hasImpact===false,
   '预览：带 fid 的买卖明细不进入库存回滚预览');

// E. 提交：删入库 3 盒 → 100-36=64
seed();
api.commitBulkDelete('stocklog',['m1'],[api.stockLog[0]],{adj:true});
ok(api.products[0].stock===64&&!api.stockLog.find(s=>s.id==='m1'),
   '提交：批量删入库 3 盒并回滚 → 库存 100→64，记录已删');

// F. 提交：删出库 2 盒 → 100+24=124
seed();
api.commitBulkDelete('stocklog',['m2'],[api.stockLog[1]],{adj:true});
ok(api.products[0].stock===124,
   '提交：批量删出库 2 盒并回滚 → 库存 100→124');

// G. 提交：三条混删 → 100-17=83
seed();
api.commitBulkDelete('stocklog',['m1','m2','m3'],api.stockLog.slice(0,3),{adj:true});
ok(api.products[0].stock===83,
   '提交：混删三条并回滚 → 库存 100→83');

// H. 提交：adj 对带 fid 明细不动库存（守卫锁定）
seed();
api.commitBulkDelete('stocklog',['m4'],[api.stockLog[3]],{adj:true});
ok(api.products[0].stock===100&&!api.stockLog.find(s=>s.id==='m4'),
   '提交：批量删买卖明细（adj 开）→ 库存不动、记录已删');

// I. 预览与提交一致（预览错=用户看到错数字，必须同源）
seed();
const dI=api.stockAdjDelta(api.stockLog.slice(0,3));
const beforeI=api.products[0].stock;
api.commitBulkDelete('stocklog',['m1','m2','m3'],api.stockLog.slice(0,3),{adj:true});
ok((beforeI-api.products[0].stock)===-dI.eff['p1'].delta,
   '预览与提交一致：预览净减与实际库存变化相同');

// J. 撤销：把「36 个(系数1)」编辑成「3 盒(系数12)」后撤销 → qty/unit/unitFactor 三者一起回
seed();
api.stockLog[0]._hist=[{t:2,ch:[{f:'数量',from:'36',to:'3'},{f:'单位',from:'个',to:'盒'}],
  snap:{sl:{id:'m1',qty:36,unit:'个',date:'2026-10-01',price:0,unitFactor:1},stockId:'p1',stock:136,stockAfter:100}}];
api.undoLast('stocklog','m1',true);
ok(api.stockLog[0].qty===36&&api.stockLog[0].unit==='个'&&api.stockLog[0].unitFactor===1,
   '撤销：数量回 36、单位回「个」、包装系数回 1（三者一致）');
ok(api.slBaseFactor(api.stockLog[0])===1,
   '撤销后下游口径：该明细按 36 个基准计算');

// K. 撤销：老快照没有 unitFactor 字段时，不得把现有系数抹掉（守卫锁定）
seed();
api.stockLog[1]._hist=[{t:2,ch:[{f:'数量',from:'24',to:'2'},{f:'单位',from:'个',to:'盒'}],
  snap:{sl:{id:'m2',qty:24,unit:'个',date:'2026-10-02',price:0}}}];
api.undoLast('stocklog','m2',true);
ok(api.stockLog[1].qty===24&&api.stockLog[1].unit==='个'&&api.stockLog[1].unitFactor===12,
   '撤销：老快照缺 unitFactor → 保留现值 12，不被抹成 undefined');

// L. 撤销：流水分支仍还原 unitFactor（既有正确行为锁定）
seed();
api.flow[0]._hist=[{t:2,ch:[],snap:{flow:{id:'f1',qty:3,price:100,unitFactor:12,unitName:'盒'}}}];
api.undoLast('flow','f1',true);
ok(api.flow[0].qty===3&&api.flow[0].unitFactor===12,
   '撤销：流水分支还原数量与包装系数');

// M. 不勾「同步回滚库存」时库存不动（守卫锁定）
seed();
api.commitBulkDelete('stocklog',['m1'],[api.stockLog[0]],{adj:false});
ok(api.products[0].stock===100&&!api.stockLog.find(s=>s.id==='m1'),
   '提交：未开库存回滚 → 只删记录、库存不动');

// N. 单条删除路径口径一致（v1.15.16 已收敛，锁定防回退）
seed();
api.delStockLog('m1');
D.document.getElementById('sl_adj').checked=true;
D.__confirm();
ok(api.products[0].stock===64,
   '单条删除（勾选调整库存）：入库 3 盒 → 库存 100→64，与批量删一致');

console.log('\n==== 批量删库存回滚与撤销因子专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
process.exit(fail?1:0);
