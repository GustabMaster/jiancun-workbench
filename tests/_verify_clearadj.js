// 专项：按日期 / 按业务类型清空时「同时调整相关商品库存」的包装单位口径
// 背景：v1.15.16 把对账/编辑/预览/单删收敛到 slBaseFactor（基准单位），v1.15.18 补齐批量删除两处，
// 但「按日期清空」(clearByDate) 与「按业务类型清空」(clearByBiz) 的勾选预览与提交仍裸用 r.qty。
// editStockLog 编辑手工明细改单位后，记录 qty 即包装单位且自带 unitFactor（如 3 盒=36 个）：
// 勾选调整库存后仅冲回 3 个，库存凭空多 33；且预览同源同错，用户看到的就是错数字。
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
  get todos(){return todos}, set todos(v){todos=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  slBaseFactor, clearByDate, clearByBiz, delStockLog,
  renderAll, saveAllLocal, tomb
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('clearadj');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 种子：p1 电钻 1盒=12个 库存100（分类A）；p2 锤子 1盒=10个 库存50（分类B）。
// m1/m2 = 编辑过单位的手工明细（qty 为包装单位、自带 unitFactor）；
// m3 = adj 新写风格（qty 即基准、因子 1）；m4 = 买卖生成的明细（带 fid，不进库存回滚）；
// m5 = 分类B 的手工明细，用于「按业务类型+分类」过滤。
function seed(){
  api.products=[
    {id:'p1',name:'电钻',unit:'个',conv:{'盒':12},stock:100,cost:8,price:10,cat:'A',spec:'',safe:0,_t:1},
    {id:'p2',name:'锤子',unit:'个',conv:{'盒':10},stock:50,cost:5,price:8,cat:'B',spec:'',safe:0,_t:1}
  ];
  api.flow=[];api.cash=[];api.ar=[];api.todos=[];api.delLog=[];
  api.stockLog=[
    {id:'m1',pid:'p1',pname:'电钻',type:'in', src:'manual',qty:3,unit:'盒',unitFactor:12,date:'2026-10-01',_t:1},
    {id:'m2',pid:'p1',pname:'电钻',type:'out',src:'manual',qty:2,unit:'盒',unitFactor:12,date:'2026-10-02',_t:1},
    {id:'m3',pid:'p1',pname:'电钻',type:'in', src:'manual',qty:5,unit:'个',unitFactor:1, date:'2026-10-01',_t:1},
    {id:'m4',pid:'p1',pname:'电钻',type:'in', src:'buy',   qty:2,unit:'盒',unitFactor:12,fid:'f1',date:'2026-10-01',_t:1},
    {id:'m5',pid:'p2',pname:'锤子',type:'in', src:'manual',qty:4,unit:'盒',unitFactor:10,date:'2026-10-05',_t:1}
  ];
}

console.log('按日期/按业务类型清空 · 库存回滚包装口径专项\n');

// 0. 种子自校验（第 17 轮教训：先证明种子真是所想，避免假红）
seed();
ok(api.slBaseFactor(api.stockLog[0])===12&&api.slBaseFactor(api.stockLog[1])===12
   &&api.slBaseFactor(api.stockLog[2])===1&&api.slBaseFactor(api.stockLog[4])===10,
   '种子自校验：m1/m2 系数=12、m3 系数=1、m5 系数=10');

// A. 按日期清空 · 预览：3 盒入 + 5 个入 → 电钻 100 → 59（减 41）
seed();
D.document.getElementById('clr_date').value='2026-10-01';
D.document.getElementById('clr_date_adj').checked=true;
api.clearByDate();
const bodyA=D.__modal&&D.__modal.bodyHtml||'';
ok(/59/.test(bodyA)&&/减\s*41/.test(bodyA),
   '预览：按日期清空 10-01 → 预览文案含「100 → 59（减41）」（3 盒按 36 折算）');

// B. 按日期清空 · 提交：库存 100→59；当日明细已删、次日/分类B 明细保留
seed();
D.document.getElementById('clr_date').value='2026-10-01';
D.document.getElementById('clr_date_adj').checked=true;
api.clearByDate();
D.__confirm();
const p1=api.products.find(p=>p.id==='p1'),p2=api.products.find(p=>p.id==='p2');
ok(p1.stock===59&&p2.stock===50,
   '提交：按日期清空 10-01 并回滚 → 电钻 100→59（-36-5），锤子不动');
ok(!api.stockLog.find(s=>s.id==='m1')&&!api.stockLog.find(s=>s.id==='m3')&&!api.stockLog.find(s=>s.id==='m4')
   &&api.stockLog.find(s=>s.id==='m2')&&api.stockLog.find(s=>s.id==='m5'),
   '提交：当日三条明细已删，次日(m2)与 10-05(m5) 明细保留');

// C. 按日期清空 · 不勾「同时调整库存」→ 库存不动（守卫锁定）
seed();
D.document.getElementById('clr_date').value='2026-10-01';
D.document.getElementById('clr_date_adj').checked=false;
api.clearByDate();
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===100&&!api.stockLog.find(s=>s.id==='m1'),
   '守卫：未勾选调整库存 → 只删记录、库存不动');

// D. 按业务类型清空 · 预览：入库 → 电钻 100 → 59
seed();
D.document.getElementById('clr_biz').value='stockLog:in';
D.document.getElementById('clr_biz_cat').value='';
D.document.getElementById('clr_biz_adj').checked=true;
api.clearByBiz();
const bodyD=D.__modal&&D.__modal.bodyHtml||'';
ok(/59/.test(bodyD)&&/减\s*41/.test(bodyD),
   '预览：按业务类型清空「入库」→ 预览文案含「100 → 59（减41）」');

// E. 按业务类型清空 · 提交（全分类）：电钻 100→59，锤子 50→10
seed();
D.document.getElementById('clr_biz').value='stockLog:in';
D.document.getElementById('clr_biz_cat').value='';
D.document.getElementById('clr_biz_adj').checked=true;
api.clearByBiz();
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===59&&api.products.find(p=>p.id==='p2').stock===10,
   '提交：按业务类型清空「入库」并回滚 → 电钻 100→59、锤子 50→10（4 盒按 40 折算）');

// F. 按业务类型清空 · 分类过滤：只清 A 类 → B 类商品与明细不动
seed();
D.document.getElementById('clr_biz').value='stockLog:in';
D.document.getElementById('clr_biz_cat').value='A';
D.document.getElementById('clr_biz_adj').checked=true;
api.clearByBiz();
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===59&&api.products.find(p=>p.id==='p2').stock===50
   &&api.stockLog.find(s=>s.id==='m5'),
   '提交：按业务类型+分类A 清空 → 仅电钻回滚，锤子与 m5 保留');

// G. fid 守卫：买卖生成的明细（m4）不进库存回滚
seed();
D.document.getElementById('clr_biz').value='stockLog:in';
D.document.getElementById('clr_biz_cat').value='';
D.document.getElementById('clr_biz_adj').checked=true;
api.clearByBiz();
D.__confirm();
// 若 m4 被误计入，电钻会变成 100-36-5-24=35；正确为 59
ok(api.products.find(p=>p.id==='p1').stock===59,
   '守卫：带 fid 的买卖明细不计入库存回滚（未被多减 24）');

// H. 预览与提交一致（预览错=用户看到错数字，必须同源）
seed();
D.document.getElementById('clr_date').value='2026-10-01';
D.document.getElementById('clr_date_adj').checked=true;
api.clearByDate();
const bodyH=D.__modal&&D.__modal.bodyHtml||'';
D.__confirm();
const afterH=api.products.find(p=>p.id==='p1').stock;
ok(afterH===59&&new RegExp('删除后\\s*'+afterH).test(bodyH),
   '一致：预览「删除后」数字与提交后的实际库存相同（'+afterH+'）');

// I. 跨路径口径一致：单条删除(m1) 与 按日期清空(余下 m3) 结果相同
seed();
api.delStockLog('m1');
D.document.getElementById('sl_adj').checked=true;
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===64,
   '前置：单条删 m1（3 盒入）并回滚 → 库存 100→64');
D.document.getElementById('clr_date').value='2026-10-01';
D.document.getElementById('clr_date_adj').checked=true;
api.clearByDate();
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===59,
   '一致：再按日期清空 10-01（余 m3 五个）→ 64-5=59，与一次清空同结果');

// J. adj 新写风格（因子 1）老行为锁定：qty 即基准，不得被多乘
seed();
D.document.getElementById('clr_biz').value='stockLog:in';
D.document.getElementById('clr_biz_cat').value='';
D.document.getElementById('clr_biz_adj').checked=true;
api.stockLog=api.stockLog.filter(s=>s.id==='m3');   // 只留 5 个入（因子1）
api.clearByBiz();
D.__confirm();
ok(api.products.find(p=>p.id==='p1').stock===95,
   '锁定：因子 1 的新写手工明细按原值回滚（100-5=95，不被多乘 12）');

console.log('\n==== 清空库存回滚口径专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
process.exit(fail?1:0);
