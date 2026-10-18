// 第17轮 · 库存台账单位口径：对账反算 / 明细编辑联动 / 删除联动必须统一按「基准单位」换算
// 背景：delStockLog 注释明确「买卖台账 qty 是包装单位，需乘来源流水因子」，但 reconcileStock 裸加 qty、
//       editStockLog「仅调整库存」路径与 slEditPrev 预览裸算 q-oldQ——同一不变量三处实现漂移。
// 本套件锁死：记录自带 unitFactor > 来源流水因子 > 商品换算表 > 1 的取数优先级，且手工台账恒为基准。
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag){
  const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',
    set innerHTML(v){this._html=v;this.children=[];},
    get innerHTML(){return this.children.length?this.children.map(c=>c._html||'').join(''):this._html;},
    classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub()},
    querySelector(){return elStub()},querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}}},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}
function makeDevice(name){
  const elements={};
  const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],body:{appendChild(){},addEventListener(){},removeEventListener(){},classList:makeClassList()},addEventListener(){}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},confirm:()=>true,URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){this.width=0;this.height=0;},FileReader:function(){},__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),ok:true});
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cash(){return cash}, set cash(v){cash=v},
  get flow(){return flow}, set flow(v){flow=v},
  get todos(){return todos}, set todos(v){todos=v},
  get parties(){return parties}, set parties(v){parties=v},
  get ar(){return ar}, set ar(v){ar=v},
  get delLog(){return delLog}, set delLog(v){delLog=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  setCloud(c){cloud=c;}, get cloud(){return cloud},
  save, renderAll, recordCount, trashSnapshot,
  reconcileStock, reconcileFix, editStockLog, delStockLog, slEditPrev, slBaseFactor,
  commitFlow, commitRefund,
  confirmModal(){ if(globalThis.__modal && globalThis.__modal.fn) globalThis.__modal.fn(); globalThis.__modal=null; },
  getModal(){ return globalThis.__modal; }
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-ledger'});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};const md=doc.getElementById('mDetail');if(md)md.innerHTML=bodyHtml||'';const mt=doc.getElementById('mTitle');if(mt)mt.textContent=title||'';};
  ctx.adjHint=function(){};
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} };

const D=makeDevice('D');const api=D.api;
const D1='2026-08-04';

// 多包装商品：盒=12个 / 箱=6个；买卖台账 qty 记包装单位，unitFactor/stockDelta 记基准
// 库存恒等于「台账基准合计」：p1=3盒(36)+2盒退货(24)=60；p2=手工5；p3=2箱(12)
function seedMulti(){
  api.products=[
    {id:'p1',_t:1,name:'电钻',cat:'电动工具',spec:'12V',unit:'个',conv:{'盒':12},stock:60,safe:0,cost:0,wholesale:0,retail:0,price:0},
    {id:'p2',_t:1,name:'膨胀螺丝',cat:'紧固件',spec:'M8',unit:'个',conv:{'盒':10},stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0},
    {id:'p3',_t:1,name:'PVC管',cat:'管材',spec:'20mm',unit:'个',conv:{'箱':6},stock:12,safe:0,cost:0,wholesale:0,retail:0,price:0}
  ];
  api.flow=[
    {id:'f1',_t:1,type:'buy',pid:'p1',pname:'电钻',date:D1,qty:3,price:10,unitName:'盒',unitFactor:12,stockDelta:36},
    {id:'f2',_t:1,type:'sell',refund:true,pid:'p1',pname:'电钻',date:D1,qty:2,price:10,unitName:'盒',unitFactor:12,stockDelta:24},
    {id:'f4',_t:1,type:'buy',pid:'p3',pname:'PVC管',date:D1,qty:2,price:10,unitName:'箱',unitFactor:6,stockDelta:12}
  ];
  api.stockLog=[
    {id:'s1',_t:1,pid:'p1',pname:'电钻',type:'in',src:'buy',qty:3,unit:'盒',date:D1,fid:'f1',unitFactor:12,stockDelta:36},
    {id:'s2',_t:1,pid:'p1',pname:'电钻',type:'in',src:'refund',qty:2,unit:'盒',date:D1,fid:'f2',unitFactor:12,stockDelta:24},
    {id:'s3',_t:1,pid:'p2',pname:'膨胀螺丝',type:'in',src:'manual',qty:5,unit:'个',date:D1},
    {id:'s4',_t:1,pid:'p3',pname:'PVC管',type:'in',src:'buy',qty:2,unit:'箱',date:D1,fid:'f4'}   // 遗留记录：无 unitFactor
  ];
  api.cash=[];api.ar=[];api.todos=[];api.delLog=[];
  api.setCloud({enabled:false});
}

console.log('A. 对账反算：买卖台账必须按来源因子换算成基准单位');
seedMulti();
let r=api.reconcileStock();
ok(r.mism.length===0 && r.legacy.length===0 && r.ok===3,
   '三商品库存均等于台账基准合计（60=3盒+2盒退货 / 5=手工 / 12=2箱）：无误报（实际 mism='+JSON.stringify(r.mism.map(m=>({n:m.name,cur:m.cur,exp:m.exp,diff:m.diff})))+'）');
ok(api.reconcileStock().mism.length===0,'重复调用结果稳定（无累积副作用）');

console.log('B. 对账反算：真实不一致仍须检出（回归保护位）');
seedMulti();
api.products.find(p=>p.id==='p1').stock=30;   // 台账基准合计 60，实际 30
r=api.reconcileStock();
ok(r.mism.length===1 && r.mism[0].exp===60 && r.mism[0].diff===-30,
   '库存被改小时检出 mism（exp=60, diff=cur-exp=-30，实际 '+JSON.stringify({exp:r.mism[0]&&r.mism[0].exp,diff:r.mism[0]&&r.mism[0].diff})+'）');
seedMulti();
api.products.find(p=>p.id==='p2').stock=8;    // 手工台账基准合计 5，实际 8
r=api.reconcileStock();
const m2=r.mism.find(m=>m.name==='膨胀螺丝');
ok(r.mism.length===1 && m2 && m2.exp===5 && m2.diff===3,
   '手工台账不一致同样检出（exp=5, diff=3，实际 '+JSON.stringify(m2?{exp:m2.exp,diff:m2.diff}:null)+'）');

console.log('C. 一键修正：一致时不动数据；不一致时按基准合计覆写');
seedMulti();
api.reconcileFix();
ok(api.products.find(p=>p.id==='p1').stock===60 && api.products.find(p=>p.id==='p2').stock===5,
   '一致时修正不改变库存（60/5 原值保留）');
seedMulti();
api.products.find(p=>p.id==='p1').stock=30;
api.reconcileFix();
ok(api.products.find(p=>p.id==='p1').stock===60,
   '不一致时修正为台账基准合计 60（3盒×12+2盒×12），而非裸 qty 合计 5');
ok(api.reconcileStock().mism.length===0,'修正后复查一致');

console.log('D. 取数优先级：记录自带因子 > 来源流水因子 > 商品换算表 > 1');
seedMulti();
api.products.find(p=>p.id==='p1').conv={'盒':10};   // 换算表事后被改，记录/流水因子仍应是 12
r=api.reconcileStock();
ok(r.mism.length===0,'换算表事后被改（盒 12→10）不误报：老记录按记录时因子 12 计入（实际 mism='+r.mism.length+'）');
seedMulti();
api.flow.find(f=>f.id==='f4').unitFactor=6;         // 遗留记录无自带因子 → 用流水因子 6，不跟 conv
api.products.find(p=>p.id==='p3').conv={'箱':8};
r=api.reconcileStock();
ok(r.mism.length===0,'遗留记录优先用来源流水因子（6），不跟事后改的换算表（8）');
seedMulti();
api.stockLog.find(s=>s.id==='s4').unitFactor=6;     // 记录自带因子优先级最高
api.flow.find(f=>f.id==='f4').unitFactor=99;
api.products.find(p=>p.id==='p3').conv={'箱':8};
r=api.reconcileStock();
ok(r.mism.length===0,'记录自带 unitFactor(6) 优先于流水因子(99)与换算表(8)');
seedMulti();
api.stockLog.find(s=>s.id==='s4').fid='ghost';     // 悬空 fid（流水被删/坏导入）→ 换算表兜底
r=api.reconcileStock();
ok(r.mism.length===0 && api.reconcileStock().ok===3,'悬空 fid 时换算表兜底（箱=6 → exp=12）');
seedMulti();
api.stockLog.find(s=>s.id==='s4').fid='';          // 无 fid 一律按手工台账口径（系数 1），与删除联动同语义
r=api.reconcileStock();
const m4=r.mism.find(m=>m.name==='PVC管');
ok(m4 && m4.exp===2,'无 fid 记录按手工台账计（系数 1，exp=2）而非猜换算表——保守口径，与删除联动一致');

console.log('E. 手工台账恒按基准（系数 1），绝不乘换算表');
api.products=[{id:'q1',_t:1,name:'手工件',unit:'个',conv:{'盒':10},stock:5,safe:0,cost:0,price:0,retail:0,wholesale:0}];
api.flow=[];
api.stockLog=[{id:'m1',_t:1,pid:'q1',pname:'手工件',type:'in',src:'manual',qty:5,unit:'盒',date:D1}];
api.cash=[];api.ar=[];api.todos=[];api.delLog=[];api.setCloud({enabled:false});
r=api.reconcileStock();
ok(r.mism.length===0,'手工台账 qty 即基准：5≠5×10，按 5 计入（实际 mism='+r.mism.length+'）');

console.log('F. 明细编辑「仅调整库存」：差值必须换算成基准单位');
seedMulti();
const edId='s1';
api.editStockLog(edId);
D.getEl('sl_synflow').checked=false;
D.getEl('sl_adj').checked=true;
D.getEl('sl_qty').value='5';      // 3盒 → 5盒（盒=12个）
D.getEl('sl_unit').value='12';
D.getEl('sl_unit').selectedOptions=[{textContent:'盒'}];
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===84,
   '入库 3盒→5盒 仅调库存：+2盒=+24个 → 60→84（实际 '+api.products.find(p=>p.id==='p1').stock+'）');
ok(api.stockLog.find(x=>x.id===edId).unitFactor===12,'记录同步写入 unitFactor=12（自描述，供对账取数）');
ok(api.reconcileStock().mism.length===0,'编辑后对账仍一致（库存 84 = 5盒×12+2盒×12）');

console.log('G. 明细编辑「仅调整库存」：单位切换也按基准折算');
seedMulti();
api.editStockLog('s1');
D.getEl('sl_synflow').checked=false;
D.getEl('sl_adj').checked=true;
D.getEl('sl_qty').value='1';      // 3盒 → 1个
D.getEl('sl_unit').value='1';
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===25,
   '入库 3盒→1个 仅调库存：60−36+1=25 → 60→25（实际 '+api.products.find(p=>p.id==='p1').stock+'）');
ok(api.reconcileStock().mism.length===0,'单位切换后对账仍一致（25 = 1个+2盒退货）');

console.log('H. 编辑预览 slEditPrev 与实际落库一致（防「预览说加 2、实际加 24」）');
seedMulti();
api.editStockLog('s1');
D.getEl('sl_adj').checked=true;
D.getEl('sl_qty').value='5';
D.getEl('sl_unit').value='12';
api.slEditPrev('s1');
const pv=D.getEl('sl_prev').textContent;
ok(pv.indexOf('84')>=0 && pv.indexOf('24')>=0 && pv.indexOf('加')>=0,
   '预览显示「保存后库存 84（加 24 个）」与实际落库一致（实际：「'+pv+'」）');

console.log('I. 手工台账编辑联动：qty 即基准，回归保护');
api.products=[{id:'q1',_t:1,name:'手工件',unit:'个',conv:{},stock:3,safe:0,cost:0,price:0,retail:0,wholesale:0}];
api.flow=[];api.cash=[];api.ar=[];api.todos=[];api.delLog=[];api.setCloud({enabled:false});
api.stockLog=[{id:'m1',_t:1,pid:'q1',pname:'手工件',type:'in',src:'manual',qty:3,unit:'个',date:D1}];
api.editStockLog('m1');
D.getEl('sl_adj').checked=true;
D.getEl('sl_qty').value='99';
D.getEl('sl_unit').value='1';
api.confirmModal();
ok(api.products.find(p=>p.id==='q1').stock===99,'手工台账 3→99 联动：+96 → 3→99（实际 '+api.products.find(p=>p.id==='q1').stock+'）');

console.log('J. 「同步修改买卖」路径不受影响（回归保护位）');
seedMulti();
api.editStockLog('s1');
D.getEl('sl_synflow').checked=true;
D.getEl('sl_adj').checked=false;
D.getEl('sl_qty').value='5';
D.getEl('sl_unit').value='12';
D.getEl('sl_unit').selectedOptions=[{textContent:'盒'}];
D.getEl('sl_price').value='10';
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===84 && api.flow.find(f=>f.id==='f1').qty===5,
   '同步路径 3盒→5盒：库存 84 且流水 qty=5（原正确行为保持）');

console.log('K. 删除明细联动：手工台账按基准、买卖台账连带删流水（回归保护位）');
seedMulti();
const delManual='s3';   // p2 手工 5 个，stock=5
api.delStockLog(delManual);
D.getEl('sl_adj').checked=true;
api.confirmModal();
ok(api.products.find(p=>p.id==='p2').stock===0,'删手工入库并联动：5−5=0（实际 '+api.products.find(p=>p.id==='p2').stock+'）');
seedMulti();
const delFlowRec='s1';  // p1 买卖台账 3盒：删除弹窗对买卖台账默认勾选「连带删除买卖」
api.delStockLog(delFlowRec);
D.getEl('sl_delflow').checked=true;   // 浏览器默认态（该记录来自买卖，复选框渲染即勾选）
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===24 && api.flow.findIndex(f=>f.id==='f1')<0,
   '删买卖台账默认连带删流水：冲回 36，库存 60→24（实际 '+api.products.find(p=>p.id==='p1').stock+'）');

console.log('L. commitFlow/commitRefund 写入的台账自带基准因子');
seedMulti();
api.products=[{id:'n1',_t:1,name:'新货',unit:'个',conv:{'盒':12},stock:0,safe:0,cost:0,price:0,retail:0,wholesale:0}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.todos=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'n1',pname:'新货',partyId:'',partyName:'',settle:'cash',date:D1,note:'',qty:3,price:5,uname:'盒',ufactor:12});
ok(api.products.find(p=>p.id==='n1').stock===36,'commitFlow 按因子入账：3盒=36个');
const nr=api.stockLog[api.stockLog.length-1];
ok(nr && nr.qty===3 && nr.unitFactor===12,'台账记录 qty=3（包装单位）且 unitFactor=12（基准因子自描述）');
ok(api.reconcileStock().mism.length===0,'新录入商品对账一致');
api.commitRefund({type:'sell',refund:true,pid:'n1',pname:'新货',partyId:'',partyName:'',settle:'cash',date:D1,note:'',qty:1,price:5,uname:'盒',ufactor:12});
ok(api.products.find(p=>p.id==='n1').stock===48,'commitRefund 退货回库 1盒=12个 → 36→48');
ok(api.reconcileStock().mism.length===0,'退货后对账仍一致');

console.log('M. 编辑弹窗单位选项与记录当前单位对齐（防「打开就错位」）');
seedMulti();
api.editStockLog('s1');
const body=D.ctx.__modal.bodyHtml||'';
ok(body.indexOf('value="12" selected')>=0 && body.indexOf('>盒<')>=0,
   '编辑买卖台账（3盒）时单位下拉预选「盒」且值为因子 12（实际片段：'+(body.match(/<option value="12"[^>]*>[^<]*<\/option>/)||['（未找到）'])[0]+'）');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
