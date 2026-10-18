// 专项：云端同步判定（首次建立 / 冗余上传抑制 / 合并收敛）——含异步链路，故独立成套件
// 桩架沿用 _verify_fuzz2.js 的无头 mock（document/localStorage + __api shim）
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
  alert:()=>{},confirm:()=>true,
  URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
  WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
  Image:function(){this.width=0;this.height=0;},FileReader:function(){}};
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
  get todos(){return todos}, set todos(v){todos=v},
  get delLog(){return delLog}, set delLog(v){delLog=v},
  get cloud(){return cloud}, set cloud(v){cloud=v},
  get dirty(){return dirty}, set dirty(v){dirty=v},
  save, syncOnce, cloudActive, autoSyncOn, coerceNums, mergeIntoLocal,
  saveAllLocal, renderAll, renderCloudSpace, syncNow
};`;
vm.runInContext(script+shim,ctx,{filename:'wujin-sync'});
const api=ctx.__api;

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} };
let calls=[];
function stubFetch(rows){ calls=[]; ctx.fetch=(url,opt)=>{ calls.push((opt&&opt.method)||'GET'); return Promise.resolve({json:()=>Promise.resolve(rows),ok:true}); }; }
const reset=()=>{ api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:10,price:13,retail:13,wholesale:11,safe:0,cat:'',spec:''}];
  api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.stockLog=[];api.todos=[];api.delLog=[];
  api.cloud={enabled:true,autosync:true,url:'https://demo.supabase.co',key:'k',book:'demo',token:''}; api.dirty=false; };

(async()=>{
  console.log('云端同步专项\n');

  console.log('A. 首次建立');
  reset(); stubFetch([]);            // 云端口没有任何行
  await api.syncOnce();
  ok(calls.length===2 && calls[0]==='GET' && calls[1]==='PUT',
     '云端无数据行时：拉取后上传一次建立数据（实际 '+JSON.stringify(calls)+'）');

  console.log('B. 冗余上传抑制（既定优化，不能被破坏）');
  reset(); stubFetch([{data:{products:api.products,cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[]}}]);
  await api.syncOnce();
  ok(calls.length===1 && calls[0]==='GET',
     '云端已有行、本机无改动：仅拉取，不做冗余上传（实际 '+JSON.stringify(calls)+'）');

  console.log('C. 本地有改动时上传');
  reset(); stubFetch([{data:{products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[]}}]);
  api.dirty=true;
  await api.syncOnce();
  ok(calls.length===2 && calls[1]==='PUT','本机有未上传改动：拉取后上传（实际 '+JSON.stringify(calls)+'）');
  ok(api.dirty===false,'上传成功后「待上传」标记归零');

  console.log('D. 合并拉取（并集 + 墓碑取较晚）');
  reset();
  api.delLog=[{id:'c1',type:'cash',t:100}];
  stubFetch([{data:{products:[{id:'p2',name:'螺母',unit:'个',conv:{},stock:1,price:1}],cash:[{id:'c1',_t:300,type:'in',cat:'销售货款',amount:9,date:'2026-10-01'}],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[{id:'c1',type:'cash',t:500}]}}]);
  await api.syncOnce();
  ok(api.products.some(p=>p.id==='p2'),'拉取合并：云端新增的商品并入本机（并集不丢数据）');
  ok((api.delLog.find(d=>d.id==='c1')||{}).t===500,'拉取合并：墓碑取较晚时间戳（本机 100 / 云端 500 → 500）');
  ok(!api.cash.some(c=>c.id==='c1'),'拉取合并：较晚的删除生效，记录被清除');

  console.log('E. 坏数据不崩');
  reset(); stubFetch([{data:'坏结构'}]);        // data 非对象
  let crashed=false;
  try{ await api.syncOnce(); }catch(e){ crashed=true; }
  ok(!crashed,'云端 data 为坏结构：不抛错');
  reset(); stubFetch(null);                      // rows 为 null
  crashed=false;
  try{ await api.syncOnce(); }catch(e){ crashed=true; }
  ok(!crashed && calls.length===2,'云端返回空/异常：不抛错，且仍会建立数据（'+JSON.stringify(calls)+'）');

  console.log('\n==== 云端同步专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
  process.exit(fail?1:0);
})();
