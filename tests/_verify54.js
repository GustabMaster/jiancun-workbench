// 第54轮 · 出入库明细（按日期）批量勾选删除
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
  bulkRemove, bulkDelete, getSelIds, applyTombstones,
  delStockLog, renderAll, recordCount, tomb, purgeAr, saveAllLocal, clearAll,
  // 先清空再执行 fn：这样 fn 内部再次 openModal（二次确认）时新弹窗不会被清掉
  confirmModal(){ const m=globalThis.__modal; globalThis.__modal=null; if(m&&m.fn) m.fn(); },
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
    {id:'p2',_t:1,name:'膨胀螺丝',cat:'紧固件',spec:'M8',unit:'盒',stock:50,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}
  ];
  api.stockLog=[
    {id:'s1',_t:1,pid:'p1',pname:'电钻',type:'in',qty:3,unit:'台',date:'2026-08-01'},
    {id:'s2',_t:2,pid:'p1',pname:'电钻',type:'out',qty:1,unit:'台',date:'2026-08-01'},
    {id:'s3',_t:3,pid:'p2',pname:'膨胀螺丝',type:'in',qty:10,unit:'盒',date:'2026-08-02'}
  ];
  api.delLog=[];
  api.setCloud({enabled:false});
}

console.log('A. 批量删除出入库明细（多条）');
seed();
let n=api.bulkRemove('stocklog',['s1','s3']);
ok(n===2,'批量删除 2 条 s1/s3');
ok(api.stockLog.length===1 && api.stockLog[0].id==='s2','仅剩 s2（按日期分组未受影响）');
ok(api.delLog.filter(d=>d.type==='stocklog').length===2,'s1/s3 均写墓碑（type=stocklog）');
ok(api.products.find(p=>p.id==='p1').stock===3 && api.products.find(p=>p.id==='p2').stock===50,'批量删除默认不动库存（p1=3,p2=50 不变）');
ok(!!D.ctx.localStorage.getItem('wb_wujin_stocklog'),'stocklog 已落盘 localStorage');

console.log('B. 墓碑跨设备同步删除（applyTombstones）');
seed();
api.delLog.push({id:'s2',type:'stocklog',t:Date.now()});
api.applyTombstones();
ok(api.stockLog.length===2 && !api.stockLog.find(x=>x.id==='s2'),'含墓碑 s2 的 stocklog 被过滤（跨设备删除生效）');

console.log('C. 未勾选时 bulkDelete 仅提示不删');
seed();
api.bulkDelete('stocklog');
ok((D.ctx.__lastAlert||'').indexOf('请先')>=0,'未勾选时提示「请先勾选」，不崩溃');
ok(api.stockLog.length===3,'未勾选时记录不变（仍 3 条）');

console.log('D. 单条 delStockLog 仍工作（带库存联动选项，默认不动库存）');
seed();
api.delStockLog('s2'); // openModal 捕获，sl_adj 默认未勾选
ok(!!api.getModal(),'delStockLog 弹出确认弹窗');
api.confirmModal();
ok(!api.stockLog.find(x=>x.id==='s2'),'单条删除后 s2 已移除');
ok(api.delLog.some(d=>d.id==='s2'&&d.type==='stocklog'),'单条删除也写墓碑');
ok(api.products.find(p=>p.id==='p1').stock===3,'默认不勾选联动时库存不变（p1=3）');
ok(api.stockLog.length===2,'剩余 2 条');

console.log('E. 单条勾选框含 onchange（修复顶部按钮不亮）');
seed();
api.renderAll();
const slHtml=D.getEl('stockLogList')._html||'';
ok(slHtml.indexOf("onchange=\"updSelCount('stocklog')\"")>=0,'每行勾选框含 onchange=\"updSelCount(\'stocklog\')\"（单条勾选可点亮按钮）');
ok(slHtml.indexOf('class="sel_stocklog"')>=0,'生成 sel_stocklog 勾选框');

console.log('F. 批量删除出入库明细（带库存联动勾选）');
seed();
const picked=['s1','s3'];
D.ctx.document.querySelectorAll=function(sel){
  if(sel==='.sel_stocklog:checked'||sel==='.sel_stocklog'){
    return picked.map(id=>{const e=elStub();e.checked=true;e.getAttribute=function(k){return k==='data-id'?id:null;};return e;});
  }
  return [];
};
api.bulkDelete('stocklog');
ok(!!api.getModal(),'批量删除出入库明细弹出确认弹窗');
ok((api.getModal().bodyHtml||'').indexOf('同步回滚库存')>=0,'弹窗含「同步回滚库存」勾选项');
ok((api.getModal().bodyHtml||'').indexOf('电钻')>=0 && (api.getModal().bodyHtml||'').indexOf('膨胀螺丝')>=0,'预览列出两商品库存影响');
D.getEl('bulk_sl_adj').checked=true;
api.confirmModal();
// 风险降档：勾选回滚库存后需「二次确认」才真正执行
ok(!!api.getModal() && (api.getModal().title||'').indexOf('确认回滚库存')>=0,'勾选回滚库存后弹出二次确认（风险降档）');
ok(api.stockLog.length===3,'二次确认前不执行删除（防误触）');
api.confirmModal();
ok(api.stockLog.length===1 && api.stockLog[0].id==='s2','批量删除后仅剩 s2');
ok(api.products.find(p=>p.id==='p1').stock===0,'p1 库存联动：原3 ←删 s1(入库+3→减3)=0');
ok(api.products.find(p=>p.id==='p2').stock===40,'p2 库存联动：原50 ←删 s3(入库+10→减10)=40');
ok(api.delLog.filter(d=>d.type==='stocklog').length===2,'s1/s3 均写墓碑');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
