// 商业级整改返工专项验证：名称→规格联想 + 买卖拆框 + 初始入库台账
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
function makeClassList(){const s=new Set();const has=c=>s.has(c);const add=(...cs)=>cs.forEach(c=>s.add(c));const rem=(...cs)=>cs.forEach(c=>s.delete(c));return{add,remove:rem,contains:has,toggle:(c,f)=>{if(f===undefined){has(c)?rem(c):add(c);}else{f?add(c):rem(c);}}};}
function elStub(tag){const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this.children.length?this.children.map(c=>c._html||'').join(''):this._html;},classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub();},querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});}};return self;}
function makeDevice(name){
  const elements={};const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:()=>elStub(),querySelector:()=>elStub(),querySelectorAll:()=>[],body:elStub('body'),addEventListener(){},documentElement:{style:{setProperty:()=>{}}}};
  const localStore={};const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},FileReader:function(){this.readAsText=()=>{this.result='';if(this.onload)this.onload();};}};
  ctx.globalThis=ctx;ctx.window=ctx;ctx.__lastAlert='';ctx.__modal=null;
  const cloudStore={};ctx.__cloudStore=cloudStore;
  ctx.fetch=(url,opts)=>{const u=String(url);const m=u.match(/book=eq\.([^&]+)/);const book=m?decodeURIComponent(m[1]):'__default__';const method=(opts&&opts.method)||'GET';if(method==='GET'){const rec=cloudStore[book];return Promise.resolve({json:()=>Promise.resolve(rec?[{data:rec.data,delLog:rec.delLog}]:[]),ok:true});}if(method==='PUT'){const body=opts&&opts.body?JSON.parse(opts.body):{};cloudStore[book]={data:body.data||{},delLog:Array.isArray((body.data||{}).delLog)?(body.data||{}).delLog:[]};return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}return Promise.resolve({json:()=>Promise.resolve([]),ok:true});};
  vm.createContext(ctx);
  const shim=`;globalThis.__api={get products(){return products},set products(v){products=v},get cash(){return cash},set cash(v){cash=v},get flow(){return flow},set flow(v){flow=v},get todos(){return todos},set todos(v){todos=v},get parties(){return parties},set parties(v){parties=v},get ar(){return ar},set ar(v){ar=v},get stockLog(){return stockLog},set stockLog(v){stockLog=v},get delLog(){return delLog},set delLog(v){delLog=v},get cfg(){return cfg},set cfg(v){cfg=v},addProduct,addFlow,onPName,onFlowProduct,onFlowSpec,fillFlowProducts,resolveFlowProduct,setFlowType,setSettle};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn){ctx.__modal={title,fn};};ctx.confirmModal=function(){if(ctx.__modal&&ctx.__modal.fn)ctx.__modal.fn();ctx.__modal=null;};
  return {api:ctx.__api,ctx,getEl};
}
let pass=0,fail=0;
function ok(c,msg){if(c){pass++;console.log('  PASS '+msg);}else{fail++;console.log('  FAIL '+msg);}}
function run(name,fn){try{fn();}catch(e){fail++;console.log('  FAIL '+name+'（异常：'+e.message+'）');}}
function reset(api,seed){api.products=(seed.products||[]).map(x=>JSON.parse(JSON.stringify(x)));api.cash=[];api.flow=[];api.parties=(seed.parties||[]).map(x=>JSON.parse(JSON.stringify(x)));api.ar=[];api.stockLog=[];api.delLog=[];api.todos=[];api.cfg={pinFrequent:false,specPresets:['16V','24V']};}

const seed={
  products:[
    {id:'A1',name:'电钻',spec:'12V',unit:'个',conv:{},stock:10,safe:0,cost:50,retail:80,price:80},
    {id:'A2',name:'电钻',spec:'18V',unit:'个',conv:{},stock:5,safe:0,cost:60,retail:90,price:90},
    {id:'B1',name:'扳手',spec:'10寸',unit:'个',conv:{},stock:20,safe:0,cost:10,retail:20,price:20}
  ]
};

console.log('\n[返工1] 名称→规格 联想作用域');
{
  const D=makeDevice('R1');reset(D.api,seed);
  run('输入「电钻」→规格只列该名下规格',()=>{
    D.getEl('p_name').value='电钻'; D.ctx.onPName('p_name','p_spec');
    const h=D.getEl('p_spec')._html;
    ok(h.indexOf('12V')>=0 && h.indexOf('18V')>=0,'规格含 12V/18V');
    ok(h.indexOf('10寸')<0,'规格不含别的商品「10寸」');
  });
  run('输入新名称「冲击钻」→规格不含其它商品规格，且可新增',()=>{
    D.getEl('p_name').value='冲击钻'; D.ctx.onPName('p_name','p_spec');
    const h=D.getEl('p_spec')._html;
    ok(h.indexOf('10寸')<0,'新名称下不含 扳手 的 10寸（修复后规格随名称收窄）');
    ok(h.indexOf('16V')<0 && h.indexOf('24V')<0,'新名称下不回退到全局预设（16V/24V）—避免冒出无关规格');
    ok(h.indexOf('__add__')>=0,'含「＋ 新增规格」');
  });
}

console.log('\n[返工2] 买卖拆框：选商品→规格过滤→f_pid 同步');
{
  const D=makeDevice('R2');reset(D.api,seed);
  D.ctx.setFlowType('sell'); D.ctx.setSettle('cash');
  run('fillFlowProducts 填商品名下拉',()=>{
    D.ctx.fillFlowProducts();
    const h=D.getEl('f_product')._html;
    ok(h.indexOf('电钻')>=0 && h.indexOf('扳手')>=0,'商品名下拉含 电钻/扳手');
  });
  run('选「电钻」→规格只列 12V/18V',()=>{
    D.getEl('f_product').value='电钻'; D.ctx.onFlowProduct();
    const h=D.getEl('f_spec')._html;
    ok(h.indexOf('12V')>=0 && h.indexOf('18V')>=0,'规格含 12V/18V');
    ok(h.indexOf('10寸')<0,'规格不含 扳手 的 10寸');
  });
  run('选「18V」→f_pid 同步为 A2 且解析正确',()=>{
    D.getEl('f_spec').value='18V'; D.ctx.onFlowSpec();
    ok(D.getEl('f_pid').value==='A2','隐藏 f_pid 同步为 A2');
    const r=D.ctx.resolveFlowProduct();
    ok(r.pid==='A2' && r.pname==='电钻' && r.spec==='18V','resolveFlowProduct 解析出 电钻·18V(A2)');
  });
  run('保存销售→流水落 A2、库存按 18V 商品扣减',()=>{
    D.getEl('f_qty').value='2'; D.getEl('f_price').value='90'; D.getEl('f_date').value='2026-08-04';
    D.ctx.addFlow();
    const f=D.api.flow; ok(f.length===1 && f[0].pid==='A2','买卖记录落到 A2');
    const p=D.api.products.find(x=>x.id==='A2'); ok(p.stock===3,'A2 库存 5-2=3');
    ok(D.api.stockLog.length===1 && D.api.stockLog[0].pid==='A2' && D.api.stockLog[0].type==='out','出入库明细生成一条 A2 出库');
  });
}

console.log('\n[返工3] 买卖：名称 + 新规格 → 自动建新商品记录');
{
  const D=makeDevice('R3');reset(D.api,seed);
  D.ctx.setFlowType('buy'); D.ctx.setSettle('cash');
  run('选「电钻」+「＋新增规格」22V → isNew 并新建',()=>{
    D.ctx.fillFlowProducts();
    D.getEl('f_product').value='电钻'; D.ctx.onFlowProduct();
    D.getEl('f_spec').value='__add__'; D.getEl('f_newspec').value='22V'; D.ctx.onFlowSpec();
    const r=D.ctx.resolveFlowProduct();
    ok(r.pid===null && r.isNew===true && r.pname==='电钻' && r.spec==='22V','解析为新建 电钻·22V');
    D.getEl('f_qty').value='3'; D.getEl('f_price').value='70'; D.getEl('f_date').value='2026-08-04';
    const before=D.api.products.length;
    D.ctx.addFlow();
    const np=D.api.products.find(x=>x.name==='电钻'&&x.spec==='22V');
    ok(np && D.api.products.length===before+1,'新建了 电钻·22V 商品记录');
    ok(D.api.flow.length===1 && D.api.flow[0].pid===np.id,'买卖落到新商品');
  });
}

console.log('\n[返工4] 新增商品（带初始库存）→ 自动写初始入库台账');
{
  const D=makeDevice('R4');reset(D.api,seed);
  run('addProduct 库存=50 → 出入库明细新增一条入库',()=>{
    D.getEl('p_name').value='膨胀螺丝'; D.getEl('p_stock').value='50';
    D.ctx.addProduct();
    const np=D.api.products.find(x=>x.name==='膨胀螺丝');
    ok(!!np && np.stock===50,'商品创建且库存=50');
    const sl=D.api.stockLog.filter(x=>x.pid===np.id);
    ok(sl.length===1 && sl[0].type==='in' && sl[0].qty===50,'出入库明细有一条该商品初始入库(50)');
  });
  run('addProduct 库存=0 → 不写台账',()=>{
    const before=D.api.stockLog.length;
    D.getEl('p_name').value='空库存件'; D.getEl('p_stock').value='0';
    D.ctx.addProduct();
    ok(D.api.stockLog.length===before,'库存为 0 时不生成台账行');
  });
}

console.log('\n结果：PASS '+pass+' / FAIL '+fail);
process.exit(fail?1:0);
