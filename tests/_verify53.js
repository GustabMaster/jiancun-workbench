// 第53轮 · 商品/流水/出纳/往来 批量勾选删除（bulkRemove + delXData 抽取）
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
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
function makeDevice(name,sharedCloud){
  const elements={};
  const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],body:{appendChild(e){ctx.__appended=(ctx.__appended||[]);ctx.__appended.push(e);}},addEventListener(){}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;this.height=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};},
    __frResult:'data:image/png;base64,AAAA',__fetchLog:[],__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  const cloudStore=sharedCloud||{};
  ctx.__cloudStore=cloudStore;ctx.__fetchLog=[];
  ctx.fetch=(url,opts)=>{const u=String(url);const m=u.match(/book=eq\.([^&]+)/);const book=m?decodeURIComponent(m[1]):'__default__';const method=(opts&&opts.method)||'GET';ctx.__fetchLog.push({method,storage:u.indexOf('/storage/v1/')>=0});if(method==='GET'){const rec=cloudStore[book];const rows=rec?[{data:rec.data,delLog:rec.delLog}]:[];return Promise.resolve({json:()=>Promise.resolve(rows),ok:true});}if(method==='PUT'){const body=opts&&opts.body?JSON.parse(opts.body):{};const d=body.data||{};cloudStore[book]={data:d,delLog:Array.isArray(d.delLog)?d.delLog:[]};return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}if(method==='DELETE'){delete cloudStore[book];return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}return Promise.resolve({json:()=>Promise.resolve([]),ok:true});};
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
  delProductData, delCashData, delFlowData, delPartyData,
  delProduct, delCash, delFlow, delParty,
  bulkRemove, bulkDelete, getSelIds, toggleSelAll, updSelCount,
  renderAll, recordCount, tomb, purgeAr, saveAllLocal, clearAll,
  confirmModal(){ if(globalThis.__modal && globalThis.__modal.fn) globalThis.__modal.fn(); globalThis.__modal=null; },
  getModal(){ return globalThis.__modal; }
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};const md=ctx.document.getElementById('mDetail');if(md)md.innerHTML=bodyHtml||'';const mt=ctx.document.getElementById('mTitle');if(mt)mt.textContent=title||'';};
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0;
function ok(c,msg){if(c){pass++;console.log('  PASS '+msg);}else{fail++;console.log('  FAIL '+msg);}}

const D=makeDevice('D');const api=D.api;
function seed(){
  api.products=[
    {id:'p1',_t:1,name:'电钻',cat:'电动工具',spec:'12V',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},
    {id:'p2',_t:1,name:'膨胀螺丝',cat:'紧固件',spec:'M8',unit:'盒',stock:50,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},
    {id:'p3',_t:1,name:'PVC管',cat:'管材',spec:'20mm',unit:'根',stock:20,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}
  ];
  api.parties=[
    {id:'pa1',_t:1,name:'客户A',type:'客户',contact:'',phone:'',addr:'',note:''},
    {id:'pa2',_t:1,name:'供应商B',type:'供应商',contact:'',phone:'',addr:'',note:''}
  ];
  api.flow=[
    {id:'f1',_t:1,type:'sell',pid:'p1',pname:'电钻',partyId:'pa1',party:'客户A',settle:'cash',date:'2026-08-01',qty:1,price:10,unitName:'台',unitFactor:1,linkCashId:'c1',linkArIds:[]},
    {id:'f2',_t:1,type:'buy',pid:'p2',pname:'膨胀螺丝',partyId:'pa2',party:'供应商B',settle:'credit',date:'2026-08-01',qty:5,price:2,unitName:'盒',unitFactor:1,linkCashId:null,linkArIds:['a1']},
    {id:'f3',_t:1,type:'sell',pid:'p3',pname:'PVC管',partyId:'pa1',party:'客户A',settle:'credit',date:'2026-08-02',qty:2,price:5,unitName:'根',unitFactor:1,linkCashId:null,linkArIds:['a2']}
  ];
  api.cash=[
    {id:'c1',_t:1,type:'in',cat:'销售货款',amount:10,date:'2026-08-01',note:'电钻 销售'},
    {id:'c2',_t:1,type:'out',cat:'物流运费',amount:20,date:'2026-08-02',note:''}
  ];
  api.ar=[
    {id:'a1',_t:1,partyId:'pa2',party:'供应商B',kind:'payable',amount:10,paidAmount:0,date:'2026-08-01',refund:undefined},
    {id:'a2',_t:1,partyId:'pa1',party:'客户A',kind:'receivable',amount:10,paidAmount:0,date:'2026-08-02',refund:undefined},
    {id:'a3',_t:1,partyId:'pa1',party:'客户A',kind:'receivable',amount:30,paidAmount:30,date:'2026-08-02',refund:undefined}
  ];
  api.stockLog=[
    {id:'s1',_t:1,pid:'p1',pname:'电钻',type:'in',qty:3,unit:'台',date:'2026-08-01'}
  ];
  api.delLog=[];
  api.setCloud({enabled:false});
}

console.log('A. 批量删除商品（连带 流水/现金/欠款）');
seed();
let n=api.bulkRemove('product',['p1']);
ok(n===1,'删除 1 个商品 p1');
ok(api.products.length===2 && !api.products.find(p=>p.id==='p1'),'商品 p1 已删');
ok(api.flow.length===2 && !api.flow.find(f=>f.id==='f1'),'f1（pid=p1）已删');
ok(api.cash.length===1 && !api.cash.find(c=>c.id==='c1'),'c1（f1.linkCashId）已删');
ok(api.ar.length===3,'ar 不受影响（f1 无 linkArIds）：仍 3 条');
ok(api.delLog.some(d=>d.id==='p1'&&d.type==='product') && api.delLog.some(d=>d.id==='f1'&&d.type==='flow') && api.delLog.some(d=>d.id==='c1'&&d.type==='cash'),'p1/f1/c1 均写墓碑');

console.log('B. 批量删除商品（credit 流水连带 ar）');
seed();
api.bulkRemove('product',['p2']);
ok(api.products.length===2 && !api.products.find(p=>p.id==='p2'),'商品 p2 已删');
ok(api.flow.length===2 && !api.flow.find(f=>f.id==='f2'),'f2（pid=p2）已删');
ok(api.cash.length===2,'cash 不受影响（f2 无 linkCashId）：仍 2 条');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a1'),'a1（f2.linkArIds）已清（未收付款）');

console.log('C. 批量删除流水（冲回库存/现金/欠款）');
seed();
api.bulkRemove('flow',['f1']);
ok(api.flow.length===2 && !api.flow.find(f=>f.id==='f1'),'f1 已删');
ok(api.products.find(p=>p.id==='p1').stock===4,'卖出 p1 删除后库存回加：3→4');
ok(api.cash.length===1 && !api.cash.find(c=>c.id==='c1'),'c1（linkCashId）已删');
ok(api.ar.length===3,'ar 不受影响');
seed();
api.bulkRemove('flow',['f2']);
ok(api.products.find(p=>p.id==='p2').stock===45,'买入 p2 删除后库存回减：50→45');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a1'),'a1（linkArIds）已清');

console.log('D. 批量删除出纳');
seed();
api.bulkRemove('cash',['c2']);
ok(api.cash.length===1 && !api.cash.find(c=>c.id==='c2'),'c2 已删');
ok(api.delLog.some(d=>d.id==='c2'&&d.type==='cash'),'c2 写墓碑');
ok(api.products.length===3 && api.flow.length===3,'商品/流水不受影响');

console.log('E. 批量删除往来单位（连带欠款；已收款保留）');
seed();
api.bulkRemove('party',['pa1']);
ok(api.parties.length===1 && !api.parties.find(p=>p.id==='pa1'),'pa1 已删');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a2'),'a2（pa1 应收未收）已清');
ok(!!api.ar.find(a=>a.id==='a3'),'a3（pa1 已收款 paidAmount=30）保留，不误删');
ok(!!api.ar.find(a=>a.id==='a1'),'a1（pa2）不受影响');

console.log('F. 单条删除重构回归（确认弹窗→Data）');
seed();
api.delProduct('p3'); api.confirmModal();
ok(api.products.length===2 && !api.products.find(p=>p.id==='p3'),'delProduct 删除 p3');
ok(api.flow.length===2 && !api.flow.find(f=>f.id==='f3'),'delProduct 连带删 f3（pid=p3）');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a2'),'delProduct 连带清 a2（f3.linkArIds）');
seed();
api.delFlow('f3'); api.confirmModal();
ok(api.flow.length===2 && !api.flow.find(f=>f.id==='f3'),'delFlow 删除 f3');
ok(api.products.find(p=>p.id==='p3').stock===22,'delFlow 卖出删除回加库存：20→22');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a2'),'delFlow 连带清 a2');
seed();
api.delCash('c2');
ok(api.cash.length===1 && !api.cash.find(c=>c.id==='c2'),'delCash 删除 c2');
seed();
api.delParty('pa2'); api.confirmModal();
ok(api.parties.length===1 && !api.parties.find(p=>p.id==='pa2'),'delParty 删除 pa2');
ok(api.ar.length===2 && !api.ar.find(a=>a.id==='a1'),'delParty 连带清 a1（pa2 payable）');

console.log('G. 批量删除 DOM 收集路径（getSelIds + bulkDelete）');
seed();
D.ctx.document.querySelectorAll=(sel)=>{ if(sel.indexOf(':checked')>=0) return [{getAttribute:k=>k==='data-id'?'p1':null},{getAttribute:k=>k==='data-id'?'p2':null}]; return []; };
api.bulkDelete('product'); api.confirmModal();
ok(api.products.length===1 && !api.products.find(p=>p.id==='p1') && !api.products.find(p=>p.id==='p2'),'bulkDelete 经勾选收集删掉 p1+p2');
ok(api.flow.length===1 && !!api.flow.find(f=>f.id==='f3'),'f1/f2 连带删除，保留 f3');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
