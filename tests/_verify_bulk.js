// 专项：批量勾选删除在 5 个表上是否真的生效（各 kind 分派正确性）
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
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;this.height=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};},
    __frResult:'data:image/png;base64,AAAA',__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  const cloudStore=sharedCloud||{};
  ctx.fetch=(url,opts)=>{const u=String(url);const m=u.match(/book=eq\.([^&]+)/);const book=m?decodeURIComponent(m[1]):'__default__';const method=(opts&&opts.method)||'GET';
    if(method==='GET'){const rec=cloudStore[book];const rows=rec?[{data:rec.data,delLog:rec.delLog}]:[];return Promise.resolve({json:()=>Promise.resolve(rows),ok:true});}
    if(method==='PUT'){const body=opts&&opts.body?JSON.parse(opts.body):{};const d=body.data||{};cloudStore[book]={data:d,delLog:Array.isArray(d.delLog)?d.delLog:[]};return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}
    return Promise.resolve({json:()=>Promise.resolve([]),ok:true});};
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
  setCloud(c){cloud=c;},
  delProductData, delCashData, delFlowData, delPartyData,
  bulkRemove, bulkDelete, getSelIds,
  renderAll, saveAllLocal, tomb
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('bulk');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 构造数据：每个表 3 条
function seed(){
  api.products=[{id:'p1',name:'A',unit:'个',conv:{},stock:10,cost:1,price:2,cat:'',spec:'',safe:0},
                 {id:'p2',name:'B',unit:'个',conv:{},stock:20,cost:1,price:2,cat:'',spec:'',safe:0},
                 {id:'p3',name:'C',unit:'个',conv:{},stock:30,cost:1,price:2,cat:'',spec:'',safe:0}];
  api.cash=[{id:'c1',date:'2026-01-01',type:'in',amt:10,note:''},
            {id:'c2',date:'2026-01-02',type:'in',amt:20,note:''},
            {id:'c3',date:'2026-01-03',type:'in',amt:30,note:''}];
  api.flow=[{id:'f1',type:'buy',pid:'p1',pname:'A',qty:1,price:1,date:'2026-01-01',settle:'cash',partyId:'',unitName:'个',unitFactor:1,linkArIds:[]},
            {id:'f2',type:'buy',pid:'p2',pname:'B',qty:1,price:1,date:'2026-01-02',settle:'cash',partyId:'',unitName:'个',unitFactor:1,linkArIds:[]},
            {id:'f3',type:'sell',pid:'p3',pname:'C',qty:1,price:2,date:'2026-01-03',settle:'cash',partyId:'',unitName:'个',unitFactor:1,linkArIds:[]}];
  api.parties=[{id:'pa1',name:'甲',type:'cust'},{id:'pa2',name:'乙',type:'cust'},{id:'pa3',name:'丙',type:'cust'}];
  api.stockLog=[{id:'s1',pid:'p1',pname:'A',type:'in',src:'manual',qty:5,date:'2026-01-01',unit:'个',_t:1},
                {id:'s2',pid:'p2',pname:'B',type:'in',src:'manual',qty:5,date:'2026-01-02',unit:'个',_t:1},
                {id:'s3',pid:'p3',pname:'C',type:'in',src:'manual',qty:5,date:'2026-01-03',unit:'个',_t:1}];
  api.delLog=[];
}
// 模拟勾选：querySelectorAll 返回被勾选的 id 列表
function stubChecked(ids){
  D.document.querySelectorAll=(sel)=>{
    if(String(sel).indexOf(':checked')>=0) return ids.map(id=>({getAttribute:k=>k==='data-id'?id:null}));
    return [];
  };
}

console.log('批量勾选删除 · 各表 kind 分派专项\n');

// 1. 商品
seed(); stubChecked(['p1','p2']);
api.bulkDelete('product'); D.__confirm();
ok(api.products.length===1&&!api.products.find(p=>p.id==='p1')&&!api.products.find(p=>p.id==='p2'),
   'bulkDelete(product) 删掉勾选的 p1+p2（剩1条）');

// 2. 买卖
seed(); stubChecked(['f1','f2']);
api.bulkDelete('flow'); D.__confirm();
ok(api.flow.length===1&&!api.flow.find(f=>f.id==='f1')&&!api.flow.find(f=>f.id==='f2'),
   'bulkDelete(flow) 删掉勾选的 f1+f2（剩1条）');

// 3. 流水收支
seed(); stubChecked(['c1','c2']);
api.bulkDelete('cash'); D.__confirm();
ok(api.cash.length===1&&!api.cash.find(c=>c.id==='c1')&&!api.cash.find(c=>c.id==='c2'),
   'bulkDelete(cash) 删掉勾选的 c1+c2（剩1条）');

// 4. 往来单位
seed(); stubChecked(['pa1','pa2']);
api.bulkDelete('party'); D.__confirm();
ok(api.parties.length===1&&!api.parties.find(p=>p.id==='pa1')&&!api.parties.find(p=>p.id==='pa2'),
   'bulkDelete(party) 删掉勾选的 pa1+pa2（剩1条）');

// 5. 出入库明细
seed(); stubChecked(['s1','s2']);
api.bulkDelete('stocklog'); D.__confirm();
ok(api.stockLog.length===1&&!api.stockLog.find(s=>s.id==='s1')&&!api.stockLog.find(s=>s.id==='s2'),
   'bulkDelete(stocklog) 删掉勾选的 s1+s2（剩1条）');

// 6. 删商品时级联（关联买卖/现金/欠款一并处理）
seed(); stubChecked(['p1']);
api.bulkDelete('product'); D.__confirm();
ok(!api.flow.find(f=>f.pid==='p1'),'bulkDelete(product) 连带删掉该商品的买卖 f1');

console.log('\n==== 批量删除专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
process.exit(fail?1:0);
