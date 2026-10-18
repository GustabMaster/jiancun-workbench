// 第18轮 · 最近成交价记忆的单位口径：带出上次成交价必须折算到「当前所选单位」
// 背景：loadFlowProductHints 把 lastFlowPrice 原样填入 f_price，而单位下拉在选定商品后重置为基准单位。
//       若上次是按「盒」成交（¥120/盒），本次按「个」录单时价格栏预填 120（应 10），金额放大 12 倍且无校验。
//       同链路的 copyLastFlow 会按 unitFactor 配对恢复单位、onChangeUnit 会随单位重算价格，
//       唯独「上次成交价」破坏「价格必须对应当前所选单位」这一不变量。
// 本套件锁死：lastFlowPrice 返回值 = 上次单价 × 当前因子 ÷ 来源因子；无因子老记录按基准口径原样带出。
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
  onFlowSpec, onChangeUnit, loadFlowProductHints, refreshLastPriceHint,
  lastFlowPrice, lastFlowPriceFor, setFlowType, updateUnitPreview
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-lastprice'});
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} };

const D=makeDevice('D');const api=D.api;
const D1='2026-08-04';

// p1 电钻：盒=12个，进价8/批发9/零售10（均按基准个）；p2 无包装；p3 玻璃胶：盒=3个
function seedLastPrice(){
  api.products=[
    {id:'p1',_t:1,name:'电钻',cat:'电动工具',spec:'12V',unit:'个',conv:{'盒':12},stock:60,safe:0,cost:8,wholesale:9,retail:10,price:10},
    {id:'p2',_t:1,name:'膨胀螺丝',cat:'紧固件',spec:'M8',unit:'个',conv:{},stock:5,safe:0,cost:6,wholesale:0,retail:7,price:7},
    {id:'p3',_t:1,name:'玻璃胶',cat:'化工',spec:'',unit:'个',conv:{'盒':3},stock:9,safe:0,cost:5,wholesale:0,retail:6,price:6}
  ];
  api.flow=[
    {id:'f1',_t:1,type:'buy',pid:'p1',pname:'电钻',date:D1,qty:3,price:120,unitName:'盒',unitFactor:12,partyId:''}
  ];
  api.cash=[];api.ar=[];api.todos=[];api.delLog=[];api.stockLog=[];
  api.setCloud({enabled:false});
}
// 模拟真实浏览器：选商品名+规格 → onFlowSpec → 单位下拉重建后默认基准单位（值 '1'）
function pickProduct(name,spec,party){
  D.getEl('f_product').value=name;
  D.getEl('f_spec').value=spec||'';
  D.getEl('f_party').value=party||'';
  D.getEl('f_unit').value='1';
  api.onFlowSpec();
}

console.log('A. 核心缺陷：上次按包装成交，本次默认基准单位，价格必须折算');
seedLastPrice();
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===10,
   '上次 ¥120/盒 → 基准「个」预填 ¥10（120×1÷12），而非原样 120（实际 '+D.getEl('f_price').value+'）');
{
  const h=D.getEl('lastPriceHint').innerHTML;
  ok(h.indexOf('¥120')<0 && h.indexOf('¥10')>=0,
     '「上次成交价」提示同样折算为 ¥10（实际：「'+h+'」）');
}

console.log('B. 反向折算：表单切到包装单位后，提示按当前单位表达');
seedLastPrice();
api.flow=[{id:'f1',_t:1,type:'buy',pid:'p1',pname:'电钻',date:D1,qty:5,price:10,unitName:'个',unitFactor:1,partyId:''}];
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===10,'上次按基准成交（¥10/个）：默认基准单位原样带出 ¥10（实际 '+D.getEl('f_price').value+'）');
D.getEl('f_unit').value='12';          // 用户切到「盒」
api.refreshLastPriceHint();
{
  const h=D.getEl('lastPriceHint').innerHTML;
  ok(h.indexOf('¥120')>=0 && h.indexOf('¥10')<0,
     '切到「盒」后提示折算为 ¥120/盒（10×12÷1，实际：「'+h+'」）');
}

console.log('C. 无历史成交价：回落进价/零售价（回归保护）');
seedLastPrice();
api.flow=[];
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===8,'进货无历史：回落进价 ¥8（实际 '+D.getEl('f_price').value+'）');
api.setFlowType('sell');
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===10,'销售无历史：回落零售价 ¥10（实际 '+D.getEl('f_price').value+'）');
api.setFlowType('buy');

console.log('D. 往来单位优先 + 折算对该分支同样生效');
seedLastPrice();
api.flow=[
  {id:'f1',_t:1,type:'buy',pid:'p1',pname:'电钻',date:D1,qty:2,price:240,unitName:'盒',unitFactor:12,partyId:'pa1'},
  {id:'f2',_t:1,type:'sell',pid:'p1',pname:'电钻',date:D1,qty:1,price:10,unitName:'个',unitFactor:1,partyId:''}
];
pickProduct('电钻','12V','pa1');
ok(+D.getEl('f_price').value===20,'同单位优先：¥240/盒 → ¥20/个（实际 '+D.getEl('f_price').value+'）');
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===10,'无匹配单位回落任意上一笔：¥10/个（实际 '+D.getEl('f_price').value+'）');

console.log('E. 非整除折算：四舍五入到四位，无浮点长尾');
seedLastPrice();
api.flow=[{id:'f1',_t:1,type:'buy',pid:'p3',pname:'玻璃胶',date:D1,qty:2,price:100,unitName:'盒',unitFactor:3,partyId:''}];
pickProduct('玻璃胶','','');
ok(+D.getEl('f_price').value===33.3333,'¥100/盒 ÷3 = ¥33.3333/个（实际 '+D.getEl('f_price').value+'）');

console.log('F. 遗留老记录（无 unitFactor）：按基准口径原样带出，不被误除');
seedLastPrice();
api.flow=[{id:'old',_t:1,type:'buy',pid:'p1',pname:'电钻',date:D1,qty:5,price:10,partyId:''}];
pickProduct('电钻','12V','');
ok(+D.getEl('f_price').value===10,'老记录无因子按基准计：¥10 原样带出（实际 '+D.getEl('f_price').value+'）');

console.log('G. 无包装商品：行为不变（回归保护）');
seedLastPrice();
api.flow=[{id:'f2',_t:1,type:'buy',pid:'p2',pname:'膨胀螺丝',date:D1,qty:2,price:6.5,unitName:'个',unitFactor:1,partyId:''}];
pickProduct('膨胀螺丝','M8','');
ok(+D.getEl('f_price').value===6.5,'无包装商品原样带出 ¥6.5（实际 '+D.getEl('f_price').value+'）');

console.log('H. lastFlowPriceFor 直接调用口径一致（供其他入口复用）');
seedLastPrice();
D.getEl('f_party').value='';
D.getEl('f_unit').value='1';
ok(api.lastFlowPriceFor('p1')===10,'lastFlowPriceFor(p1) = 10（折算后，实际 '+api.lastFlowPriceFor('p1')+'）');
ok(api.lastFlowPriceFor('p2')===null,'无历史商品返回 null（实际 '+api.lastFlowPriceFor('p2')+'）');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
