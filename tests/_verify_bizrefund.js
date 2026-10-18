// 专项：按业务类型清空的「销售 / 退货」口径
// 背景：退货在库里并不存 type==='refund'——commitRefund 一律落 type:'sell' + refund:true
// （2944 行；草稿里的 'refund' 只是过渡值，3178/4785 两处都会改走 commitRefund）。
// 而 countByBiz / clearByBiz 的 flow 分支只用 f.type===type 过滤，于是：
//   ① 选「退货」永远匹配不到 → 预览恒为 0 条、点清空什么都没删，却提示「已清空「退货」记录」；
//   ② 选「销售」会把退货记录一并删掉（退货的 type 也是 'sell'），超出用户预期。
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
  countByBiz, clearByBiz, catMatcher, delFlowData,
  renderAll, saveAllLocal, tomb, save
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('bizrefund');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 种子：f1 普通销售、f2 退货（type:'sell' + refund:true，与真实落库一致）、f3 进货
function seed(){
  api.products=[
    {id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:8,price:10,cat:'A',spec:'',safe:0,_t:1},
    {id:'p2',name:'锤子',unit:'个',conv:{},stock:50,cost:5,price:8,cat:'B',spec:'',safe:0,_t:1}
  ];
  api.flow=[
    {id:'f1',type:'sell',pid:'p1',pname:'电钻',qty:2,price:10,unitFactor:1,settle:'cash',date:'2026-10-01',linkCashId:null,linkArIds:[],_t:1},
    {id:'f2',type:'sell',refund:true,pid:'p1',pname:'电钻',qty:1,price:10,unitFactor:1,settle:'cash',date:'2026-10-02',linkCashId:null,linkArIds:[],_t:1},
    {id:'f3',type:'buy', pid:'p1',pname:'电钻',qty:5,price:8, unitFactor:1,settle:'cash',date:'2026-10-03',linkCashId:null,linkArIds:[],_t:1}
  ];
  api.cash=[];api.ar=[];api.stockLog=[];api.todos=[];api.delLog=[];
  api.save('flow',api.flow);api.save('products',api.products);
}
const has=id=>!!api.flow.find(f=>f.id===id);
function setBiz(v,cat){ D.document.getElementById('clr_biz').value=v; D.document.getElementById('clr_biz_cat').value=cat||''; }

console.log('按业务类型清空 · 销售/退货口径专项\n');

// 0. 种子自校验：确认退货确实存成 type:'sell'+refund:true（与真实落库一致）
seed();
ok(api.flow.find(f=>f.id==='f2').type==='sell'&&api.flow.find(f=>f.id==='f2').refund===true,
   '种子自校验：退货记录为 type=sell + refund=true（与 commitRefund 落库一致）');

// A. 计数口径
console.log('\nA. 预览计数');
seed();
ok(api.countByBiz('flow:refund','')===1,
   'A1 「退货」计数 = 1（实际 '+api.countByBiz('flow:refund','')+'；历史缺陷：恒为 0）');
ok(api.countByBiz('flow:sell','')===1,
   'A2 「销售」计数 = 1，不含退货（实际 '+api.countByBiz('flow:sell','')+'；历史缺陷：把退货也算成销售）');
ok(api.countByBiz('flow:buy','')===1,
   'A3 回归锁：「进货」计数 = 1（实际 '+api.countByBiz('flow:buy','')+'）');

// B. 清空口径
console.log('\nB. 实际清空');
seed();
setBiz('flow:refund');
api.clearByBiz(); D.__confirm();
ok(!has('f2')&&has('f1')&&has('f3'),
   'B1 清空「退货」：退货 f2 被删，销售 f1、进货 f3 保留（历史缺陷：一条都没删）');
seed();
setBiz('flow:sell');
api.clearByBiz(); D.__confirm();
ok(!has('f1')&&has('f2')&&has('f3'),
   'B2 清空「销售」：只删销售 f1，退货 f2 不被牵连（历史缺陷：退货一并被删）');
seed();
setBiz('flow:buy');
api.clearByBiz(); D.__confirm();
ok(!has('f3')&&has('f1')&&has('f2'),
   'B3 回归锁：清空「进货」只删 f3');

// C. 计数与实际删除一致（预览几条就删几条）
console.log('\nC. 预览与实际一致');
seed();
setBiz('flow:refund');
const n=api.countByBiz('flow:refund','');
api.clearByBiz(); D.__confirm();
ok(n===1&&api.flow.length===2,
   'C1 「退货」：预览 '+n+' 条 → 实际剩余 '+api.flow.length+' 条（3-1=2）');
seed();
setBiz('flow:sell');
const n2=api.countByBiz('flow:sell','');
api.clearByBiz(); D.__confirm();
ok(n2===1&&api.flow.length===2,
   'C2 「销售」：预览 '+n2+' 条 → 实际剩余 '+api.flow.length+' 条（3-1=2）');

// D. 分类过滤仍然生效（回归锁）
console.log('\nD. 分类过滤回归锁');
seed();
ok(api.countByBiz('flow:sell','B')===0&&api.countByBiz('flow:sell','A')===1,
   'D1 分类过滤：A 类销售计 1、B 类计 0（实际 A='+api.countByBiz('flow:sell','A')+' B='+api.countByBiz('flow:sell','B')+'）');

console.log('\n结果: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
