// 全局 bug 扫描台：校验核心不变量 + 边界 fuzz + 渲染异常捕获 + 云合并
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('wujin-workbench.html','utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag){const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,indeterminate:false,set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this.children.length?this.children.map(c=>c._html||'').join(''):this._html;},classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},replaceChild(){},remove(){},setAttribute(){},getAttribute(){return null;},removeAttribute(){},focus(){},scrollIntoView(){},closest(){return elStub();},querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[{textContent:'',text:'',value:''}],options:[{textContent:'',text:'',value:''}],selectedIndex:0,click(){},style:{},width:0,height:0,getContext(){return{drawImage(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(4,(w*h*4)||4))}),putImageData(){}};},toBlob(cb){cb({type:'image/jpeg'});},toDataURL:()=>'data:image/jpeg;base64,AAAA'};return self;}
function makeDevice(name,sharedCloud){const elements={};const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],body:{classList:makeClassList(),appendChild(e){ctx.__appended=(ctx.__appended||[]);ctx.__appended.push(e);}},addEventListener(){}};
  const localStore={};const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},confirm:(m)=>true,prompt:(m)=>ctx.__promptRet||'',URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},Image:function(){const self=this;this.width=1600;this.height=1600;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload({target:this});};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload({target:this});};},__frResult:'data:image/png;base64,AAAA',__fetchLog:[],__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;const cloudStore=sharedCloud||{};ctx.__cloudStore=cloudStore;ctx.__fetchLog=[];
  ctx.fetch=(url,opts)=>{const u=String(url);const m=u.match(/book=eq\.([^&]+)/);const book=m?decodeURIComponent(m[1]):'__default__';const method=(opts&&opts.method)||'GET';ctx.__fetchLog.push({method,storage:u.indexOf('/storage/v1/')>=0});// 忠实模拟真实 Supabase：表只有 data(JSON,内嵌 delLog/stockLog) + updated_at 两列，无顶层 delLog/stockLog
if(method==='GET'){const rec=cloudStore[book];const rows=rec?[{data:rec.data,updated_at:rec.updated_at||new Date().toISOString()}]:[];return Promise.resolve({json:()=>Promise.resolve(rows),ok:true});}if(method==='PUT'){const body=opts&&opts.body?JSON.parse(opts.body):{};const d=body.data||{};cloudStore[book]={data:d,updated_at:body.updated_at||new Date().toISOString()};return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}if(method==='DELETE'){delete cloudStore[book];return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}return Promise.resolve({json:()=>Promise.resolve([]),ok:true});};
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={get products(){return products},set products(v){products=v},get cash(){return cash},set cash(v){cash=v},get flow(){return flow},set flow(v){flow=v},get todos(){return todos},set todos(v){todos=v},get parties(){return parties},set parties(v){parties=v},get ar(){return ar},set ar(v){ar=v},get delLog(){return delLog},set delLog(v){delLog=v},get stockLog(){return stockLog},set stockLog(v){stockLog=v},setCloud(c){cloud=c;},get cloud(){return cloud},commitFlow,commitRefund,delFlowData,delProductData,clearProductRecordsKeep,renderAll,adj,tomb,saveAllLocal,clearAll,delStockLog,editStockLog,flowIdsOfStockLogs,showStockHist,saveFlowEdit,undoLast,showFlowHist,showProductHist,saveProductEdit,saveCashEdit,addProduct,editProduct,stripConv,backfillNames,pnameOf,syncOnce,mergeIntoLocal,restoreLocal,restoreCloud,bulkDelete,clearByProduct,clearByCat,clearBySpec,clearByDate,clearByBiz,renderKPI,migrateUnits,unitOptsHTML,slUnitOptions,importJSON,parseImportData,doCollect,collect,delCashData,delPartyData,bulkRemove,mergeArr,applyTombstones,addCash,addFlow,addParty,purgeAr,recvSum,partyBalance,parseSmart,smartParseLine,smartClassify,smartParseTable,smartParseConvText,smartApplyItems,smartApplyProduct,smartApplyFlow,smartApplyCash,smartApplyParty,clone,smartUndo,smartParseOne,smartParseLineMulti,smartSplitItems,smartAmount,smartDate,smartParty,smartNorm,smartOcrDate,smartOcrRows,smartOCR,smartOCRBaidu,smartOCRSpace,fetchBaidu,loadOcrCfg,saveOcrCfg,getBaiduToken,getOcrBusy:()=>_ocrBusy,csvToTextRows,smartTableize,renderOcrTable,ocrRowsToItems,cloudSig,flushLocal,propagateProductRename,propagatePartyRename,delTodo,clearDoneTodos,locSelectHTML,onLocChange,locBadge,renderLocMgr,renameLoc,delLoc,addLocSetting,get cfg(){return cfg},set cfg(v){cfg=v},confirmModal(){const m=globalThis.__modal;if(m&&m.fn){const r=m.fn();if(r!=='__keep_modal__')globalThis.__modal=null;}},getModal(){return globalThis.__modal;},save,getStockList,getFlowList,getProductMap,switchTab,lvStep,setPageSize,todayStr,addDays,uid,money,round2,fmtNum,esc,renderCash,fmtSyncTime,renderLastSync,markSynced,toggleAcc,renderVersionLog,attachTabGestures,handleTabTap,tabScrollTo,TAB_GESTURE_TARGET,get VERSION_LOG(){return VERSION_LOG},bumpUsage,productOptionsHTML,fillParty,get usage(){return usage},set usage(v){usage=v}};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-bugscreen'});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};const md=ctx.document.getElementById('mDetail');if(md)md.innerHTML=bodyHtml||'';const mt=ctx.document.getElementById('mTitle');if(mt)mt.textContent=title||'';
    // 模拟浏览器解析 HTML 默认勾选/禁用态（elStub 本身不解析）：仅对出入库编辑/删除弹窗生效，避免影响其他弹窗用例
    const bh=bodyHtml||'';
    if(/sl_synflow|sl_delflow/.test(bh)){ const re=/<input\b[^>]*\bid="([^"]+)"[^>]*>/g; let mm; while((mm=re.exec(bh))){ const id=mm[1], tag=mm[0], el=ctx.document.getElementById(id); if(/\bchecked\b/.test(tag)) el.checked=true; if(/\bdisabled\b/.test(tag)) el.disabled=true; } }
  };
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0,found=[];
function ok(c,msg){if(c){pass++;}else{fail++;found.push(msg);console.log('  FAIL '+msg);}}

const D=makeDevice('D');const api=D.api,ctx=D.ctx;

function isNum(x){return typeof x==='number'&&isFinite(x);}
function round2(x){return Math.round(x*100)/100;}
function round3(x){return Math.round(x*1000)/1000;}

function freshScenario(){
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];
  ctx.cfg={};
  const P=[];
  ['螺丝','扳手','电钻'].forEach((n,i)=>{const id='P'+i;api.products.push({id,name:n,cat:'工具',spec:'',unit:'个',conv:{},loc:'1库',_t:1,stock:0,safe:10,cost:1,wholesale:2,retail:3,price:3,note:''});P.push(id);});
  const A=[];
  ['张三','李四'].forEach((n,i)=>{const id='A'+i;api.parties.push({id,name:n,type:i?'供应商':'客户',contact:'',phone:'',addr:'',note:''});A.push(id);});
  return {P,A};
}
function expectedStock(pid){let s=0;api.stockLog.forEach(r=>{if(r.pid===pid)s+=(r.type==='in'?1:-1)*(Number(r.qty)||0);});return round3(s);}
function expectedCashNet(month){let inc=0,out=0;api.cash.forEach(c=>{if(c.date&&c.date.startsWith(month)){if(c.type==='in')inc+=Number(c.amount)||0;else out+=Number(c.amount)||0;}});return round3(inc-out);}
function expectedPartyBalance(pid,kind){let bal=0;api.ar.forEach(a=>{if(a.partyId===pid&&a.kind===kind)bal+=(Number(a.amount)||0)-(Number(a.paidAmount)||0);});return round3(bal);}

(async()=>{
console.log('\n=== A. 库存台账一致性（commitFlow buy/sell/refund）===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:1,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  api.commitFlow({pid:P[0],qty:3,price:5,type:'sell',uname:'个',ufactor:1,settle:'ar',partyId:'A0',partyName:'张三',date:today,pname:'螺丝',note:''});
  api.commitRefund({pid:P[0],qty:2,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const p=api.products.find(x=>x.id===P[0]);
  ok(round3(p.stock)===expectedStock(P[0]),'A1 螺丝库存=台账推算('+p.stock+' vs '+expectedStock(P[0])+')');
  ok(p.stock===9,'A2 螺丝最终库存应为9(10-3+2) 实际='+p.stock);
  ok(isNum(p.stock)&&!isNaN(p.stock),'A3 库存非NaN');
  const net=expectedCashNet(today.slice(0,7));
  const csNetEl=D.getEl('csNet');
  api.switchTab('cash'); api.renderAll();
  ok(round3(Number(String(csNetEl.textContent).replace(/[^\d.\-]/g,''))||0)===net,'A4 现金净额显示=推算('+csNetEl.textContent+' vs '+net+')');
  ok(round3(api.partyBalance('A0','receivable'))===expectedPartyBalance('A0','receivable'),'A5 张三应收=推算('+api.partyBalance('A0','receivable')+' vs '+expectedPartyBalance('A0','receivable')+')');
  ok(api.partyBalance('A0','receivable')===15,'A6 张三应收应为15 实际='+api.partyBalance('A0','receivable'));
}

console.log('\n=== B. 删除流水后库存/现金/应收回滚一致 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[1],qty:5,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'扳手',partyName:''});
  api.commitFlow({pid:P[1],qty:2,price:8,type:'sell',uname:'个',ufactor:1,settle:'ar',partyId:'A1',partyName:'李四',date:today,pname:'扳手',note:''});
  const beforeStock=api.products.find(x=>x.id===P[1]).stock;
  const sellFlow=api.flow.find(f=>f.type==='sell');
  api.delFlowData(sellFlow.id);
  const afterStock=api.products.find(x=>x.id===P[1]).stock;
  ok(afterStock===beforeStock+2,'B1 删销售后库存回滚+2('+beforeStock+'→'+afterStock+')');
  ok(round3(api.products.find(x=>x.id===P[1]).stock)===expectedStock(P[1]),'B2 删后库存=台账('+api.products.find(x=>x.id===P[1]).stock+' vs '+expectedStock(P[1])+')');
  ok(api.ar.filter(a=>a.partyId==='A1').length===0,'B3 删销售后关联应收已删(剩'+api.ar.filter(a=>a.partyId==='A1').length+')');
  ok(api.cash.length===1,'B4 进货现金仍在(剩'+api.cash.length+')');
}

console.log('\n=== C. 删除商品后级联清理 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[2],qty:4,price:3,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'电钻',partyName:''});
  api.delProductData(P[2]);
  ok(!api.products.find(x=>x.id===P[2]),'C1 商品已删');
  ok(api.flow.filter(f=>f.pid===P[2]).length===0,'C2 关联流水已删');
  ok(api.cash.filter(c=>c.note&&c.note.indexOf('电钻')>=0).length===0,'C3 关联现金已删');
  ok(api.stockLog.filter(s=>s.pid===P[2]).length===0,'C4 关联台账已删');
}

console.log('\n=== D. NaN / 负数 边界 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:100,price:1,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const p=api.products.find(x=>x.id===P[0]);
  ok(p.stock===0,'D1 超量销售库存触底0(实际='+p.stock+')');
  ok(p.stock>=0,'D2 库存不为负');
  api.commitFlow({pid:P[0],qty:2,price:undefined,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const lastCash=api.cash[api.cash.length-1];
  ok(isNum(lastCash.amount)&&!isNaN(lastCash.amount),'D3 缺失price不产NaN金额(实际='+lastCash.amount+')');
}

console.log('\n=== E. 渲染异常捕获（边界数据下 renderAll 不抛）===');
{
  let threw=null;
  try{
    api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.stockLog=[];api.delLog=[];
    api.renderAll();
    api.products=[{id:'X',name:'超长商品名'.repeat(50),cat:'分类'.repeat(20),spec:'规格'.repeat(20),unit:'个',conv:{},loc:'1库',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:'备注'.repeat(50)}];
    api.renderAll();
    api.products=[{id:'Y',name:'缺字段'}];
    api.renderAll();
    api.products=[{id:'Z',name:'坏数据',stock:NaN,safe:undefined,price:NaN,conv:null}];
    api.renderAll();
  }catch(e){ threw=e; }
  ok(!threw,'E1 renderAll 边界数据不抛异常'+(threw?(' → '+threw.message):''));
}

console.log('\n=== F. 畸形导入不崩溃 ===');
{
  let threw=null;
  try{
    api.importJSON({target:null,data:{products:[{id:'BAD',name:'x',stock:'NaN',price:null}],cash:[{id:1,type:'in',amount:undefined}],flow:[{id:2}]}});
    api.renderAll();
  }catch(e){ threw=e; }
  ok(!threw,'F1 畸形导入不崩溃'+(threw?(' → '+threw.message):''));
  let threw2=null;
  try{ api.importJSON('not an object'); }catch(e){ threw2=e; }
  ok(!threw2,'F2 导入非对象参数不崩溃');
}

console.log('\n=== G. 云同步合并：数据不丢 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:3,price:1,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const localCount=api.products.length+api.flow.length+api.cash.length;
  api.setCloud({enabled:true,url:'http://fake',key:'k',book:'__default__',token:''});
  const cloud={products:[...api.products,{id:'P9',name:'云端独有',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:2,stock:0,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}],flow:[...api.flow],cash:[...api.cash],ar:api.ar,stockLog:api.stockLog,delLog:[]};
  ctx.__cloudStore['__default__']={data:cloud,delLog:[]};
  await api.syncOnce();
  const merged=api.products.find(x=>x.id==='P9');
  ok(!!merged,'G1 云端独有商品已合并进来');
  ok(P.every(id=>api.products.find(x=>x.id===id))&&api.products.length===4&&api.flow.length>=1&&api.cash.length>=1,'G2 合并后本地数据不丢(P0/P1/P2保留+云端P9，flow/cash不丢)');
}

console.log('\n=== H. saveFlowEdit 原地编辑后现金/库存/应收一致 ===');
{
  const {P,A}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow.find(x=>x.type==='buy');
  const stockBefore=api.products.find(x=>x.id===P[0]).stock;
  D.getEl('ef_qty').value='4';D.getEl('ef_price').value='3';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
  api.saveFlowEdit(f.id);
  const p=api.products.find(x=>x.id===P[0]);
  ok(p.stock===4,'H1 编辑后库存=4(原'+stockBefore+'→回退→+4，实际='+p.stock+')');
  const c=api.cash.find(x=>x.id===f.linkCashId);
  ok(c&&isNum(c.amount)&&c.amount===12,'H2 现金金额随编辑变12(实际='+(c?c.amount:'无')+')');
  ok(f.qty===4&&f.price===3,'H3 流水数量单价已更新(实际 qty='+f.qty+' price='+f.price+')');
  api.commitFlow({pid:P[1],qty:5,price:4,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A[0],partyName:'张三',date:today,pname:'扳手'});
  const sf=api.flow.find(x=>x.type==='sell'&&x.settle==='credit');
  D.getEl('ef_qty').value='2';D.getEl('ef_price').value='6';D.getEl('ef_settle').value='credit';D.getEl('ef_party').value=A[0];D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
  api.saveFlowEdit(sf.id);
  const a=api.ar.find(x=>x.id===sf.linkArIds[0]);
  ok(a&&a.amount===12,'H4 赊账销售编辑后应收=2×6=12(实际='+(a?a.amount:'无')+')');
  ok(round3(api.partyBalance(A[0],'receivable'))===12,'H5 张三应收余额=12(实际='+api.partyBalance(A[0],'receivable')+')');
}

console.log('\n=== I. bulkRemove 批量级联删除 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:3,price:1,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  api.commitFlow({pid:P[1],qty:2,price:1,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'扳手',partyName:''});
  const n=api.bulkRemove('product',[P[0],P[1]]);
  ok(n===2,'I1 批量删2个商品(实际='+n+')');
  ok(!api.products.find(x=>x.id===P[0])&&!api.products.find(x=>x.id===P[1]),'I2 两商品已删');
  ok(api.flow.length===0,'I3 关联流水级联删(剩'+api.flow.length+')');
  ok(api.cash.length===0,'I4 关联现金级联删(剩'+api.cash.length+')');
  ok(api.stockLog.length===0,'I5 关联台账级联删(剩'+api.stockLog.length+')');
}

console.log('\n=== J. doCollect 收款核销与超额封顶 ===');
{
  const {P,A}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:5,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A[0],partyName:'张三',date:today,pname:'螺丝'});
  ok(api.partyBalance(A[0],'receivable')===50,'J1 欠款=50(实际='+api.partyBalance(A[0],'receivable')+')');
  api.doCollect(A[0],'receivable',20);
  ok(api.cash.some(c=>c.type==='in'&&c.amount===20),'J2 现金收到20入账');
  ok(api.partyBalance(A[0],'receivable')===30,'J3 收款后余额=30(实际='+api.partyBalance(A[0],'receivable')+')');
  api.doCollect(A[0],'receivable',999);
  ok(api.partyBalance(A[0],'receivable')===0,'J4 超额收款按余额封顶→结清0(实际='+api.partyBalance(A[0],'receivable')+')');
}

console.log('\n=== K. clearProductRecordsKeep 清记录留商品 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:7,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  api.clearProductRecordsKeep(P[0]);
  const p=api.products.find(x=>x.id===P[0]);
  ok(!!p,'K1 商品仍保留');
  ok(p.stock===0,'K2 库存清零(实际='+p.stock+')');
  ok(api.flow.filter(f=>f.pid===P[0]).length===0,'K3 关联流水清空');
  ok(api.cash.length===0,'K4 关联现金清空');
  ok(api.stockLog.filter(s=>s.pid===P[0]).length===0,'K5 关联台账清空');
}

console.log('\n=== L. undoLast 撤销编辑恢复联动 ===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow.find(x=>x.type==='buy');
  const cashId=f.linkCashId;
  D.getEl('ef_qty').value='4';D.getEl('ef_price').value='3';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
  api.saveFlowEdit(f.id);
  ok(api.products.find(x=>x.id===P[0]).stock===4,'L1 编辑后库存=4');
  ok(api.cash.find(x=>x.id===cashId).amount===12,'L2 编辑后现金=12');
  api.undoLast('flow',f.id,true);
  ok(api.products.find(x=>x.id===P[0]).stock===10,'L3 撤销后库存恢复=10(实际='+api.products.find(x=>x.id===P[0]).stock+')');
  ok(api.cash.find(x=>x.id===cashId).amount===20,'L4 撤销后现金恢复=20(实际='+api.cash.find(x=>x.id===cashId).amount+')');
  ok(f.qty===10&&f.price===2,'L5 撤销后流水数量单价恢复(实际 qty='+f.qty+' price='+f.price+')');
}

console.log('\n=== M. OCR/粘贴解析 边界不崩、无NaN ===');
{
  let threw=null;
  const items=[];
  const pushIt=it=>{ if(!it)return; if(Array.isArray(it)){ it.forEach(x=>{ if(x&&typeof x==='object') items.push(x); }); } else if(typeof it==='object') items.push(it); };
  try{
    const messy=['','   ','螺丝5个3元','张三 赊账 螺丝10个 单价2.5','2026/1/1 进货 扳手3把 15元 供应商李四','合计100元','详见附件','¥1,234.5 收入 微信','电钻5台130元 扳手2把','螺母 盒=4 个 一盒8元','螺丝1000个 ¥0.5 退货',null,'undefined','a1b2c3','收入500支出300',
      '商品\t数量\t单价\n螺丝\t5\t3\n扳手\t2\t8',
      '品名 数量 单价 金额\n螺丝 5 3 15\n扳手 2 8 16\n合计 31'];
    messy.forEach(s=>{
      pushIt(api.smartParseLine(s,'all'));
      pushIt(api.smartParseLineMulti(s,'flow'));
      pushIt(api.smartParseLineMulti(s,'product'));
      pushIt(api.parseSmart(s,'all'));
      pushIt(api.parseSmart(s,'flow'));
      pushIt(api.parseSmart(s,'product'));
    });
    const rows=api.smartOcrRows('螺丝5个3元\n扳手2把8元\n合计11');
    pushIt(api.ocrRowsToItems('flow', api.todayStr(), rows));
    pushIt(api.ocrRowsToItems('product', api.todayStr(), rows));
  }catch(e){ threw=e; }
  ok(!threw,'M1 解析函数边界不抛异常'+(threw?(' → '+threw.message):''));
  let nanCnt=0,bad=[];
  items.forEach(it=>{ ['amount','price','qty','stock','cost','retail'].forEach(k=>{ const cv=+it[k]; if(it[k]!==undefined&&it[k]!==null&&!isNum(cv)){ nanCnt++; if(bad.length<3)bad.push(it.kind+'.'+k+'='+it[k]); } }); });
  ok(nanCnt===0,'M2 解析结果金额/数量经消费层(+x||0)后均有限(异常='+nanCnt+(bad.length?(' '+bad.join(',')):''));
}

console.log('\n=== N. 账目交叉核对（独立重算 vs 系统值）===');
{
  const {P,A}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  api.commitFlow({pid:P[0],qty:4,price:3,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  api.commitFlow({pid:P[0],qty:2,price:3,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A[0],partyName:'张三',date:today,pname:'螺丝'});
  api.commitFlow({pid:P[1],qty:5,price:1,type:'buy',uname:'个',ufactor:1,settle:'credit',partyId:A[1],partyName:'李四',date:today,pname:'扳手'});
  api.commitRefund({pid:P[0],qty:1,price:3,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  let inc=0,out=0;api.cash.forEach(c=>{if(c.type==='in')inc+=Number(c.amount)||0;else out+=Number(c.amount)||0;});
  const net=round3(inc-out), sysNet=round3(expectedCashNet(today.slice(0,7)));
  ok(net===sysNet,'N1 现金净额独立重算=系统值('+net+'='+sysNet+')');
  const recv=round3(api.partyBalance(A[0],'receivable')+api.partyBalance(A[1],'payable'));
  ok(recv===11,'N2 应收+应付独立重算=11(实际='+recv+')');
  const p0=api.products.find(x=>x.id===P[0]),p1=api.products.find(x=>x.id===P[1]);
  ok(round3(p0.stock)===expectedStock(P[0])&&round3(p1.stock)===expectedStock(P[1]),'N3 库存=台账独立重算');
  ok(p0.stock===5&&p1.stock===5,'N4 螺丝=5/扳手=5(实际='+p0.stock+'/'+p1.stock+')');
  ok(new Set(api.flow.map(x=>x.id)).size===api.flow.length,'N5 流水id无重复');
  ok(new Set(api.cash.map(x=>x.id)).size===api.cash.length,'N6 现金id无重复');
  ok(new Set(api.ar.map(x=>x.id)).size===api.ar.length,'N7 应收id无重复');
}

console.log('\n=== O. 跨设备云同步收敛（无覆盖/丢失/损坏）===');
{
  const sharedCloud={};
  const DA=makeDevice('DevA',sharedCloud),A=DA.api;
  const DB=makeDevice('DevB',sharedCloud),B=DB.api;
  const today=api.todayStr();
  [DA,DB].forEach(dev=>{const d=dev.api;d.products=[];d.cash=[];d.flow=[];d.parties=[];d.ar=[];d.delLog=[];d.stockLog=[];d.cfg={};d.setCloud({enabled:true,url:'http://fake',key:'k',book:'__default__',token:''});});
  ['螺丝','扳手'].forEach((n,i)=>A.products.push({id:'PA'+i,name:n,cat:'',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:0,safe:0,cost:1,wholesale:2,retail:3,price:3,note:''}));
  A.commitFlow({pid:'PA0',qty:10,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  await A.syncOnce();
  await B.syncOnce();
  ok(B.products.length===2&&B.flow.length===1&&B.cash.length===1,'O1 B从云端拉到A的数据(商品'+B.products.length+'/流水'+B.flow.length+'/现金'+B.cash.length+')');
  const bp=B.products.find(x=>x.id==='PA0');bp.price=99;bp._t=Date.now();B.save('products',B.products);
  await B.syncOnce();await A.syncOnce();
  const ap=A.products.find(x=>x.id==='PA0');
  ok(ap&&ap.price===99,'O2 A拉到B的编辑(price='+(ap?ap.price:'无')+')');
  const af=A.flow.find(x=>x.type==='buy');
  A.delFlowData(af.id);
  await A.syncOnce();await B.syncOnce();
  ok(B.flow.length===0&&B.cash.length===0,'O3 删除+级联已跨设备传播(流水'+B.flow.length+'/现金'+B.cash.length+')');
  const FUT=5000000000000;
  const a1=A.products.find(x=>x.id==='PA1');a1.price=5;a1._t=FUT+1000;A.save('products',A.products);
  const b1=B.products.find(x=>x.id==='PA1');b1.price=7;b1._t=FUT+2000;B.save('products',B.products);
  await A.syncOnce();await B.syncOnce();await A.syncOnce();await B.syncOnce();
  const a1f=A.products.find(x=>x.id==='PA1'),b1f=B.products.find(x=>x.id==='PA1');
  ok(a1f&&b1f&&a1f.price===7&&b1f.price===7,'O4 并发改同一商品按_t最新胜出且两端一致(='+a1f.price+'/'+b1f.price+')');
  await A.syncOnce();await B.syncOnce();await A.syncOnce();await B.syncOnce();
  const a1g=A.products.find(x=>x.id==='PA1'),b1g=B.products.find(x=>x.id==='PA1');
  ok(a1g&&b1g&&a1g.price===7&&b1g.price===7,'O5 多次重复同步幂等无漂移(='+a1g.price+'/'+b1g.price+')');
  A.commitFlow({pid:'PA0',qty:4,price:1,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  await A.syncOnce();await B.syncOnce();
  ok(B.stockLog.length===A.stockLog.length&&B.stockLog.length>=1,'O6 出入库台账跨设备同步(云端='+B.stockLog.length+'/本地A='+A.stockLog.length+')');
}

console.log('\n=== P. 编辑切换结算方式 重建一致 ===');
{
  const {P,A}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:8,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow.find(x=>x.type==='buy');
  const cashBefore=api.cash.length;
  D.getEl('ef_qty').value='8';D.getEl('ef_price').value='2';D.getEl('ef_settle').value='credit';D.getEl('ef_party').value=A[1];D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
  api.saveFlowEdit(f.id);
  const f2=api.flow.find(x=>x.type==='buy'&&x.settle==='credit');
  ok(api.cash.length===cashBefore-1,'P1 切换为赊账后原现金记录已移除(现金'+api.cash.length+')');
  ok(api.ar.some(a=>a.partyId===A[1]&&a.amount===16),'P2 赊账新建应付16(8×2)');
  ok(api.products.find(x=>x.id===P[0]).stock===8,'P3 库存不受结算切换影响(=8)');
  D.getEl('ef_qty').value='8';D.getEl('ef_price').value='2';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
  api.saveFlowEdit(f2.id);
  ok(api.cash.length===cashBefore,'P4 切回现金后现金恢复(现金'+api.cash.length+')');
  ok(!api.ar.some(a=>a.partyId===A[1]),'P5 原赊账应付已随切换清除');
}

console.log('\n=== Q. 金额显示格式 money() ===');
{
  const cases=[[0,'¥0'],[12,'¥12'],[1234.5,'¥1,234.5'],[-5,'¥-5'],[9999999.99,'¥9,999,999.99'],[12.345,'¥12.35']];
  let allOk=true,bad=[];
  cases.forEach(([v,exp])=>{const got=api.money(v);if(got!==exp){allOk=false;bad.push(v+'→'+got+'≠'+exp);}});
  ok(allOk,'Q1 money格式/四舍五入正确('+(bad.length?bad.join('; '):'全对')+')');
}

console.log('\n=== R. 商品/往来改名联动 ===');
{
  const {P,A}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:3,price:2,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A[0],partyName:'张三',date:today,pname:'螺丝'});
  const f=api.flow.find(x=>x.type==='sell');
  const sl=api.stockLog.find(x=>x.fid===f.id);
  const p=api.products.find(x=>x.id===P[0]);p.name='螺丝(新)';api.propagateProductRename(P[0],'螺丝(新)');
  ok(api.flow.find(x=>x.id===f.id).pname==='螺丝(新)','R1 流水商品名已联动');
  ok(api.stockLog.find(x=>x.id===sl.id).pname==='螺丝(新)','R2 台账商品名已联动');
  const a=api.ar.find(x=>x.id===f.linkArIds[0]);
  const party=api.parties.find(x=>x.id===A[0]);party.name='张三(新)';api.propagatePartyRename(A[0],'张三(新)');
  ok(api.ar.find(x=>x.id===a.id).party==='张三(新)','R3 应收往来名已联动');
}

console.log('\n=== S. 云端「上次成功同步」时间戳 ===');
{
  const dev=makeDevice('DevS',{}),S=dev.api;
  S.products=[];S.cash=[];S.flow=[];S.parties=[];S.ar=[];S.delLog=[];S.stockLog=[];S.cfg={};
  S.setCloud({enabled:true,url:'http://fake',key:'k',book:'__default__',token:'',bucket:'wujin-pics',lastSync:0});
  ok(api.fmtSyncTime(0)==='尚未同步','S1 fmtSyncTime(0)="尚未同步"(实际='+api.fmtSyncTime(0)+')');
  ok(api.fmtSyncTime(Date.now()).indexOf('今天')===0,'S2 fmtSyncTime(现在)以"今天"开头(实际='+api.fmtSyncTime(Date.now())+')');
  const y=new Date();y.setDate(y.getDate()-1);
  ok(api.fmtSyncTime(y.getTime()).indexOf('昨天')===0,'S3 fmtSyncTime(昨天)以"昨天"开头(实际='+api.fmtSyncTime(y.getTime())+')');
  await S.syncOnce();
  ok(isNum(S.cloud.lastSync)&&S.cloud.lastSync>0,'S4 同步成功后 cloud.lastSync 已记录为时间戳('+S.cloud.lastSync+')');
  const persisted=JSON.parse(dev.ctx.localStorage.getItem('wb_wujin_cloud')||'{}');
  ok(isNum(persisted.lastSync)&&persisted.lastSync===S.cloud.lastSync,'S5 lastSync 已持久化到 localStorage wb_wujin_cloud');
  ok(dev.getEl('lastSyncLine').textContent.indexOf('今天')===0,'S6 面板内 #lastSyncLine 显示"今天…"(实际='+dev.getEl('lastSyncLine').textContent+')');
  const bar=dev.getEl('syncBar');
  ok(!bar.classList.contains('hide')&&bar.innerHTML.indexOf('上次同步')>=0,'S7 标题栏 #syncBar 显示且文案正确(实际='+bar.innerHTML.slice(0,40)+'…)');
  S.setCloud({enabled:true,url:'http://fake',key:'k',book:'__default__',token:'',bucket:'wujin-pics',lastSync:0});
  S.renderLastSync();
  ok(dev.getEl('lastSyncLine').textContent==='尚未同步','S8 重置 lastSync=0 后显示"尚未同步"');
}

console.log('\n=== T. 设置折叠 + 版本说明通俗化（回归） ===');
{
  // T1: 版本说明全文不含技术黑话（防止日后又把行话写回去）
  const jargon=/Supabase|WebSocket|_t|墓碑|NaN|渲染结果缓存|惰性|SVG|断言|扫描台|localStorage|migrateUnits|conv\b|数据列内嵌|delLog|stockLog|云端面板|renderAll/i;
  const allDesc=api.VERSION_LOG.map(r=>r.v+' '+r.tag+' '+r.desc).join(' ');
  ok(!jargon.test(allDesc),'T1 版本说明全文不含技术黑话');
  // T2: 版本说明渲染不含自带 <h3>（折叠头由外层提供，避免重复标题）
  const box=D.getEl('versionLog'); api.renderVersionLog();
  ok(box.innerHTML.indexOf('<h3')<0,'T2 版本说明渲染不含自带<h3>');
  ok(box.innerHTML.indexOf('你现在用的版本')>=0,'T3 版本说明含通俗引导语');
  // T4/T5: 数据清空默认收起，点击后展开
  const acc=D.getEl('accClear'); ok(acc.classList.contains('open')===false,'T4 数据清空默认收起');
  api.toggleAcc('accClear'); ok(acc.classList.contains('open')===true,'T5 点击后数据清空展开且懒加载下拉');
  // T6: 版本说明默认收起，点击后展开
  const accV=D.getEl('accVersion'); ok(accV.classList.contains('open')===false,'T6 版本说明默认收起');
  api.toggleAcc('accVersion'); ok(accV.classList.contains('open')===true,'T7 点击后版本说明展开');
  // T8/T9: 库存位置管理默认收起，展开后才懒加载渲染（默认预设 1库/2库/3库）
  const accL=D.getEl('accLoc'); ok(accL.classList.contains('open')===false,'T8 库存位置管理默认收起');
  const locBoxBefore=D.getEl('locMgr'); ok((locBoxBefore.innerHTML||'').length===0,'T8b 收起时位置列表未渲染（懒加载）');
  api.toggleAcc('accLoc'); ok(accL.classList.contains('open')===true,'T9 点击后库存位置展开');
  ok(D.getEl('locMgr').innerHTML.indexOf('1库')>=0,'T9b 展开后位置列表已渲染默认预设(1库)');
  // T10/T11: 数据自检默认收起，点击后展开
  const accS=D.getEl('accSelf'); ok(accS.classList.contains('open')===false,'T10 数据自检默认收起');
  api.toggleAcc('accSelf'); ok(accS.classList.contains('open')===true,'T11 点击后数据自检展开');
}

console.log('\n=== U. 录入顺手/看数直观/少出错（v1.13.0 新增）===');
{
  // U1: 四个快捷记账按钮不报错并切换标签
  let threw=null;
  try{ ctx.quickFlow('sell'); ctx.quickFlow('buy'); ctx.quickCash('in'); ctx.quickCash('out'); }catch(e){ threw=e; }
  ok(!threw,'U1 四个快捷记账按钮调用不抛异常'+(threw?(' → '+threw.message):''));
  ok(D.getEl('tab-cash').classList.contains('hide')===false,'U1b 快捷收款/付款后已切到出纳标签(可见)');
  // U2: 复制上一条相似录入
  { const _s=freshScenario(); const today=api.todayStr();
    ctx.quickFlow('sell');
    api.commitFlow({pid:_s.P[0],qty:10,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
    let t2=null; try{ ctx.copyLastFlow(); }catch(e){ t2=e; }
    ok(!t2,'U2 复制上一条不抛异常'+(t2?(' → '+t2.message):''));
    ok(Number(D.getEl('f_qty').value)===10,'U2b 复制后数量已填入(10) 实际='+D.getEl('f_qty').value);
    ok(Number(D.getEl('f_price').value)===5,'U2c 复制后单价已填入(5) 实际='+D.getEl('f_price').value);
  }
  // U3: 金额/数量异常二次确认（小额放行、大额走 confirm，harness 默认放行）
  ok(ctx.confirmIfAnomalous(5,100)===true,'U3 正常小额放行');
  ok(ctx.confirmIfAnomalous(200000,9999999)===true,'U3b 大额时 confirm 默认放行(harness)');
  // U4: 新手引导/桌面提示（harness 无 location 自动跳过，不干扰回归）
  let t4=null; try{ ctx.maybeOnboard(); ctx.renderAdd2Home(); ctx.dismissAdd2Home(); }catch(e){ t4=e; }
  ok(!t4,'U4 新手引导/桌面提示调用不抛异常'+(t4?(' → '+t4.message):''));
}

console.log('\n=== V. 常用商品/往来置顶（v1.13.0 并入）===');
{
  api.usage={p:{},pa:{}}; api.save('usage',api.usage); // 隔离：清空频次，避免 H 组编辑计次污染 V 组断言
  const _s=freshScenario();
  // V1: 初始无置顶 → 下拉按原数组顺序（P0 在 P2 前）
  let h0=ctx.productOptionsHTML();
  ok(h0.indexOf('value="P0"')<h0.indexOf('value="P2"'),'V1 初始未置顶时按原顺序(P0 在 P2 前)');
  // V2: 给 P2 记 3 次、P1 记 1 次使用 → P2 应排到最前、P1 其次、P0 最后
  api.bumpUsage('p','P2');api.bumpUsage('p','P2');api.bumpUsage('p','P2');api.bumpUsage('p','P1');
  let h1=ctx.productOptionsHTML();
  const i2=h1.indexOf('value="P2"'),i1=h1.indexOf('value="P1"'),i0=h1.indexOf('value="P0"');
  ok(i2<i1 && i1<i0,'V2 使用频次高的商品置顶(P2<P1<P0) 实际 idx='+i2+','+i1+','+i0);
  // V3: 置顶只动选项顺序，不改底层数组顺序（底层仍为 P0,P1,P2）
  ok(api.products[0].id==='P0'&&api.products[1].id==='P1'&&api.products[2].id==='P2','V3 底层 products 数组顺序未变(仍 P0,P1,P2)');
  // V4: 往来单位同理置顶
  api.bumpUsage('pa','A1');api.bumpUsage('pa','A1');
  const psel=D.getEl('f_party'); let t4=null;
  try{ ctx.fillParty(psel); }catch(e){ t4=e; }
  ok(!t4,'V4 fillParty 调用不抛异常'+(t4?(' → '+t4.message):''));
  const pa_html=psel.innerHTML||'';
  ok(pa_html.indexOf('value="A1"')<pa_html.indexOf('value="A0"'),'V4b 使用频次高的往来置顶(A1 在 A0 前)');
  // V5: usage 已写入 localStorage（持久化）
  const us=JSON.parse(ctx.localStorage.getItem('wb_wujin_usage')||'{}');
  ok((us.p&&us.p.P2===3)&&(us.pa&&us.pa.A1===2),'V5 使用频次已持久化到 localStorage(us.p.P2=3, us.pa.A1=2) 实际='+JSON.stringify(us));
  // V6: 编辑流水也计频次（saveFlowEdit）
  {
    const _e=freshScenario(); const today=api.todayStr();
    api.commitFlow({pid:_e.P[0],qty:2,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyId:_e.A[0],partyName:'张三'});
    const ef=api.flow[api.flow.length-1];
    ok(api.usage.p[_e.P[0]]===undefined && api.usage.pa[_e.A[0]]===undefined,'V6a 编辑前频次为空(commitFlow 不计)');
    D.getEl('ef_qty').value='3';D.getEl('ef_price').value='5';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value=_e.A[0];D.getEl('ef_date').value=today;D.getEl('ef_note').value='';
    api.saveFlowEdit(ef.id);
    ok(api.usage.p[_e.P[0]]===1,'V6b 编辑后商品频次+1 (实际='+(api.usage.p[_e.P[0]])+')');
    ok(api.usage.pa[_e.A[0]]===1,'V6c 编辑后往来频次+1 (实际='+(api.usage.pa[_e.A[0]])+')');
    const eh=ctx.productOptionsHTML();
    ok(eh.indexOf('value="'+_e.P[0]+'"')<eh.indexOf('value="'+_e.P[1]+'"'),'V6d 编辑后该商品已置顶(被编辑商品在同类前)');
  }
  // V7: 设置开关可关闭置顶（恢复原始顺序）
  {
    const _w=freshScenario();
    api.bumpUsage('p','P2');api.bumpUsage('p','P2');
    api.cfg.pinFrequent=false;
    let hw=ctx.productOptionsHTML();
    ok(hw.indexOf('value="P0"')<hw.indexOf('value="P2"'),'V7a 关闭置顶→恢复原始顺序(P0 在 P2 前) 即使 P2 频次高');
    api.cfg.pinFrequent=true;
    let hn=ctx.productOptionsHTML();
    ok(hn.indexOf('value="P2"')<hn.indexOf('value="P0"'),'V7b 重新开启→按频次置顶(P2 在 P0 前)');
  }
}

// Z 组：排查验证 — 字符串 qty 台账渲染 / 导入数值化 / 畸形云同步（固化回归，防 1.13.2 修复回退）
{
  console.log('=== Z. 字符串qty渲染/导入数值化/畸形云同步 ===');
  const {P}=freshScenario();
  api.stockLog=[
    {id:'z_s1',pid:P[0],pname:'螺丝',type:'in',src:'manual',qty:'5',unit:'个',date:'2026-08-07',_t:Date.now()},
    {id:'z_s2',pid:P[0],pname:'螺丝',type:'in',src:'manual',qty:5,unit:'个',date:'2026-08-07',_t:Date.now()}
  ];
  api.save('stocklog', api.stockLog);
  let threw=null; try{ api.renderAll(); }catch(e){ threw=e; }
  ok(!threw,'Z1 字符串qty台账 renderAll 不抛('+(threw?threw.message:'')+')');
  // Z2: 字符串qty导入后数值化（不被当文字拼接成'55'）。原断言依赖跨实例DOM渲染、易误报，改为纯逻辑验证
  const zp=api.parseImportData({stockLog:[
    {id:'z_s1',pid:'p1',pname:'螺丝',type:'in',src:'manual',qty:'5',unit:'个',date:'2026-08-07',_t:Date.now()},
    {id:'z_s2',pid:'p1',pname:'螺丝',type:'in',src:'manual',qty:5,unit:'个',date:'2026-08-07',_t:Date.now()}
  ]});
  ok(zp&&zp.stockLog.length===2&&zp.stockLog[0].qty===5&&zp.stockLog[1].qty===5,'Z2 字符串qty导入数值化为5(非拼接55)(实际='+(zp?JSON.stringify(zp.stockLog.map(r=>r.qty)):'null')+')');
}
{
  D.ctx.__frResult=JSON.stringify({products:[{id:'pz1',name:'测',unit:'个',conv:{},stock:0}],flow:[{id:'fz1',pid:'pz1',type:'sell',qty:'3',price:'2.5',unitName:'个',unitFactor:1,settle:'cash',date:'2026-08-07'}],cash:[{id:'cz1',type:'in',cat:'销售货款',amount:'7.5',date:'2026-08-07'}],parties:[{id:'az1',name:'甲'}],ar:[],stockLog:[{id:'sz1',pid:'pz1',pname:'测',type:'in',src:'manual',qty:'4',unit:'个',date:'2026-08-07'}],delLog:[]});
  let t3=null; try{ api.importJSON({target:{files:[{name:'x.json'}]}}); }catch(e){ t3=e; }
  ok(!t3,'Z3 importJSON 调用不抛('+(t3?t3.message:'')+')');
  const f=api.flow.find(x=>x.id==='fz1'),c=api.cash.find(x=>x.id==='cz1'),s=api.stockLog.find(x=>x.id==='sz1');
  ok(f&&typeof f.qty==='number'&&f.qty===3,'Z3b 导入后 flow.qty 数值化为3(实际='+(f&&f.qty)+')');
  ok(c&&typeof c.amount==='number'&&c.amount===7.5,'Z3c 导入后 cash.amount 数值化为7.5(实际='+(c&&c.amount)+')');
  ok(s&&typeof s.qty==='number'&&s.qty===4,'Z3d 导入后 stockLog.qty 数值化为4(实际='+(s&&s.qty)+')');
}
{
  D.ctx.__frResult='{ 这不是合法 json';
  let t4=null; try{ api.importJSON({target:{files:[{name:'bad.json'}]}}); }catch(e){ t4=e; }
  ok(!t4,'Z4 畸形JSON importJSON 不抛('+(t4?t4.message:'')+')');
  ok(Array.isArray(api.products),'Z4b 畸形JSON后本地 products 未被破坏');
  ok((D.ctx.__lastAlert||'').indexOf('格式不对')>=0,'Z4c 畸形JSON给出格式错误提示(实际='+D.ctx.__lastAlert+')');
}
{
  const shared={};
  const dev=makeDevice('DevZ',shared);
  dev.api.setCloud({enabled:true,url:'http://fake',key:'k',book:'__default__',token:'',bucket:'wujin-pics',lastSync:0});
  shared['__default__']={data:'这不是对象',updated_at:new Date().toISOString()};
  let t5=null; try{ await dev.api.syncOnce(); }catch(e){ t5=e; }
  ok(!t5,'Z5 畸形云数据 syncOnce 不抛('+(t5?t5.message:'')+')');
  ok(Array.isArray(dev.api.products),'Z5b 本地 products 仍为数组未被污染');
}


// ZA/ZB: 数值化加固（与 v1.13.2 台账修复同口径；月统计/汇总/云端合并都强制转数字，防字符串拼接）
console.log('\n=== ZA/ZB. 数值化加固：云端合并 + 月统计汇总防拼接 ===');
{
  // ZA: 云端带字符串金额/库存 → 合并后必须数值化
  const {P}=freshScenario();
  api.setCloud({enabled:true,url:'http://fake',key:'k',book:'__num__',token:''});
  const cloud={products:[{id:'P9',name:'云端独有',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:2,stock:'7',safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}],flow:[],cash:[{id:'C9',type:'in',cat:'其他',amount:'150',date:api.todayStr(),note:'字符串金额',_t:2}],ar:[],stockLog:[],delLog:[]};
  ctx.__cloudStore['__num__']={data:cloud,delLog:[]};
  await api.syncOnce();
  const cm=api.cash.find(x=>x.id==='C9');
  const pm=api.products.find(x=>x.id==='P9');
  ok(cm && typeof cm.amount==='number' && cm.amount===150,'ZA1 云端合并后字符串金额被数值化(amount='+(cm?cm.amount:'无')+')');
  ok(pm && typeof pm.stock==='number' && pm.stock===7,'ZA2 云端合并后字符串库存被数值化(stock='+(pm?pm.stock:'无')+')');
}
{
  // ZB: 字符串库存 → 库存分析汇总不被拼接（修复前 '50'+'120'='50120'，修复后=170）
  api.products=[{id:'P1',name:'a',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:'50',safe:1,cost:1,wholesale:2,retail:3,price:3,note:''},{id:'P2',name:'b',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:'120',safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  api.save('products',api.products);
  let t=null; try{ ctx.renderStockAna(); }catch(e){ t=e; }
  ok(!t,'ZB1 renderStockAna 字符串库存不崩溃'+(t?(' → '+t.message):''));
  const h=(D.getEl('an_stock').innerHTML)||'';
  ok(h.indexOf('170')>=0 && h.indexOf('50120')<0,'ZB2 库存总量=170(非拼接50120)');
}
{
  // ZB3/ZB4: 字符串金额 → 月统计现金汇总不被拼接（修复前 '150'+'50'='15050'，修复后=200）
  api.cash=[{id:'C1',type:'in',cat:'其他',amount:'150',date:api.todayStr(),note:'',_t:1},{id:'C2',type:'in',cat:'其他',amount:'50',date:api.todayStr(),note:'',_t:1}];
  api.save('cash',api.cash);
  let t2=null; try{ ctx.renderCash(); }catch(e){ t2=e; }
  ok(!t2,'ZB3 renderCash 字符串金额不崩溃'+(t2?(' → '+t2.message):''));
  const t=((D.getEl('csIn').textContent)||'');
  ok(t.indexOf('200')>=0 && t.indexOf('15050')<0,'ZB4 本月收入=200(非拼接15050)，实际='+t);
}

// ZV: 经营概览/库存分析数值正确性（防 NaN / 除零 / 拼接）—— 锁 renderKPI 与 renderFin 汇总守卫
console.log('\n=== ZV. 经营概览/库存分析数值正确性（防 NaN/除零）===');
{
  // ZV1: 缺字段/坏字段流水 → renderKPI 不产生 NaN（修：f.qty*f.price 无 ||0 守卫→NaN 污染汇总）
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  const t=api.todayStr();
  api.products=[{id:'P1',name:'螺丝',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  api.flow=[
    {id:'F1',type:'sell',pid:'P1',pname:'螺丝',qty:3,price:5,refund:false,date:t,_t:1},
    {id:'F2',type:'buy',pid:'P1',pname:'螺丝',qty:undefined,price:5,date:t,_t:1}, // 缺 qty：历史坏数据/坏导入
    {id:'F3',type:'sell',pid:'P1',pname:'螺丝',qty:2,price:NaN,date:t,_t:1}        // 坏 price
  ];
  let threw=null; try{ api.renderKPI(); }catch(e){ threw=e; }
  ok(!threw,'ZV1 renderKPI 缺/坏字段不崩溃'+(threw?(' → '+threw.message):''));
  const num=s=>{s=String(s).replace(/[^\d.\-]/g,'');return s===''||s==='-'?0:Number(s);};
  const ks=String(D.getEl('kpSell').textContent||''), kb=String(D.getEl('kpBuy').textContent||''), kp=String(D.getEl('kpProfit').textContent||'');
  const kr=String(D.getEl('kpRecv').textContent||''), rp=String(D.getEl('rankProduct').innerHTML||'');
  // 关键不变量：单条坏记录只能自身归零，不得污染同月其它正常记录（修前 F1 的 ¥15 被 NaN 拖成 ¥0）
  ok(num(ks)===15,'ZV1b 销售额=¥15(坏记录仅自身归零，不污染正常记录，实际='+ks+')');
  ok(num(kb)===0,'ZV1c 进货额=¥0(实际='+kb+')');
  ok(num(kp)===15,'ZV1d 毛利=¥15(实际='+kp+')');
  ok(num(kr)===0,'ZV1e 应收=¥0(实际='+kr+')');
  ok(rp.indexOf('NaN')<0,'ZV1f 商品排行不显示NaN(实际='+rp.slice(0,40)+')');
}
{
  // ZV2: 空数据 → 概览全 0、不 NaN；recvSum 空=0
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  let threw=null; try{ api.renderKPI(); }catch(e){ threw=e; }
  ok(!threw,'ZV2 renderKPI 空数据不崩溃'+(threw?(' → '+threw.message):''));
  ok(String(D.getEl('kpSell').textContent||'').indexOf('NaN')<0,'ZV2b 空数据销售额非NaN');
  ok(api.recvSum()===0,'ZV2c recvSum空=0(实际='+api.recvSum()+')');
}
{
  // ZV3: 极大值 → 聚合不溢出、显示正常（toLocaleString 不崩）
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  const t=api.todayStr();
  api.products=[{id:'P1',name:'螺丝',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  api.flow=[{id:'F9',type:'sell',pid:'P1',pname:'螺丝',qty:1e9,price:1e9,refund:false,date:t,_t:1}];
  let threw=null; try{ api.renderKPI(); }catch(e){ threw=e; }
  ok(!threw,'ZV3 极大值不崩溃'+(threw?(' → '+threw.message):''));
  const ks=String(D.getEl('kpSell').textContent||'');
  ok(ks.indexOf('NaN')<0 && ks.indexOf('¥')===0,'ZV3b 极大值销售额显示正常('+ks+')');
}
{
  // ZV4: renderStockAna 空/极大值/坏库存 → 不 NaN、不崩
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  let t0=null; try{ ctx.renderStockAna(); }catch(e){ t0=e; }
  ok(!t0,'ZV4a renderStockAna 空不崩溃'+(t0?(' → '+t0.message):''));
  api.products=[{id:'P1',name:'a',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:1e9,safe:0,cost:1,wholesale:2,retail:3,price:3,note:''},{id:'P2',name:'b',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:NaN,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  let t1=null; try{ ctx.renderStockAna(); }catch(e){ t1=e; }
  ok(!t1,'ZV4b 极大值/NaN库存不崩溃'+(t1?(' → '+t1.message):''));
  const sh=String(D.getEl('an_stock').innerHTML||'');
  ok(sh.indexOf('NaN')<0,'ZV4c 库存分析不含NaN(实际='+sh.slice(0,60)+')');
}
{
  // ZV5: renderFin 缺字段流水 → 不 NaN（renderFin 已用 ||0 守卫，锁回归）
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  const t=api.todayStr();
  api.products=[{id:'P1',name:'螺丝',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  api.flow=[{id:'F1',type:'sell',pid:'P1',qty:undefined,price:5,refund:false,date:t,_t:1},{id:'F2',type:'buy',pid:'P1',qty:2,price:NaN,date:t,_t:1}];
  let threw=null; try{ ctx.renderFin(); }catch(e){ threw=e; }
  ok(!threw,'ZV5 renderFin 缺/坏字段不崩溃'+(threw?(' → '+threw.message):''));
  const fh=String(D.getEl('an_fin').innerHTML||'');
  ok(fh.indexOf('NaN')<0,'ZV5b 财务概览不含NaN(实际='+fh.slice(0,60)+')');
}
{
  // ZV6: svgPie 空/全零 → 不除零、返回灰圈（不崩）
  let t=null; try{ const s=ctx.svgPie([],150); ok(s.indexOf('circle')>=0,'ZV6 空饼图返回灰圈'); }catch(e){ t=e; }
  ok(!t,'ZV6b svgPie([]) 不崩'+(t?(' → '+t.message):''));
  let t2=null; try{ const s2=ctx.svgPie([{value:0,color:'#000'}],150); ok(s2.indexOf('circle')>=0,'ZV6c 全零饼图返回灰圈'); }catch(e){ t2=e; }
  ok(!t2,'ZV6c2 svgPie([0]) 不崩'+(t2?(' → '+t2.message):''));
}

{
  // ZV7: 今日明细/商品明细模态 —— 坏记录不得污染正常记录、不显示NaN
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];
  const t=api.todayStr();
  api.products=[{id:'P1',name:'螺丝',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  api.flow=[
    {id:'F1',type:'sell',pid:'P1',pname:'螺丝',qty:3,price:5,refund:false,date:t,_t:1},
    {id:'F2',type:'sell',pid:'P1',pname:'螺丝',qty:2,price:NaN,refund:false,date:t,_t:1}
  ];
  let threw=null; try{ ctx.todayDetail('sales'); }catch(e){ threw=e; }
  ok(!threw,'ZV7 todayDetail(sales) 不崩溃'+(threw?(' → '+threw.message):''));
  const mh=String(D.getEl('mDetail').innerHTML||'');
  ok(mh.indexOf('NaN')<0,'ZV7b 今日销售额明细不含NaN(实际='+mh.slice(0,80)+')');
  let threw2=null; try{ ctx.kpiProductDetail('P1'); }catch(e){ threw2=e; }
  ok(!threw2,'ZV7c kpiProductDetail 不崩溃'+(threw2?(' → '+threw2.message):''));
  const mh2=String(D.getEl('mDetail').innerHTML||'');
  ok(mh2.indexOf('NaN')<0,'ZV7d 商品明细不含NaN(实际='+mh2.slice(0,80)+')');
}

// ZC: 墓碑上限——trimDelLog 防止 delLog 无限增长
console.log('\n=== ZC. 墓碑上限（delLog 裁剪）===');
{
  // ZC1: 本地连续删除超过 500 条 → tomb 后自动裁剪到 500
  const {P}=freshScenario();
  api.delLog=[];
  for(let i=0;i<600;i++){ api.tomb('zc_p'+i,'product'); }
  ok(api.delLog.length<=500,'ZC1 本地删除600条→墓碑裁剪到≤500(实际='+api.delLog.length+')');
  ok(api.delLog.length>=1 && api.delLog.every(d=>d&&d.id&&d.type),'ZC1b 裁剪后墓碑结构完整');

  // ZC2: 云端合并带入 600 条墓碑 → 合并后裁剪到 500
  api.delLog=[];
  const remoteDel=[];
  for(let i=0;i<600;i++){ remoteDel.push({id:'zc_r'+i,type:'product',t:Date.now()-(600-i)}); }
  api.mergeIntoLocal({products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:remoteDel});
  ok(api.delLog.length<=500,'ZC2 云端并入600条墓碑→裁剪到≤500(实际='+api.delLog.length+')');

  // ZC3: 未超上限时不裁剪（保留全部）
  api.delLog=[];
  for(let i=0;i<10;i++){ api.tomb('zc_s'+i,'cash'); }
  ok(api.delLog.length===10,'ZC3 删除不足上限时不裁剪(实际='+api.delLog.length+')');
}

// ZD: 自然语言/语音解析器对抗性轰炸（防 NaN/崩溃/算错单价）
console.log('\n=== ZD. 智能解析对抗测试 ===');
{
  const finite=v=>typeof v==='number'&&isFinite(v);
  // ZD1: 共享总价分摊（螺丝5个螺母3个30元 → 总额30 按数量均摊）
  const z1=api.smartParseLineMulti('螺丝5个螺母3个30元','flow');
  ok(z1.length===2,'ZD1 多商品拆分=2条(实际='+z1.length+')');
  const sum1=z1.reduce((a,i)=>a+(+i.qty||0)*(+i.price||0),0);
  ok(Math.abs(sum1-30)<0.01,'ZD1b 共享总价分摊后合计=30(实际='+sum1.toFixed(2)+')');
  ok(z1.every(i=>finite(i.qty)&&finite(i.price)&&i.name),'ZD1c 字段无NaN/无名');

  // ZD2: 单价不被误分摊（电钻5台130元 扳手2把 → 130 是电钻自己的单价）
  const z2=api.smartParseLineMulti('电钻5台130元 扳手2把','flow');
  const dz=z2.find(i=>i.name==='电钻'); const db=z2.find(i=>i.name==='扳手');
  ok(dz&&dz.price===130,'ZD2 电钻单价=130不被分摊(实际='+(dz&&dz.price)+')');
  ok(db&&db.price===0,'ZD2b 扳手无价=0(实际='+(db&&db.price)+')');

  // ZD3: 金额提取
  ok(api.smartAmount('合计29元')===29,'ZD3 合计29元=29');
  ok(api.smartAmount('收到货款500')===500,'ZD3b 收到货款500=500');
  ok(api.smartAmount('付款1.5万')===15000,'ZD3c 付款1.5万=15000');
  ok(api.smartAmount('无数字')===0,'ZD3d 无数字=0');

  // ZD4: 日期解析
  ok(/^\d{4}-\d{2}-\d{2}$/.test(api.smartDate('2026-08-08 进货')),'ZD4 标准日期解析');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(api.smartDate('8月8日')),'ZD4b 月日解析补年');
  ok(api.smartDate('')==='','ZD4c 空→空(由调用方补今天)');

  // ZD5: 表格解析数值无 NaN
  const tbl={delim:',',lines:['名称,规格,库存,单价','扳手,10寸,12,3.5','螺丝,,30,0.2']};
  const z5=api.smartParseTable(tbl,'product');
  ok(z5.length===2,'ZD5 表格解析=2行(实际='+z5.length+')');
  ok(z5.every(i=>finite(i.stock)&&finite(i.cost||0)),'ZD5b 表格库存/成本无NaN');

  // ZD6: 空/乱码/边界 不崩溃、不产 NaN
  let threw=null;
  const fuzz=['','   ','你好世界','螺丝','','螺丝5个螺母3个','123','-5个','5个-3元','螺丝5个螺母3个电钻2台','ABC DEF 123','￥元','螺丝5个30元螺母3个','合计500 螺丝5个'];
  try{
    fuzz.forEach(t=>{ const its=api.smartParseLineMulti(t,'flow'); its.forEach(i=>{ if(!finite(i.qty)||!finite(i.price)) threw='NaN字段 in '+JSON.stringify(t); }); });
    api.smartParseLine('','flow'); // 应 null 不抛
    api.smartParseTable({delim:',',lines:['名称,库存','',',']},'product');
    api.ocrRowsToItems('flow','',[]); // 空行
  }catch(e){ threw=e.message||String(e); }
  ok(!threw,'ZD6 模糊轰炸不崩溃/不产NaN'+(threw?(' → '+threw):''));
}

// ZD7/ZD8: 千位分隔符容错（1,234.5 不再被读成 1）
{
  ok(api.smartAmount('合计1,234.5元')===1234.5,'ZD7 千位分隔符合计1,234.5=1234.5');
  ok(api.smartAmount('收到货款12,000')===12000,'ZD7b 收到货款12,000=12000');
  ok(api.smartAmount('付款1,500.00')===1500,'ZD7c 付款1,500.00=1500');
  const z8c=api.smartParseLine('收到货款1,234.5元','cash');
  ok(z8c&&z8c.amount===1234.5,'ZD8c 单条现金千位1,234.5=1234.5(实际='+(z8c&&z8c.amount)+')');
  const z8=api.smartParseLineMulti('电钻5台1,300元,扳手2把1,200元','flow');
  const dz8=z8.find(i=>i.name==='电钻'), db8=z8.find(i=>i.name==='扳手');
  ok(z8.length===2,'ZD8 多件逗号分隔仍拆2条(实际='+z8.length+')');
  ok(dz8&&dz8.price===1300,'ZD8b 电钻千位价1,300=1300(实际='+(dz8&&dz8.price)+')');
  ok(db8&&db8.price===1200,'ZD8c 扳手千位价1,200=1200(实际='+(db8&&db8.price)+')');
}

// ZE: 批量删除级联 + 删除恢复 + 应收保留（防漏删/误删/还原失效）
console.log('\n=== ZE: 批量删除级联 + 删除恢复 + 应收保留 ===');
{
  // ZE1-ZE2: delFlowData 模糊现金匹配 —— 必须"宁可少删不可误删"
  let threw=null;
  try{
    const {P}=freshScenario(); const today=api.todayStr();
    api.products=api.products.map(p=>({...p,stock:10}));
    // 两条"销售货款"现金同日期、同金额100 → 模糊匹配命中2条，应触发 m.length===1 守卫，一条都不删（防误删）
    api.cash.push({id:'CZ1',type:'in',cat:'销售货款',amount:100,date:today,note:'模糊A',_t:1});
    api.cash.push({id:'CZ2',type:'in',cat:'销售货款',amount:100,date:today,note:'模糊B',_t:1});
    const fz={id:'FZ',pid:P[0],type:'sell',qty:20,price:5,date:today,linkCashId:undefined,unitFactor:1,_t:1}; // 20*5=100 命中
    api.flow.push(fz);
    api.delFlowData('FZ');
    ok(api.cash.length===2,'ZE1 模糊匹配命中2条→一条都不删(防误删，剩'+api.cash.length+')');
    ok(!api.flow.find(f=>f.id==='FZ'),'ZE2 该流水已删');
  }catch(e){threw=e;}
  ok(!threw,'ZE0 delFlowData模糊现金不抛'+(threw?(' → '+threw.message):''));
}
{
  // ZE3-ZE4: 删销售/进货流水 → 库存回滚方向 + 按 fid 级联删台账
  let threw=null;
  try{
    const {P}=freshScenario(); const today=api.todayStr();
    api.products=api.products.map(p=>({...p,stock:10}));
    api.commitFlow({pid:P[0],qty:2,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
    api.commitFlow({pid:P[0],qty:3,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
    const sellF=api.flow.find(f=>f.type==='sell'), buyF=api.flow.find(f=>f.type==='buy');
    const stBefore=api.products.find(x=>x.id===P[0]).stock;
    api.delFlowData(sellF.id);
    ok(api.products.find(x=>x.id===P[0]).stock===stBefore+2,'ZE3 删销售→库存回滚+2('+stBefore+'→'+api.products.find(x=>x.id===P[0]).stock+')');
    const stBefore2=api.products.find(x=>x.id===P[0]).stock;
    api.delFlowData(buyF.id);
    ok(api.products.find(x=>x.id===P[0]).stock===stBefore2-3,'ZE4 删进货→库存回滚-3('+stBefore2+'→'+api.products.find(x=>x.id===P[0]).stock+')');
    ok(api.stockLog.filter(s=>s.fid===sellF.id||s.fid===buyF.id).length===0,'ZE5 流水台账按fid级联已删(剩'+api.stockLog.filter(s=>s.fid).length+')');
  }catch(e){threw=e;}
  ok(!threw,'ZE0b 库存回滚/台账级联不抛'+(threw?(' → '+threw.message):''));
}
{
  // ZE6-ZE7: purgeAr 守卫 —— 已收款应收保留、未收款应收删除
  let threw=null;
  try{
    api.ar=[{id:'AR1',partyId:'A0',kind:'receivable',amount:100,paidAmount:50,_t:1},{id:'AR2',partyId:'A0',kind:'receivable',amount:80,paidAmount:0,_t:1}];
    api.purgeAr('AR1');
    ok(api.ar.find(a=>a.id==='AR1'),'ZE6 已收款应收(paid>0)保留不被删');
    api.purgeAr('AR2');
    ok(!api.ar.find(a=>a.id==='AR2'),'ZE7 未收款应收(paid=0)已删');
  }catch(e){threw=e;}
  ok(!threw,'ZE0c purgeAr不抛'+(threw?(' → '+threw.message):''));
}
{
  // ZE8-ZE11: 删除恢复（trashSnapshot→删→restoreLocal）全字段还原 + 墓碑清理 + _t压顶
  let threw=null;
  try{
    const {P}=freshScenario(); const today=api.todayStr();
    api.products=api.products.map(p=>({...p,stock:10}));
    api.commitFlow({pid:P[1],qty:2,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'扳手',partyName:''});
    const prod=api.products.find(x=>x.id===P[1]); const stSnap=prod.stock;
    api.save('trash',{ts:Date.now(),data:{products:api.products.slice(),cash:api.cash.slice(),flow:api.flow.slice(),todos:api.todos.slice(),parties:api.parties.slice(),ar:api.ar.slice(),stockLog:api.stockLog.slice()}}); // 等价于 trashSnapshot()（测试台未暴露该函数）
    api.delProductData(P[1]);      // 级联删商品+流水+现金+台账
    ok(!api.products.find(x=>x.id===P[1]),'ZE8 删除后商品不在');
    ok(api.flow.filter(f=>f.pid===P[1]).length===0,'ZE9 删除后关联流水不在');
    api.restoreLocal();            // 从回收站还原
    ok(api.products.find(x=>x.id===P[1]),'ZE10 还原后商品回来');
    ok(api.products.find(x=>x.id===P[1]).stock===stSnap,'ZE11 还原后库存=快照('+api.products.find(x=>x.id===P[1]).stock+' vs '+stSnap+')');
    ok(api.flow.filter(f=>f.pid===P[1]).length===1,'ZE12 还原后流水回来(1条)');
    ok(api.cash.length>=1,'ZE13 还原后现金回来(剩'+api.cash.length+')');
    ok(api.stockLog.filter(s=>s.pid===P[1]).length===1,'ZE14 还原后台账回来(1条)');
    const t=Date.now();
    ok(api.products.find(x=>x.id===P[1])._t>=t-2000,'ZE15 还原后_t已压顶(防同步再删, _t='+api.products.find(x=>x.id===P[1])._t+')');
    ok(!api.delLog.find(d=>d.id===P[1]&&d.type==='product'),'ZE16 还原项墓碑已清除(不再被同步删)');
  }catch(e){threw=e;}
  ok(!threw,'ZE0d restoreLocal不抛'+(threw?(' → '+threw.message):''));
}
{
  // ZE17-ZE18: bulkRemove 多 id 计数 + 级联
  let threw=null;
  try{
    const {P}=freshScenario(); const today=api.todayStr();
    api.products=api.products.map(p=>({...p,stock:10}));
    api.commitFlow({pid:P[1],qty:1,price:1,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'扳手',partyName:''});
    api.commitFlow({pid:P[2],qty:1,price:1,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'电钻',partyName:''});
    const n=api.bulkRemove('product',[P[1],P[2]]);
    ok(n===2,'ZE17 bulkRemove两商品计数=2(实际='+n+')');
    ok(api.flow.filter(f=>f.pid===P[2]||f.pid===P[3]).length===0,'ZE18 两商品关联流水都级联删');
  }catch(e){threw=e;}
  ok(!threw,'ZE0e bulkRemove不抛'+(threw?(' → '+threw.message):''));
}
{
  // ZE19: 无回收站时 restoreLocal 不崩、给提示
  let threw=null;
  try{
    ctx.__lastAlert='';
    api.products=[];api.cash=[];api.flow=[];api.stockLog=[];api.ar=[];api.delLog=[];
    ctx.localStorage.removeItem('wb_wujin_trash');
    api.restoreLocal();
    ok((ctx.__lastAlert||'').indexOf('没有')>=0,'ZE19 无回收站时给出提示(实际='+ctx.__lastAlert+')');
  }catch(e){threw=e;}
  ok(!threw,'ZE0f 无回收站restoreLocal不抛'+(threw?(' → '+threw.message):''));
}

// ZF: 云端合并 last-write-wins（多设备数据合流不丢不改）
console.log('\n=== ZF: 云端合并 last-write-wins 正确性 ===');
{
  // ZF1-ZF4: mergeArr 纯函数（并集 + _t 大者胜 + 平局本地胜）
  const r1=api.mergeArr([{id:'X',_t:100,name:'L'}],[{id:'X',_t:200,name:'R'}]);
  ok(r1.length===1&&r1[0].name==='R','ZF1 远端_t更大→远端胜(name='+(r1[0]&&r1[0].name)+')');
  const r2=api.mergeArr([{id:'X',_t:200,name:'L'}],[{id:'X',_t:100,name:'R'}]);
  ok(r2.length===1&&r2[0].name==='L','ZF2 本地_t更大→本地胜(name='+(r2[0]&&r2[0].name)+')');
  const r3=api.mergeArr([{id:'X',_t:100}],[{id:'Y',_t:100}]);
  ok(r3.length===2,'ZF3 不同id并集都保留(实际='+r3.length+')');
  const r4=api.mergeArr([{id:'X',_t:100,name:'L'}],[{id:'X',_t:100,name:'R'}]);
  ok(r4.length===1&&r4[0].name==='L','ZF4 _t平局→本地胜(name='+(r4[0]&&r4[0].name)+')');
}
{
  // ZF5-ZF7: mergeIntoLocal 端到端（远端胜 + 远端独项并入 + 本地独项保留）
  api.products=[{id:'P1',name:'本地旧',stock:5,_t:100},{id:'P3',name:'仅本地',stock:1,_t:50}];
  api.delLog=[];
  api.mergeIntoLocal({products:[{id:'P1',name:'云端新',stock:9,_t:300},{id:'P2',name:'仅云端',stock:2,_t:80}],delLog:[]});
  ok(api.products.find(p=>p.id==='P1')&&api.products.find(p=>p.id==='P1').name==='云端新','ZF5 远端_t大→P1取云端新(name='+(api.products.find(p=>p.id==='P1')||{}).name+')');
  ok(api.products.find(p=>p.id==='P1')&&api.products.find(p=>p.id==='P1').stock===9,'ZF5b P1库存取云端9(实际='+(api.products.find(p=>p.id==='P1')||{}).stock+')');
  ok(api.products.find(p=>p.id==='P2'),'ZF6 远端独项P2并入');
  ok(api.products.find(p=>p.id==='P3'),'ZF7 本地独项P3保留');
}
{
  // ZF8-ZF9: 墓碑跨设备删除 + 删除后编辑存活（applyTombstones 判据）
  api.products=[{id:'D1',name:'待删',stock:1,_t:50}];
  api.delLog=[];
  api.mergeIntoLocal({products:[],delLog:[{id:'D1',type:'product',t:100}]});
  ok(!api.products.find(p=>p.id==='D1'),'ZF8 云墓碑(t=100)>记录_t(50)→D1被删');
  api.products=[{id:'D1',name:'删后又改',stock:1,_t:150}];
  api.delLog=[];
  api.mergeIntoLocal({products:[],delLog:[{id:'D1',type:'product',t:100}]});
  ok(api.products.find(p=>p.id==='D1'),'ZF9 记录_t(150)>墓碑_t(100)→删后又编辑的D1存活');
}
{
  // ZF10-ZF11: syncOnce 端到端（fetch→合并→数值化→存盘），含云端坏数据字符串数值化
  let threw=null,okSync=false;
  try{
    api.setCloud({url:'https://x.supabase.co',key:'k',book:'bkt',token:'t',enabled:true});
    ctx.__cloudStore['bkt']={data:{products:[{id:'S1',name:'云S1',stock:7,_t:300},{id:'S2',name:'云S2',stock:'8',_t:90}],delLog:[]},updated_at:new Date().toISOString()};
    api.products=[{id:'S1',name:'本地S1',stock:3,_t:100},{id:'S3',name:'本地S3',stock:1,_t:60}];
    api.delLog=[];
    await api.syncOnce();
    okSync=true;
  }catch(e){threw=e;}
  ok(!threw&&okSync,'ZF10 syncOnce端到端不抛'+(threw?(' → '+threw.message):''));
  ok(api.products.find(p=>p.id==='S1')&&api.products.find(p=>p.id==='S1').name==='云S1','ZF11 S1取云端(远端_t大)');
  ok(api.products.find(p=>p.id==='S2')&&api.products.find(p=>p.id==='S2').stock===8,'ZF11b S2并入且字符串库存数值化(8)');
  ok(api.products.find(p=>p.id==='S3'),'ZF11c 本地独项S3保留');
}

// ZG: 今天要处理置顶/逾期（铁律5：逾期标红、昨天没做完自动滚到今天、无截止日期不算逾期）
console.log('\n=== ZG: 今天要处理 置顶/逾期 ===');
{
  const t=api.todayStr();
  const yest=api.addDays(t,-1), tom=api.addDays(t,1);
  api.products=[];api.ar=[];api.todos=[];
  api.todos=[
    {id:'T1',text:'逾期待办',due:yest,done:false,_t:1},
    {id:'T2',text:'今天待办',due:t,done:false,_t:1},
    {id:'T3',text:'未来待办',due:tom,done:false,_t:1},
    {id:'T4',text:'无日期待办',due:'',done:false,_t:1},
    {id:'T5',text:'已完成待办',due:yest,done:true,_t:1},
  ];
  api.renderAll();
  const kids=D.getEl('todayList').children||[];
  const find=txt=>kids.find(k=>(k._html||'').indexOf(txt)>=0);
  const T1=find('逾期待办'),T2=find('今天待办'),T3=find('未来待办'),T4=find('无日期待办'),T5=find('已完成待办');
  ok(T1&&(T1.className||'').indexOf('over')>=0,'ZG1 昨天到期未完成→标红over(实际cls='+(T1&&T1.className)+')');
  ok(T2&&(T2.className||'').indexOf('soon')>=0,'ZG2 今天到期→标soon(实际cls='+(T2&&T2.className)+')');
  ok(T3&&(T3.className||'').indexOf('over')<0,'ZG3 未来到期→不标红(实际cls='+(T3&&T3.className)+')');
  ok(T4&&(T4.className||'').indexOf('over')<0,'ZG4 无截止日期→不误判逾期(实际cls='+(T4&&T4.className)+')');
  ok(!T5,'ZG5 已完成待办不出现在列表');
  // 低库存补货提醒
  api.products=[{id:'PZ',name:'测试品',unit:'个',conv:{},stock:2,safe:10,_t:1}];
  api.renderAll();
  const k2=(D.getEl('todayList').children||[]).find(k=>(k._html||'').indexOf('测试品')>=0);
  ok(k2&&(k2._html||'').indexOf('补货')>=0,'ZG6 低库存商品出现在补货提醒');
  // 应收逾期催收
  api.products=[];
  api.ar=[{id:'AZ',party:'王五',kind:'receivable',amount:100,paidAmount:0,due:yest,_t:1}];
  api.renderAll();
  const k3=(D.getEl('todayList').children||[]).find(k=>(k._html||'').indexOf('王五')>=0);
  ok(k3&&(k3.className||'').indexOf('over')>=0,'ZG7 应收逾期标红催收(实际cls='+(k3&&k3.className)+')');
}

// ZH: 记账漏斗(commitFlow/commitRefund)防御 + 单位换算库存缩放
console.log('\n=== ZH: 记账漏斗防御 + 换算缩放 ===');
{
  const {P}=freshScenario(); const today=api.todayStr();
  api.products=api.products.map(p=>({...p,stock:10}));
  // ZH1-ZH3: 负输入被漏斗防御（库存方向不反、不产生负金额）
  api.commitFlow({pid:P[0],qty:-5,price:3,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  ok(api.products.find(x=>x.id===P[0]).stock===10,'ZH1 进货负数量被当作0→库存不变(实际='+api.products.find(x=>x.id===P[0]).stock+')');
  api.commitFlow({pid:P[0],qty:-5,price:3,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  ok(api.products.find(x=>x.id===P[0]).stock===10,'ZH2 销售负数量被当作0→库存不变(实际='+api.products.find(x=>x.id===P[0]).stock+')');
  const negCash=api.cash[api.cash.length-1];
  ok(negCash.amount>=0,'ZH3 负单价不产生负金额(实际='+negCash.amount+')');
  // ZH4-ZH5: 单位换算缩放（1盒=4个）
  api.products=api.products.map(p=>({...p,stock:0,conv:{'盒':4}}));
  api.commitFlow({pid:P[1],qty:1,price:2,type:'buy',uname:'盒',ufactor:4,settle:'cash',date:today,pname:'扳手',partyName:''});
  ok(api.products.find(x=>x.id===P[1]).stock===4,'ZH4 进货1盒(因子4)→库存+4(实际='+api.products.find(x=>x.id===P[1]).stock+')');
  api.commitFlow({pid:P[1],qty:1,price:2,type:'sell',uname:'盒',ufactor:4,settle:'cash',date:today,pname:'扳手',partyName:''});
  ok(api.products.find(x=>x.id===P[1]).stock===0,'ZH5 销售1盒(因子4)→库存-4(实际='+api.products.find(x=>x.id===P[1]).stock+')');
  // ZH6: 退货负数量被防御
  api.products=api.products.map(p=>({...p,stock:10}));
  api.commitRefund({pid:P[2],qty:-3,price:2,type:'sell',refund:true,uname:'个',ufactor:1,settle:'cash',date:today,pname:'电钻',partyName:''});
  ok(api.products.find(x=>x.id===P[2]).stock===10,'ZH6 退货负数量被当作0→库存不变(实际='+api.products.find(x=>x.id===P[2]).stock+')');
}

console.log('\n=== ZI: 智能识别录入（解析/落地/撤销/换算）===');
{
  // ZI-A: 文本→流水，共享总价拆分 + 整行往来继承
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];ctx.cfg={};
  const its=api.parseSmart('卖 螺丝5个螺母3个30元 现结 客户张老板','flow');
  const ls=its.filter(i=>i.name==='螺丝')[0], lm=its.filter(i=>i.name==='螺母')[0];
  ok(its.length===2,'ZI-A1 拆出2条流水(实际='+its.length+')');
  ok(ls && round2(ls.price)===3.75,'ZI-A2 螺丝共享总价→单价3.75(实际='+(ls&&ls.price)+')');
  ok(lm && round2(lm.price)===3.75,'ZI-A3 螺母共享总价→单价3.75(实际='+(lm&&lm.price)+')');
  ok(ls && lm && round2((ls.qty*ls.price)+(lm.qty*lm.price))===30,'ZI-A4 两条金额之和=30(实际='+round2((ls?ls.qty*ls.price:0)+(lm?lm.qty*lm.price:0))+')');
  ok(ls && ls.party==='张老板','ZI-A5 往来继承整行=张老板(实际='+(ls&&ls.party)+')');
  ok(ls && ls.settle==='cash','ZI-A6 结算=现结(实际='+(ls&&ls.settle)+')');
  ok(ls && ls.type==='sell','ZI-A7 方向=销售(实际='+(ls&&ls.type)+')');
  // ZI-A8/A9: 单价在前不跨件分摊（30元属于电钻自己）
  const its2=api.parseSmart('卖 电钻5台130元 扳手2把 现结','flow');
  const d=its2.filter(i=>i.name==='电钻')[0], b=its2.filter(i=>i.name==='扳手')[0];
  ok(d && d.price===130,'ZI-A8 电钻单价130不被分摊(实际='+(d&&d.price)+')');
  ok(b && b.price===0,'ZI-A9 扳手无价→0(实际='+(b&&b.price)+')');
  // ZI-A10: 通用入口(all 模式) 同样分摊共享总价（修：以往 all 模式不分摊→螺丝价格0被丢弃、螺母独吞30）
  const its3=api.parseSmart('卖 螺丝5个螺母3个30元 现结 客户张老板','all');
  const a3s=its3.filter(i=>i.kind==='flow'&&i.name==='螺丝')[0], a3m=its3.filter(i=>i.kind==='flow'&&i.name==='螺母')[0];
  ok(a3s && a3m && round2(a3s.price)===3.75 && round2(a3m.price)===3.75,'ZI-A10 all模式共享总价分摊(实际='+(a3s&&a3s.price)+'/'+(a3m&&a3m.price)+')');
}
{
  // ZI-B: smartApplyFlow 自动建商品 + 现金/往来联动 + 拒非法 + 不产负库存
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];ctx.cfg={};
  const n=api.smartApplyFlow({kind:'flow',name:'螺丝',type:'sell',qty:5,price:10,unit:'个',settle:'cash',party:'张三',partyType:'客户',date:api.todayStr()});
  ok(n===true,'ZI-B1 销售流水应用成功');
  ok(api.products.find(p=>p.name==='螺丝'),'ZI-B2 自动创建商品螺丝');
  ok(api.products.find(p=>p.name==='螺丝').stock===0,'ZI-B3 新商品0库存卖5→夹紧0(不出负库存)(实际='+api.products.find(p=>p.name==='螺丝').stock+')');
  ok(api.cash.length===1 && api.cash[0].amount===50 && api.cash[0].type==='in','ZI-B4 现结→现金收入50(实际='+(api.cash[0]&&api.cash[0].amount)+')');
  ok(api.parties.find(x=>x.name==='张三'),'ZI-B5 自动创建往来张三');
  ok(api.ar.length===0,'ZI-B6 现结不记应收(实际ar='+api.ar.length+')');
  // 方向正确性：先给库存再卖
  api.products.find(p=>p.name==='螺丝').stock=10;
  api.smartApplyFlow({kind:'flow',name:'螺丝',type:'sell',qty:5,price:10,unit:'个',settle:'cash',party:'张三',partyType:'客户',date:api.todayStr()});
  ok(api.products.find(p=>p.name==='螺丝').stock===5,'ZI-B7 有库存10卖5→库存5(实际='+api.products.find(p=>p.name==='螺丝').stock+')');
  api.smartApplyFlow({kind:'flow',name:'螺丝',type:'sell',qty:2,price:10,unit:'个',settle:'credit',party:'张三',partyType:'客户',date:api.todayStr()});
  ok(api.ar.length===1 && api.ar[0].amount===20,'ZI-B8 赊账2个→应收20(实际='+(api.ar[0]&&api.ar[0].amount)+')');
  ok(api.smartApplyFlow({kind:'flow',name:'螺丝',type:'sell',qty:0,price:10})===false,'ZI-B9 数量0拒绝');
  ok(api.smartApplyFlow({kind:'flow',name:'螺丝',type:'sell',qty:5,price:0})===false,'ZI-B10 单价0拒绝');
  ok(api.smartApplyFlow({kind:'flow',name:'',type:'sell',qty:5,price:10})===false,'ZI-B11 无名拒绝');
}
{
  // ZI-C: 流水携带包装换算 → 库存缩放（修复前 C2/C3/C4 必失败：conv 被丢弃→只按个算）
  api.products=[{id:'px',name:'螺丝',cat:'',spec:'',unit:'个',conv:{'盒':4},loc:'',_t:1,stock:0,safe:0,cost:0,wholesale:0,retail:1,price:1,note:'',pic:''}];
  api.cash=[];api.flow=[];api.stockLog=[];api.ar=[];api.parties=[];api.delLog=[];
  api.smartApplyFlow({kind:'flow',name:'螺丝',type:'buy',qty:5,price:1,unit:'盒',settle:'cash',date:api.todayStr()});
  ok(api.products.find(p=>p.id==='px').stock===20,'ZI-C1 商品已有盒=4→进货5盒库存+20(实际='+api.products.find(p=>p.id==='px').stock+')');
  api.products=[];api.cash=[];api.flow=[];api.stockLog=[];api.ar=[];api.parties=[];api.delLog=[];
  api.smartApplyFlow({kind:'flow',name:'螺母',type:'buy',qty:5,price:1,unit:'盒',settle:'cash',date:api.todayStr(),convText:'盒=4'});
  const pn=api.products.find(p=>p.name==='螺母');
  ok(pn,'ZI-C2 新建商品螺母');
  ok(pn && pn.stock===20,'ZI-C3 流水带盒=4→新建商品库存+20(实际='+(pn&&pn.stock)+')');
  ok(pn && pn.conv && pn.conv['盒']===4,'ZI-C4 新建商品记住盒=4(实际='+(pn&&JSON.stringify(pn.conv))+')');
  // C5: parseSmart 输出的流水也携带 convText（端到端：避免「5盒 盒=4」换算在解析端被丢）
  api.products=[];api.cash=[];api.flow=[];api.stockLog=[];api.ar=[];api.parties=[];api.delLog=[];
  const pit=api.parseSmart('进货 螺母 5盒 盒=4 1元','flow');
  ok(pit.length===1 && pit[0].convText && pit[0].convText.indexOf('盒=4')>=0,'ZI-C5 parseSmart 流水携带盒=4换算(实际='+JSON.stringify(pit[0])+')');
}
{
  // ZI-D: 批量落地 + 30秒撤销往返
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];ctx.cfg={};
  const n=api.smartApplyItems([{kind:'product',name:'螺丝',stock:10},{kind:'product',name:'扳手',stock:5}],'product');
  ok(n===2,'ZI-D1 批量添加2条商品');
  ok(api.products.length===2,'ZI-D2 商品数=2(实际='+api.products.length+')');
  api.smartUndo();
  ok(api.products.length===0,'ZI-D3 撤销后商品归零(实际='+api.products.length+')');
  ok(ctx.localStorage.getItem('wb_wujin_smart_undo')===null,'ZI-D4 撤销后清空撤销快照');
}
{
  // ZI-E: smartApplyProduct 已有累加 + conv 解析
  api.products=[{id:'pe',name:'螺丝',cat:'',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:10,safe:0,cost:1,wholesale:0,retail:3,price:3,note:'',pic:''}];
  api.smartApplyProduct({kind:'product',name:'螺丝',stock:5});
  ok(api.products.find(p=>p.id==='pe').stock===15,'ZI-E1 已有螺丝库存10+5=15(实际='+api.products.find(p=>p.id==='pe').stock+')');
  api.products=[];
  api.smartApplyProduct({kind:'product',name:'扳手',stock:20,convText:'盒=4'});
  const pb=api.products.find(p=>p.name==='扳手');
  ok(pb && pb.conv && pb.conv['盒']===4,'ZI-E2 商品conv解析盒=4(实际='+(pb&&JSON.stringify(pb.conv))+')');
  ok(pb && pb.stock===20,'ZI-E3 商品库存20(实际='+(pb&&pb.stock)+')');
}
{
  // ZI-F: smartApplyCash
  api.cash=[];
  ok(api.smartApplyCash({kind:'cash',type:'in',amount:100,date:api.todayStr()})===true,'ZI-F1 现金收入100应用');
  ok(api.cash.length===1 && api.cash[0].amount===100,'ZI-F2 现金记录金额100(实际='+(api.cash[0]&&api.cash[0].amount)+')');
  ok(api.smartApplyCash({kind:'cash',type:'out',amount:0})===false,'ZI-F3 金额0拒绝');
}
{
  // ZI-G: 表格解析（复制 Excel / 逗号表）
  const prod='名称,分类,库存\n螺丝,紧固件,20\n扳手,工具,10';
  const pi=api.parseSmart(prod,'product');
  ok(pi.length===2,'ZI-G1 商品表2行(实际='+pi.length+')');
  ok(pi[0].kind==='product' && pi[0].name==='螺丝' && pi[0].stock===20 && pi[0].cat==='紧固件','ZI-G2 螺丝库存20/分类(实际='+JSON.stringify(pi[0])+')');
  const fl='商品,数量,单价,方向,结算\n电钻,5,130,进货,现结';
  const fi=api.parseSmart(fl,'flow');
  ok(fi.length===1 && fi[0].name==='电钻' && fi[0].qty===5 && fi[0].price===130 && fi[0].type==='buy' && fi[0].settle==='cash','ZI-G3 流水表解析(实际='+JSON.stringify(fi[0])+')');
}
{
  // ZI-H: 多条目拆分 + 合计行识别
  const its=api.parseSmart('卖 螺丝5个，螺母3个 现结','flow');
  ok(its.length===2,'ZI-H1 逗号+空格拆2条(实际='+its.length+')');
  const sum=api.parseSmart('共计29元','all');
  ok(sum.length===0,'ZI-H2 合计行被跳过(实际='+sum.length+')');
  const sum2=api.parseSmart('螺丝5个 合计10元','all');
  ok(sum2.length===1,'ZI-H3 含实物+合计→不误跳(实际='+sum2.length+')');
}
{
  // ZI-I: 单元函数智能抽取
  ok(api.smartAmount('收到货款1,234.5元')===1234.5,'ZI-I1 千分位金额(实际='+api.smartAmount('收到货款1,234.5元')+')');
  ok(api.smartAmount('3.5万')===35000,'ZI-I2 万单位(实际='+api.smartAmount('3.5万')+')');
  ok(api.smartAmount('¥88')===88,'ZI-I3 ￥符号(实际='+api.smartAmount('¥88')+')');
  const dy=api.smartDate('8月7日'); ok(dy && dy.endsWith('-08-07'),'ZI-I4 月日→今年(实际='+dy+')');
  ok(api.smartDate('3.5元')==='','ZI-I5 3.5元不是日期');
  ok(api.smartParty('客户张老板')==='张老板','ZI-I6 客户前缀提取(实际='+api.smartParty('客户张老板')+')');
  ok(api.smartParty('无往来螺丝')==='','ZI-I7 无往来螺丝不误捕获(实际='+JSON.stringify(api.smartParty('无往来螺丝'))+')');
  ok(api.smartParty('张老板要螺丝5个')==='张老板','ZI-I8 动词边界不吞货名(实际='+api.smartParty('张老板要螺丝5个')+')');
}

console.log('\n=== ZJ: OCR 影像表格化解析（smartOcrRows / ocrRowsToItems / smartOcrDate）===');
{
  // ZJ-A: 常规空格分隔小票（回归）
  const rcpt='品名 数量 单价 金额\n螺丝 5 10 50\n螺母 3 8 24\n合计 74';
  const rows=api.smartOcrRows(rcpt);
  ok(rows.length===2,'ZJ-A1 识别2行(实际='+rows.length+')');
  ok(rows[0].name==='螺丝'&&rows[0].qty===5&&rows[0].price===10&&rows[0].amount===50,'ZJ-A2 螺丝行(实际='+JSON.stringify(rows[0])+')');
  ok(rows[1].name==='螺母'&&rows[1].qty===3&&rows[1].price===8&&rows[1].amount===24,'ZJ-A3 螺母行(实际='+JSON.stringify(rows[1])+')');
  // ZJ-B: 数量贴着单位写（修：以往"螺丝5个"的5整段丢失→qty空→落地被拒）
  const rcpt2='品名 数量 单价 金额\n螺丝5个 10 50\n螺母3个 8 24';
  const r2=api.smartOcrRows(rcpt2);
  ok(r2.length===2,'ZJ-B1 识别2行(实际='+r2.length+')');
  ok(r2[0].name==='螺丝'&&r2[0].qty===5&&r2[0].unit==='个'&&r2[0].price===10,'ZJ-B2 螺丝5个→qty5/unit个(实际='+JSON.stringify(r2[0])+')');
  ok(r2[1].name==='螺母'&&r2[1].qty===3&&r2[1].unit==='个','ZJ-B3 螺母3个→qty3/unit个(实际='+JSON.stringify(r2[1])+')');
  // ZJ-C: 品名含页脚词+数字（修：以往"客户专用螺丝 5 10 50"被当页脚整行丢）
  const rcpt3='品名 数量 单价 金额\n客户专用螺丝 5 10 50\n普通螺母 3 8 24';
  const r3=api.smartOcrRows(rcpt3);
  ok(r3.length===2,'ZJ-C1 含"客户"的品名不被当页脚丢(实际='+r3.length+')');
  ok(r3[0].name.indexOf('客户')>=0,'ZJ-C2 客户专用螺丝保留(实际='+r3[0].name+')');
  // ZJ-D: 真页脚行仍被丢
  const rcpt4='品名 数量 单价 金额\n螺丝 5 10 50\n合计 74';
  const r4=api.smartOcrRows(rcpt4);
  ok(r4.length===1 && r4[0].name==='螺丝','ZJ-D1 合计行仍被丢(实际='+r4.length+')');
  // ZJ-E: OCR 文本提取单据日期
  const dt=api.smartOcrDate('送货单\n2026年8月7日\n客户张三');
  ok(dt==='2026-08-07','ZJ-E1 OCR日期提取(实际='+dt+')');
  // ZJ-F: ocrRowsToItems 落地映射（flow）
  const items=api.ocrRowsToItems('flow','2026-08-07',[{name:'螺丝',unit:'个',qty:'5',price:'10',amount:'50'}]);
  ok(items.length===1 && items[0].kind==='flow' && items[0].qty===5 && items[0].price===10 && items[0].unit==='个' && items[0].type==='sell' && items[0].settle==='cash' && items[0].date==='2026-08-07','ZJ-F1 flow映射(实际='+JSON.stringify(items[0])+')');
  // ZJ-G: 端到端——贴名写法经 ocrRowsToItems 后 qty 不丢（可直接落地）
  const gItems=api.ocrRowsToItems('flow','2026-08-07',r2);
  ok(gItems.length===2 && gItems[0].qty===5 && gItems[1].qty===3,'ZJ-G1 贴名写法端到端qty齐全(实际='+JSON.stringify(gItems.map(i=>i.qty))+')');
}

// V8: 底部 Tab 手势快捷导航映射 + attachTabGestures 不抛
{
  const _g=api.TAB_GESTURE_TARGET;
  ok(_g && _g.stock.single==='card_newprod' && _g.stock.double==='card_stocklist' && _g.stock.long==='card_stocklog','V8a 库存：点按→新增商品 / 双击→商品库存 / 长按→出入库明细');
  ok(_g.cash.single==='card_cashnew' && _g.cash.double==='card_cashlist' && !_g.cash.long,'V8b 出纳：点按→记一笔收支 / 双击→收支明细（无长按）');
  ok(_g.flow.single==='card_flownew' && _g.flow.double==='card_flowlist','V8c 流水：点按→记一笔买卖 / 双击→买卖流水');
  ok(_g.party.single==='card_partynew' && _g.party.double==='card_partylist','V8d 往来：点按→新增往来单位 / 双击→往来单位与欠款');
  let t1=true; try{ if(typeof api.attachTabGestures==='function') api.attachTabGestures(); }catch(e){ t1='ERR:'+e.message; }
  ok(t1===true,'V8e attachTabGestures() 调用不抛异常（无 nav 环境静默返回）');
}

// ZK: 智能解析·多商品拆分 + 尾总价细分（smartSplitItems / smartParseLineMulti）
{
  // ZK-A: smartSplitItems 基础回归
  ok(JSON.stringify(api.smartSplitItems('螺丝5个螺母3个30元'))==='["螺丝5个","螺母3个30元"]','ZK-A1 空格连写拆成2块(实际='+JSON.stringify(api.smartSplitItems('螺丝5个螺母3个30元'))+')');
  ok(JSON.stringify(api.smartSplitItems('螺丝5个，螺母3个，30元'))==='["螺丝5个","螺母3个","30元"]','ZK-A2 逗号分隔拆成3块(实际='+JSON.stringify(api.smartSplitItems('螺丝5个，螺母3个，30元'))+')');
  ok(JSON.stringify(api.smartSplitItems('M8螺丝5个 M10螺母3个'))==='["M8螺丝5个","M10螺母3个"]','ZK-A3 规格M8/M10占位保留(实际='+JSON.stringify(api.smartSplitItems('M8螺丝5个 M10螺母3个'))+')');
  // ZK-B: 尾总价不再被静默丢弃（直击 bug：共/裸数/逗号三种写法此前都丢钱）
  const b1=api.smartParseLineMulti('螺丝5个 螺母3个 共30元','flow');
  ok(b1.length===2 && b1[0].qty===5 && b1[0].price===3.75 && b1[1].qty===3 && b1[1].price===3.75,'ZK-B1 共30元→两端按量分摊3.75(实际='+JSON.stringify(b1.map(i=>i.price))+')');
  const b2=api.smartParseLineMulti('螺丝5个螺母3个30','flow');
  ok(b2.length===2 && b2[0].qty===5 && b2[0].price===3.75 && b2[1].qty===3 && b2[1].price===3.75,'ZK-B2 裸数30→分摊3.75(实际='+JSON.stringify(b2.map(i=>i.price))+')');
  const b3=api.smartParseLineMulti('螺丝5个，螺母3个，30元','flow');
  ok(b3.length===2 && b3[0].qty===5 && b3[0].price===3.75 && b3[1].qty===3 && b3[1].price===3.75,'ZK-B3 逗号30元→分摊3.75(实际='+JSON.stringify(b3.map(i=>i.price))+')');
  const b4=api.smartParseLineMulti('螺丝5个 螺母3个 扳手2把 共30元','flow');
  ok(b4.length===3 && b4[0].price===3 && b4[1].price===3 && b4[2].price===3,'ZK-B4 三件共30元→各3(实际='+JSON.stringify(b4.map(i=>i.price))+')');
  // ZK-C: 已有好 case 不退化（回归）
  const c1=api.smartParseLineMulti('螺丝5个螺母3个30元','flow');
  ok(c1.length===2 && c1[0].price===3.75 && c1[1].price===3.75,'ZK-C1 直接30元尾随→分摊3.75(实际='+JSON.stringify(c1.map(i=>i.price))+')');
  const c2=api.smartParseLineMulti('电钻5台130元 扳手2把','flow');
  ok(c2.length===2 && c2[0].price===130 && c2[1].price===0,'ZK-C2 单价在前不跨件分摊(电钻130/扳手0)(实际='+JSON.stringify(c2.map(i=>i.price))+')');
  const c3=api.smartParseLineMulti('螺丝5.5个螺母3个30元','flow');
  ok(c3.length===2 && c3[0].qty===5.5 && Math.abs(c3[0].price-3.53)<0.01 && Math.abs(c3[1].price-3.53)<0.01,'ZK-C3 小数数量分摊3.53(实际='+JSON.stringify(c3.map(i=>i.price))+')');
  // ZK-D: all 模式——两流水仍能正确解析(q5/q3)，不崩（尾总价在 all 自动归类下归为一条杂项，非 flow 模式的数据丢失路径）
  const d1=api.smartParseLineMulti('螺丝5个 螺母3个 共30元','all');
  const dFlow=d1.filter(i=>i.kind==='flow');
  ok(dFlow.length===2 && dFlow[0].qty===5 && dFlow[1].qty===3 && d1.length>=3,'ZK-D1 all模式两流水(q5/q3)正确解析且不崩(实际='+JSON.stringify(d1.map(i=>({k:i.kind,q:i.qty})))+')');
}

// ZL: 导入导出备份链路对抗（parseImportData 守卫 + csvToTextRows 复杂字段/BOM）
{
  // ZL-A: 顶层坏文件/空文件 → 拒绝（返回 null），避免静默清空所有数据
  ok(api.parseImportData([1,2,3])===null,'ZL-A1 顶层数组→拒绝(实际='+JSON.stringify(api.parseImportData([1,2,3]))+')');
  ok(api.parseImportData('hello')===null,'ZL-A2 顶层字符串→拒绝');
  ok(api.parseImportData(42)===null,'ZL-A3 顶层数字→拒绝');
  ok(api.parseImportData(null)===null,'ZL-A4 顶层null→拒绝');
  ok(api.parseImportData(undefined)===null,'ZL-A5 顶层undefined→拒绝');
  ok(api.parseImportData({})===null,'ZL-A6 全空对象→拒绝(不丢数据)');

  // ZL-B: 正常 + 健壮性
  const b1=api.parseImportData({products:[{id:'a',name:'螺丝'},{id:'b',name:'螺母'}]});
  ok(b1&&b1.products.length===2&&b1.flow.length===0,'ZL-B1 正常2商品→products2(实际='+(b1?b1.products.length:'null')+')');
  const b2=api.parseImportData({products:'垃圾字符串',flow:[{id:'f1',type:'buy'}]});
  ok(b2&&b2.products.length===0&&b2.flow.length===1,'ZL-B2 单字段畸形不阻断其他(products0/flow1)(实际='+(b2?b2.products.length+'/'+b2.flow.length:'null')+')');
  const b3=api.parseImportData({products:[{id:'a',name:'x'},{noId:1}]});
  // 行为变更（v1.15.6）：缺编号不再丢弃，改为补号保留，与开机自愈策略一致；垃圾行仍过滤
  ok(b3&&b3.products.length===2&&b3.products.every(r=>!!r.id),'ZL-B3 缺id记录补号保留(2条且有编号)(实际='+(b3?b3.products.length:'null')+')');
  const b4=api.parseImportData({products:[{id:'a',stock:'5',price:'3.5'}]});
  ok(b4&&b4.products[0].stock===5&&b4.products[0].price===3.5,'ZL-B4 字符串数字数值化(stock5/price3.5)(实际='+(b4?JSON.stringify(b4.products[0].stock)+'/'+JSON.stringify(b4.products[0].price):'null')+')');
  const b5=api.parseImportData({products:[{id:'a',name:'x',unit:'盒',conv:{件:40}}]});
  ok(b5&&b5.products[0].unit==='个'&&b5.products[0].conv['盒']===1&&b5.products[0].conv['件']===40,'ZL-B5 老单位盒归一为个(conv盒=1/件=40)(实际='+(b5?JSON.stringify(b5.products[0].unit)+'/'+JSON.stringify(b5.products[0].conv):'null')+')');
  const b6=api.parseImportData({delLog:[{id:'y',type:'product'},{id:'x'}]});
  ok(b6&&b6.delLog.length===1&&b6.delLog[0].id==='y','ZL-B6 delLog坏条目过滤(保留1条id=y)(实际='+(b6?b6.delLog.length+'/'+JSON.stringify(b6.delLog[0]&&b6.delLog[0].id):'null')+')');
  const b7=api.parseImportData({cfg:{shop:'示例店',defAdjStock:'yes'}});
  ok(b7&&b7.cfg&&b7.cfg.shop==='示例店'&&b7.cfg.defAdjStock===true,'ZL-B7 cfg合并+布尔化(defAdjStock→true)(实际='+(b7?JSON.stringify(b7.cfg.defAdjStock):'null')+')');

  // ZL-C: csvToTextRows 复杂字段 + BOM
  const c1=api.csvToTextRows('﻿名称,数量\n螺丝,5');
  ok(c1.length===2&&c1[0][0]==='名称'&&c1[0][1]==='数量','ZL-C1 BOM去除→首列名无﻿(实际='+JSON.stringify(c1[0])+')');
  const c2=api.csvToTextRows('"a,b",c');
  ok(c2.length===1&&c2[0][0]==='a,b'&&c2[0][1]==='c','ZL-C2 字段含逗号(引号)→正确拆(实际='+JSON.stringify(c2[0])+')');
  const c3=api.csvToTextRows('"he said ""hi""",x');
  ok(c3.length===1&&c3[0][0]==='he said "hi"'&&c3[0][1]==='x','ZL-C3 双引号转义→还原(实际='+JSON.stringify(c3[0])+')');
  const c4=api.csvToTextRows('名称,"多行\n地址",数量\n螺丝,"line1\nline2",5');
  ok(c4.length===2&&c4[0][1]==='多行\n地址'&&c4[1][1]==='line1\nline2','ZL-C4 引号内换行→保留(实际='+JSON.stringify(c4)+')');
  const c5=api.csvToTextRows('名称\t数量\n螺丝\t5');
  ok(c5.length===2&&c5[0][0]==='名称'&&c5[1][0]==='螺丝'&&c5[1][1]==='5','ZL-C5 制表符分隔自动识别(实际='+JSON.stringify(c5)+')');
}

// ZM: 移动端适配铁律4 静态审计（@media单列/安全区/输入框≥16px/按钮≥44px/数字键盘）
{
  const styleBlock=(html.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||'';
  const inputs=[...html.matchAll(/<input[^>]*>/g)].map(m=>m[0]);
  // ZM-A: 移动端基础适配
  ok(/@media/.test(styleBlock)&&/max-width:\s*768px/.test(styleBlock),'ZM-A1 窄屏单列@media(max-width:768px)存在');
  ok(/env\(safe-area-inset-bottom\)/.test(styleBlock),'ZM-A2 底部安全区env()存在');
  ok(/input,select,textarea,button\{[^}]*font-size:1rem/.test(styleBlock),'ZM-A3 通用输入框字号1rem(16px,防iOS放大)');
  // ZM-B: 局部输入框字号≥16px（不得残留<16px局部覆盖）
  ok(/\.smart-item input[^{]*\{[^}]*font-size:1rem/.test(styleBlock),'ZM-B1 .smart-item input字号1rem');
  ok(/\.space-note input[^{]*\{[^}]*font-size:1rem/.test(styleBlock),'ZM-B2 .space-note input字号1rem');
  ok(/\.otable td input[^{]*\{[^}]*font-size:1rem/.test(styleBlock),'ZM-B3 .otable单元格input字号1rem');
  ok(/\.ocr-cfg input[^{]*\{[^}]*font-size:1rem/.test(styleBlock),'ZM-B4 .ocr-cfg input字号1rem');
  ok(/\.otable-wrap .ot-date input[^{]*\{[^}]*font-size:1rem/.test(styleBlock),'ZM-B5 .ot-date input字号1rem');
  // ZM-C: 按钮点击区≥44px
  ok(/\.ops button[^{]*\{[^}]*min-height:44px/.test(styleBlock),'ZM-C1 .ops主操作按钮min-height44px');
  ok(/@media\(max-width:768px\)\{[\s\S]*?\.mini[^{]*\{[^}]*min-height:44px/.test(styleBlock),'ZM-C2 移动端次级按钮min-height44px规则存在');
  // ZM-D: 数字键盘（type=number / type=tel 唤起数字键盘）
  ok(inputs.some(s=>/id="pa_phone"/.test(s)&&/type="tel"/.test(s)),'ZM-D1 电话框type=tel(唤起数字键盘)');
  ok(inputs.some(s=>/id="c_amt"/.test(s)&&/type="number"/.test(s)),'ZM-D2 金额框type=number(回归)');
  ok(inputs.some(s=>/id="f_qty"/.test(s)&&/type="number"/.test(s)),'ZM-D3 数量框type=number(回归)');
}

// ============ ZN: saveFlowEdit 原地更新 / 结算变更重派生 / 退款编辑 级联一致性 ============
{
  function setEdit(qty,price,settle,party,date,note){
    const g=D.getEl;
    g('ef_qty').value=String(qty);
    g('ef_price').value=String(price);
    g('ef_settle').value=settle;
    g('ef_party').value=party||'';
    g('ef_date').value=date||'2026-08-08';
    g('ef_note').value=note||'';
  }
  // ZN-A: 现金进货改数量+单价 → 库存/现金/台账 同步（不触发夹紧的正常场景）
  let s=freshScenario(); const P=s.P, A=s.A;
  api.commitFlow({pid:P[0],qty:10,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  const fa=api.flow[api.flow.length-1];
  setEdit(4,8,'cash','', '2026-08-08','');
  api.saveFlowEdit(fa.id);
  const pa=api.products.find(x=>x.id===P[0]);
  const ca=api.cash.find(x=>x.id===fa.linkCashId);
  const sla=api.stockLog.filter(x=>x.fid===fa.id);
  ok(pa.stock===4,'ZN-A1 现金进货10→4个 库存=4(实际='+pa.stock+')');
  ok(ca&&ca.amount===32,'ZN-A2 现金金额 10×5=50→4×8=32(实际='+(ca&&ca.amount)+')');
  ok(fa.qty===4&&fa.price===8,'ZN-A3 流水 qty/price 已更新(实际='+fa.qty+'/'+fa.price+')');
  ok(sla.length===1&&sla[0].qty===4&&sla[0].price===8,'ZN-A4 台账 qty/price 同步(实际='+(sla[0]&&sla[0].qty)+'/'+ (sla[0]&&sla[0].price)+')');
  ok(expectedStock(P[0])===4,'ZN-A5 台账合计库存=4(实际='+expectedStock(P[0])+')');

  // ZN-B: 赊销改数量 → 库存/应收/台账 同步
  let s2=freshScenario(); const P2=s2.P, A2=s2.A;
  api.commitFlow({pid:P2[0],qty:10,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'}); // 备货 10 避免夹紧
  api.commitFlow({pid:P2[0],qty:10,price:5,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A2[0],partyName:'张三',date:'2026-08-08',pname:'螺丝'});
  const fb=api.flow[api.flow.length-1];
  setEdit(4,5,'credit',A2[0],'2026-08-08','');
  api.saveFlowEdit(fb.id);
  const pb=api.products.find(x=>x.id===P2[0]);
  const ab=api.ar.find(x=>x.id===fb.linkArIds[0]);
  const slb=api.stockLog.filter(x=>x.fid===fb.id);
  ok(pb.stock===6,'ZN-B1 赊销10→4个 库存10-10+10-4=6(实际='+pb.stock+')');
  ok(ab&&ab.amount===20,'ZN-B2 应收 10×5=50→4×5=20(实际='+(ab&&ab.amount)+')');
  ok(slb.length===1&&slb[0].qty===4,'ZN-B3 台账 qty 同步=4(实际='+(slb[0]&&slb[0].qty)+')');
  ok(expectedPartyBalance(A2[0],'receivable')===20,'ZN-B4 应收款余额=20(实际='+expectedPartyBalance(A2[0],'receivable')+')');

  // ZN-C: 赊销改现金（结算变更 → 删旧建新）应收清、现金生
  let s3=freshScenario(); const P3=s3.P, A3=s3.A;
  api.commitFlow({pid:P3[0],qty:10,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  api.commitFlow({pid:P3[0],qty:10,price:5,type:'sell',uname:'个',ufactor:1,settle:'credit',partyId:A3[0],partyName:'张三',date:'2026-08-08',pname:'螺丝'});
  const fc=api.flow[api.flow.length-1];
  const arBefore=api.ar.length;
  setEdit(10,5,'cash','', '2026-08-08','');
  api.saveFlowEdit(fc.id);
  const pc=api.products.find(x=>x.id===P3[0]);
  const cashC=api.cash.filter(c=>c.type==='in'&&c.amount===50&&c.cat==='销售货款');
  ok(api.ar.filter(x=>x.partyId===A3[0]).length===arBefore-1,'ZN-C1 赊销→现金 原应收被清(实际='+api.ar.filter(x=>x.partyId===A3[0]).length+')');
  ok(cashC.length===1&&cashC[0].amount===50,'ZN-C2 新建现金收款(销售货款)50(实际='+(cashC[0]&&cashC[0].amount)+')');
  ok(pc.stock===0,'ZN-C3 库存 10-10+10-10=0(实际='+pc.stock+')');
  const newCf=api.flow.filter(x=>x.settle==='cash'&&x.type==='sell'&&x.qty===10);
  ok(newCf.length===1&&newCf[0].settle==='cash','ZN-C4 新流水结算改为现金(实际='+(newCf[0]&&newCf[0].settle)+')');

  // ZN-D: 现金进货改赊购（结算变更）现金清、应付生
  let s4=freshScenario(); const P4=s4.P, A4=s4.A;
  api.commitFlow({pid:P4[0],qty:5,price:2,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  const fd=api.flow[api.flow.length-1];
  setEdit(5,2,'credit',A4[0],'2026-08-08','');
  api.saveFlowEdit(fd.id);
  const pd=api.products.find(x=>x.id===P4[0]);
  const ap=api.ar.find(x=>x.partyId===A4[0]&&x.kind==='payable');
  ok(pd.stock===5,'ZN-D1 库存回退再进货=5(实际='+pd.stock+')');
  ok(ap&&ap.amount===10,'ZN-D2 应付=5×2=10(实际='+(ap&&ap.amount)+')');
  ok(api.cash.filter(c=>c.type==='out'&&c.amount===10).length===0,'ZN-D3 原现金支出已清(实际='+api.cash.filter(c=>c.type==='out'&&c.amount===10).length+')');

  // ZN-E: 退货编辑（refund 分支 → delFlow+commitRefund 重派生）
  let s5=freshScenario(); const P5=s5.P, A5=s5.A;
  api.commitFlow({pid:P5[0],qty:10,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'}); // 备货10 库存10
  api.commitRefund({pid:P5[0],qty:3,price:5,type:'sell',refund:true,uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'}); // 退3 库存13 现金出15
  const fe=api.flow[api.flow.length-1];
  setEdit(2,5,'cash','', '2026-08-08','');
  api.saveFlowEdit(fe.id);
  const pe=api.products.find(x=>x.id===P5[0]);
  const cashE=api.cash.filter(c=>c.cat==='销售退货');
  ok(pe.stock===12,'ZN-E1 退货3→2 库存10-3+3-2=12(实际='+pe.stock+')');
  ok(cashE.length===1&&cashE[0].amount===10,'ZN-E2 退货现金 3×5=15→2×5=10(实际='+(cashE[0]&&cashE[0].amount)+')');
  const newFe=api.flow.find(x=>x.refund===true&&x.qty===2&&x.price===5);
  ok(newFe&&newFe.qty===2&&newFe.price===5,'ZN-E3 退货流水 qty/price 更新(实际='+(newFe&&newFe.qty)+'/'+ (newFe&&newFe.price)+')');
}

// ============ ZQ: 商品/出纳编辑级联 + 手动调库 + 清空恢复 盲区扫描 ============
{
  // ZQ-A: 改名联动（propagateProductRename）— flow 与 stockLog 的 pname 同步
  var qa=freshScenario(); var QA=qa.P;
  api.commitFlow({pid:QA[0],qty:10,price:5,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  api.commitFlow({pid:QA[0],qty:3,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  api.propagateProductRename(QA[0],'螺丝王');
  ok(api.flow.every(function(f){return f.pname==='螺丝王';}),'ZQ-A1 改名后所有流水 pname 同步(实际='+JSON.stringify(api.flow.map(function(f){return f.pname;}))+')');
  ok(api.stockLog.every(function(s){return s.pname==='螺丝王';}),'ZQ-A2 改名后所有台账 pname 同步(实际='+JSON.stringify(api.stockLog.map(function(s){return s.pname;}))+')');

  // ZQ-B: 手动调库 adj（经 confirmModal 走真实回调）→ 库存 + 手工台账
  var qb=freshScenario(); var QB=qb.P;
  var pb=api.products.find(function(x){return x.id===QB[0];}); pb.stock=0;
  api.adj(QB[0],1); // 入库
  D.getEl('adj_unit').value='1'; D.getEl('adj_qty').value='5'; D.getEl('adj_date').value='2026-08-08';
  api.confirmModal();
  ok(pb.stock===5,'ZQ-B1 手动入库5 → 库存5(实际='+pb.stock+')');
  var manualIn=api.stockLog.filter(function(s){return s.src==='manual'&&s.pid===QB[0];});
  ok(manualIn.length===1&&manualIn[0].qty===5&&manualIn[0].type==='in','ZQ-B2 手工入库台账 qty5/type=in(实际='+(manualIn[0]&&manualIn[0].qty)+')');
  api.adj(QB[0],-1); // 出库
  D.getEl('adj_unit').value='1'; D.getEl('adj_qty').value='2'; D.getEl('adj_date').value='2026-08-08';
  api.confirmModal();
  ok(pb.stock===3,'ZQ-B3 手动出库2 → 库存3(实际='+pb.stock+')');
  var manualOut=api.stockLog.filter(function(s){return s.src==='manual'&&s.type==='out'&&s.pid===QB[0];});
  ok(manualOut.length===1&&manualOut[0].qty===2,'ZQ-B4 手工出库台账 qty2(实际='+(manualOut[0]&&manualOut[0].qty)+')');

  // ZQ-C: 清空全部 + 60秒恢复（trash 机制）
  var qc=freshScenario(); var QC=qc.P;
  api.commitFlow({pid:QC[0],qty:2,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  var beforeCount=api.products.length;
  api.clearAll(); api.confirmModal();
  ok(api.products.length===0&&api.flow.length===0,'ZQ-C1 清空后本机数据归零(实际 pro='+api.products.length+'/flow='+api.flow.length+')');
  api.restoreLocal();
  ok(api.products.length===beforeCount&&api.flow.length===1,'ZQ-C2 恢复后数据还原(实际 pro='+api.products.length+'/flow='+api.flow.length+')');

  // ZQ-D: saveProductEdit 改名 + 改库存（DOM 注入）
  var qd=freshScenario(); var QD=qd.P;
  var pd=api.products.find(function(x){return x.id===QD[0];}); pd.name='螺丝'; pd.stock=3;
  api.commitFlow({pid:QD[0],qty:1,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  D.getEl('ed_name').value='螺丝王'; D.getEl('ed_cat').value='紧固件'; D.getEl('ed_spec').value='M8';
  D.getEl('ed_stock').value='7'; D.getEl('ed_safe').value='2'; D.getEl('ed_cost').value='1'; D.getEl('ed_wholesale').value='2';
  D.getEl('ed_retail').value='3'; D.getEl('ed_note').value=''; D.getEl('ed_loc').value='1库'; D.getEl('ed_jian').value='';
  api.saveProductEdit(QD[0]);
  ok(pd.name==='螺丝王'&&pd.stock===7,'ZQ-D1 改名+库存改写生效(实际 name='+pd.name+'/stock='+pd.stock+')');
  ok(api.flow[0].pname==='螺丝王','ZQ-D2 编辑保存触发改名联动 flow(实际='+api.flow[0].pname+')');

  // ZQ-E: saveCashEdit 改金额/类型（DOM 注入）
  var qe=freshScenario(); var QE=qe.P;
  var ce={id:api.uid(),type:'in',cat:'其他',amount:10,date:'2026-08-08',note:'',_t:Date.now()};
  api.cash.push(ce);
  D.getEl('ec_type').value='out'; D.getEl('ec_cat').value='物流运费'; D.getEl('ec_amt').value='50'; D.getEl('ec_date').value='2026-08-08'; D.getEl('ec_note').value='';
  api.saveCashEdit(ce.id);
  ok(ce.type==='out'&&ce.amount===50&&ce.cat==='物流运费','ZQ-E1 出纳改类型/分类/金额生效(实际='+ce.type+'/'+ce.amount+'/'+ce.cat+')');
}

// ============ ZP: 夹紧反转 phantom 库存修复（stockDelta 实际生效库存变动） ============
{
  function setEditZP(qty,price,settle,party,date,note){
    var g=D.getEl;
    g('ef_qty').value=String(qty);
    g('ef_price').value=String(price);
    g('ef_settle').value=settle;
    g('ef_party').value=party||'';
    g('ef_date').value=date||'2026-08-08';
    g('ef_note').value=note||'';
  }
  // ZP-A: 库存3 卖5(夹紧→0) 再删除 → 应恢复为3，不是 phantom 5（修复前多补 +2）
  var sA=freshScenario(); var PA=sA.P;
  var pA=api.products.find(function(x){return x.id===PA[0];}); pA.stock=3;
  api.commitFlow({pid:PA[0],qty:5,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  ok(pA.stock===0,'ZP-A0 超卖夹紧: 库存3卖5→0(实际='+pA.stock+')');
  var fA=api.flow[api.flow.length-1];
  ok(fA.stockDelta===-3,'ZP-A1 记录实际库存变动 stockDelta=-3(实际='+fA.stockDelta+')');
  api.delFlowData(fA.id);
  ok(pA.stock===3,'ZP-A2 卖穿流水删除→库存恢复3(非phantom 5)(实际='+pA.stock+')');

  // ZP-B: 正常卖5 删除 → 库存复原（对照，确认未回归）
  var sB=freshScenario(); var PB=sB.P;
  var pB=api.products.find(function(x){return x.id===PB[0];}); pB.stock=10;
  api.commitFlow({pid:PB[0],qty:5,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  var fB=api.flow[api.flow.length-1];
  ok(fB.stockDelta===-5,'ZP-B1 正常卖出 stockDelta=-5(实际='+fB.stockDelta+')');
  api.delFlowData(fB.id);
  ok(pB.stock===10,'ZP-B2 正常卖出删除→库存恢复10(实际='+pB.stock+')');

  // ZP-C: 进货10 删除 → 库存复原（对照）
  var sC=freshScenario(); var PC=sC.P;
  var pC=api.products.find(function(x){return x.id===PC[0];}); pC.stock=0;
  api.commitFlow({pid:PC[0],qty:10,price:3,type:'buy',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  var fC=api.flow[api.flow.length-1];
  ok(fC.stockDelta===10,'ZP-C1 进货 stockDelta=+10(实际='+fC.stockDelta+')');
  api.delFlowData(fC.id);
  ok(pC.stock===0,'ZP-C2 进货删除→库存恢复0(实际='+pC.stock+')');

  // ZP-D: 库存3 卖5(夹紧→0) 编辑数量改2 → 库存应为 3-2=1（修复前算成0）
  var sD=freshScenario(); var PD=sD.P;
  var pD=api.products.find(function(x){return x.id===PD[0];}); pD.stock=3;
  api.commitFlow({pid:PD[0],qty:5,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  var fD=api.flow[api.flow.length-1];
  setEditZP(2,5,'cash','', '2026-08-08','');
  api.saveFlowEdit(fD.id);
  ok(pD.stock===1,'ZP-D1 超卖后改数量2→库存3-2=1(实际='+pD.stock+')');
  ok(fD.stockDelta===-2,'ZP-D2 编辑后 stockDelta=-2(实际='+fD.stockDelta+')');

  // ZP-E: 老记录(无 stockDelta) 删除 → 回落理论量，不崩（向后兼容）
  var sE=freshScenario(); var PE=sE.P;
  var pE=api.products.find(function(x){return x.id===PE[0];}); pE.stock=10;
  api.commitFlow({pid:PE[0],qty:4,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  var fE=api.flow[api.flow.length-1];
  delete fE.stockDelta;
  api.delFlowData(fE.id);
  ok(pE.stock===10,'ZP-E1 无stockDelta老记录删除→回落理论+4恢复10(实际='+pE.stock+')');

  // ZP-F: 包装换算 件=10，超卖夹紧后删除 → 用实际量而非理论大数
  var sF=freshScenario(); var PF=sF.P;
  var pF=api.products.find(function(x){return x.id===PF[0];}); pF.stock=2; pF.conv={件:10}; pF.unit='个';
  api.commitFlow({pid:PF[0],qty:1,price:5,type:'sell',uname:'件',ufactor:10,settle:'cash',date:'2026-08-08',pname:'螺丝'});
  ok(pF.stock===0,'ZP-F0 卖1件=10个 库存2→夹紧0(实际='+pF.stock+')');
  var fF=api.flow[api.flow.length-1];
  ok(fF.stockDelta===-2,'ZP-F1 实际变动-2(非理论-10)(实际='+fF.stockDelta+')');
  api.delFlowData(fF.id);
  ok(pF.stock===2,'ZP-F2 删除→恢复2(非phantom 10)(实际='+pF.stock+')');
}

// ZO: 移动端超窄屏真实渲染 - 铁律4 静态审计补全
{
  const h=html;
  ok(h.indexOf('env(safe-area-inset-bottom)')>=0,'ZO-A 底部安全区 env(safe-area-inset-bottom) 已声明(实际='+(h.indexOf('env(safe-area-inset-bottom)')>=0)+')');
  ok(h.indexOf('top:env(safe-area-inset-top)')>=0,'ZO-B 顶部固定横幅让出刘海安全区(实际='+(h.indexOf('top:env(safe-area-inset-top)')>=0)+')');
  ok(h.indexOf('.conv-del,.row-act .btn{min-height:44px;}')>=0,'ZO-C 窄屏次级按钮(含conv-del/row-act)点击区≥44px(实际='+(h.indexOf('.conv-del,.row-act .btn{min-height:44px;}')>=0)+')');
  ok(h.indexOf('.filterbar select,.filterbar input[type=date]{font-size:1rem;')>=0,'ZO-D1 筛选栏日期/下拉字号=1rem(实际='+(h.indexOf('.filterbar select,.filterbar input[type=date]{font-size:1rem;')>=0)+')');
  ok(h.indexOf('.loc-row .loc-edit{min-width:120px;max-width:220px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:1rem;}')>=0,'ZO-D2 库位编辑框字号=1rem(实际='+(h.indexOf('.loc-row .loc-edit{')>=0)+')');
  ok(h.indexOf('.lv-size{font-size:1rem;padding:5px 8px;max-width:116px;min-height:44px;cursor:pointer;}')>=0,'ZO-D3 分页尺寸下拉=1rem+点击区44px(实际='+(h.indexOf('.lv-size{font-size:1rem;')>=0)+')');
  ok(h.indexOf('.stock-tbl-wrap{overflow-x:auto')>=0 && h.indexOf('table.stock{width:100%; border-collapse:collapse; font-size:0.8125rem; min-width:680px;}')>=0,'ZO-E 库存表包横向滚动容器+min-width(实际='+(h.indexOf('.stock-tbl-wrap{overflow-x:auto')>=0)+')');
  ['c_amt','f_qty','f_price','p_stock','p_safe','p_cost'].forEach(function(id){
    var re=new RegExp('<input[^>]+id="'+id+'"[^>]+type="number"');
    ok(re.test(h),'ZO-F '+id+' 用 type="number"(实际='+re.test(h)+')');
  });
  ok(h.indexOf('.grid{grid-template-columns:1fr;}')>=0,'ZO-G 窄屏 .grid 单列堆叠(实际='+(h.indexOf('.grid{grid-template-columns:1fr;}')>=0)+')');
  ok(h.indexOf('nav.tabs{position:fixed; left:0; right:0; bottom:0;')>=0,'ZO-H 导航窄屏固定到底部 Tab(实际='+(h.indexOf('nav.tabs{position:fixed; left:0; right:0; bottom:0;')>=0)+')');
}

// ZR: OCR 外部链路降级路径专项（无Key/网络挂/超时/坏响应/Tesseract未加载 都不崩、给提示、数据不污染）
console.log('\n=== ZR: OCR 外部链路降级路径专项 ===');
{
  const ZR=makeDevice('ZR'); const zapi=ZR.api, zctx=ZR.ctx;
  // 补齐 vm 里缺失的浏览器全局（真实浏览器有，vm 默认无），避免误报
  zctx.HTMLCanvasElement=function(){}; zctx.File=function(){};
  zctx.FormData=function(){this.append=function(){};};   // OCR.space 引擎用 new FormData()，vm 默认无，补桩
  const fakeCanvas=new zctx.HTMLCanvasElement(); fakeCanvas.toDataURL=()=>'data:image/jpeg;base64,AAAA';
  const fakeFile=new zctx.File();
  // vm 里 Node 的 URL.createObjectURL 不认假 File，桩一个避免噪声（真实浏览器走原生）
  const _origURL=zctx.URL; zctx.URL=Object.create(_origURL); zctx.URL.createObjectURL=()=>'blob:fake';
  function setCfg(c){ zctx.localStorage.setItem('wb_wujin_ocr_cfg', JSON.stringify(Object.assign({provider:'tesseract',baiduAk:'',baiduSk:'',proxy:'',ocrSpaceKey:'',removeLines:true},c))); }
  const stEl=()=>ZR.getEl('smart_all_ocr_status'); const txtEl=()=>ZR.getEl('smart_all_txt');

  // ZR-A: 百度无 Key → 明确报错（先于任何网络/图片操作）
  setCfg({provider:'baidu'});
  let aErr=null;
  try{ await zapi.smartOCRBaidu(fakeFile); }catch(e){ aErr=e; }
  ok(aErr&&/API Key/.test(aErr.message),'ZR-A 百度无Key→明确报错(实际='+(aErr&&aErr.message)+')');

  // ZR-B: OCR.space 无 Key → 明确报错（在 preprocessImage 之前）
  setCfg({provider:'ocrspace',ocrSpaceKey:''});
  let bErr=null;
  try{ await zapi.smartOCRSpace(fakeFile); }catch(e){ bErr=e; }
  ok(bErr&&/OCR\.space API Key/.test(bErr.message),'ZR-B OCR.space无Key→明确报错(实际='+(bErr&&bErr.message)+')');

  // ZR-C: 网络/代理全挂（fetch 直接 reject）→ 抛出“无法连接识别中转”
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=()=>Promise.reject(new Error('network down'));
  let cErr=null;
  try{ await zapi.smartOCRBaidu(fakeFile); }catch(e){ cErr=e; }
  ok(cErr&&/无法连接识别中转/.test(cErr.message),'ZR-C 网络挂→中转失败提示(实际='+(cErr&&cErr.message)+')');

  // ZR-D: 代理返回 200 但百度 token 响应缺 access_token → 明确 token 错误
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=(u)=>{ const dec=decodeURIComponent(String(u)); if(dec.indexOf('/oauth/2.0/token')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({error_description:'invalid credential'})}); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  let dErr=null;
  try{ await zapi.smartOCRBaidu(fakeFile); }catch(e){ dErr=e; }
  ok(dErr&&/token 获取失败|invalid credential/.test(dErr.message),'ZR-D 百度token坏响应→明确报错(实际='+(dErr&&dErr.message)+')');

  // ZR-E: token 正常，但表格识别空 + 通用识别无结果 → 降级到底仍明确报错（不崩/不返回幽灵文本）
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=(u)=>{ const dec=decodeURIComponent(String(u)); if(dec.indexOf('/oauth/2.0/token')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({access_token:'TOK',expires_in:1000})}); if(dec.indexOf('/v1/table')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({tables_result:[]})}); if(dec.indexOf('/general_basic')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  let eErr=null, eText='';
  try{ eText=await zapi.smartOCRBaidu(fakeCanvas); }catch(e){ eErr=e; }
  ok(eErr&&/百度识别无结果/.test(eErr.message),'ZR-E 表格空+通用无结果→明确报错(实际='+(eErr&&eErr.message)+')');
  ok(eText==='','ZR-E2 失败不返回幽灵文本(实际='+JSON.stringify(eText)+')');

  // ZR-J: 通用识别返回 words_result:[]（真·空白图）—— ZR 轮识别的低危 UX 瑕疵。
  // 以前 gj.words_result 为真值(空数组) → map+filter 得空串 → 静默返回 '' → 编排器显示绿字“识别完成”实为空白。
  // 修复后 smartOCRBaidu 必须在返回前 throw「百度未识别到文字」，让编排器显示红字“识别失败”。
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=(u)=>{ const dec=decodeURIComponent(String(u)); if(dec.indexOf('/oauth/2.0/token')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({access_token:'TOK',expires_in:1000})}); if(dec.indexOf('/v1/table')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({tables_result:[]})}); if(dec.indexOf('/general_basic')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({words_result:[]})}); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  let jErr=null, jText='';
  try{ jText=await zapi.smartOCRBaidu(fakeCanvas); }catch(e){ jErr=e; }
  ok(jErr&&/百度未识别到文字/.test(jErr.message),'ZR-J 通用返回空数组→明确报错(实际='+(jErr&&jErr.message)+')');
  ok(jText==='','ZR-J2 空结果不返回幽灵文本(实际='+JSON.stringify(jText)+')');
  // ZR-J3..J6: 编排器 end-to-end —— 百度空结果必须显示红字“识别失败”，绝不能是绿字“识别完成”
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=(u)=>{ const dec=decodeURIComponent(String(u)); if(dec.indexOf('/oauth/2.0/token')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({access_token:'TOK',expires_in:1000})}); if(dec.indexOf('/v1/table')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({tables_result:[]})}); if(dec.indexOf('/general_basic')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({words_result:[]})}); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  txtEl().value='【J3原有内容】';
  let j3Threw=null;
  try{ await zapi.smartOCR({target:{files:[fakeCanvas]}},'all'); }catch(e){ j3Threw=e; }
  await new Promise(r=>setTimeout(r,40));
  ok(!j3Threw,'ZR-J3 编排器百度空结果不向外抛(实际='+(j3Threw&&j3Threw.message)+')');
  ok(/识别失败/.test(stEl().innerHTML)&&!/识别完成/.test(stEl().innerHTML),'ZR-J4 编排器显示识别失败(非绿字完成)(实际='+stEl().innerHTML+')');
  ok(txtEl().value==='【J3原有内容】','ZR-J5 原文本不被污染(实际='+txtEl().value+')');
  ok(zapi.getOcrBusy()===false,'ZR-J6 失败后_ocrBusy复位(实际='+zapi.getOcrBusy()+')');

  // ZR-K: OCR.space 返回纯空白 ParsedText（"   \n   "）—— 旧 !pr.ParsedText 拦不住（非空串）→ 绿字"识别完成"实为空白；现必须明确报错
  setCfg({provider:'ocrspace',ocrSpaceKey:'KEY'});
  zctx.fetch=(u)=>{ const dec=decodeURIComponent(String(u)); if(dec.indexOf('ocr.space')>=0) return Promise.resolve({ok:true,json:()=>Promise.resolve({ParsedResults:[{ParsedText:'   \n   '}]})}); return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); };
  let kErr=null;
  try{ await zapi.smartOCRSpace(fakeFile); }catch(e){ kErr=e; }
  ok(kErr&&/OCR\.space 未识别到文字/.test(kErr.message),'ZR-K OCR.space纯空白→明确报错(实际='+(kErr&&kErr.message)+')');
  // ZR-K2..K5: Tesseract 本地引擎返回空 t → 编排器兜底显示红字"识别失败"(非绿字)、原文本不污染、_ocrBusy 复位
  setCfg({provider:'tesseract'});
  zctx.Tesseract={createWorker:()=>Promise.resolve({recognize:()=>Promise.resolve({data:{t:''}}),terminate:()=>Promise.resolve()})};
  txtEl().value='【K2原有内容】';
  let k2Threw=null;
  try{ await zapi.smartOCR({target:{files:[fakeFile]}},'all'); }catch(e){ k2Threw=e; }
  await new Promise(r=>setTimeout(r,60));
  ok(!k2Threw,'ZR-K2 编排器Tesseract空结果不向外抛(实际='+(k2Threw&&k2Threw.message)+')');
  ok(/识别失败/.test(stEl().innerHTML)&&!/识别完成/.test(stEl().innerHTML),'ZR-K3 编排器显示识别失败(非绿字完成)(实际='+stEl().innerHTML+')');
  ok(txtEl().value==='【K2原有内容】','ZR-K4 原文本不被污染(实际='+txtEl().value+')');
  ok(zapi.getOcrBusy()===false,'ZR-K5 失败后_ocrBusy复位(实际='+zapi.getOcrBusy()+')');

  // ZR-F: fetchBaidu 直接——全部代理非 ok → 抛“无法连接识别中转”
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=()=>Promise.resolve({ok:false,status:500,json:()=>Promise.resolve({})});
  let fErr=null;
  try{ await zapi.fetchBaidu('https://aip.baidubce.com/x'); }catch(e){ fErr=e; }
  ok(fErr&&/无法连接识别中转/.test(fErr.message),'ZR-F 代理全非ok→中转失败提示(实际='+(fErr&&fErr.message)+')');

  // ZR-G: 编排器 smartOCR 在网络失败时——不向外抛、状态显示红字“识别失败”、原文本框不被污染、_ocrBusy 复位
  setCfg({provider:'baidu',baiduAk:'ak',baiduSk:'sk'});
  zctx.fetch=()=>Promise.reject(new Error('network down'));
  txtEl().value='【原有内容请勿动】';
  let gThrew=null;
  try{ await zapi.smartOCR({target:{files:[fakeFile]}},'all'); }catch(e){ gThrew=e; }
  await new Promise(r=>setTimeout(r,40));
  ok(!gThrew,'ZR-G 编排器网络失败不向外抛(实际='+(gThrew&&gThrew.message)+')');
  ok(/识别失败/.test(stEl().innerHTML),'ZR-G2 状态显示“识别失败”红字(实际='+stEl().innerHTML+')');
  ok(txtEl().value==='【原有内容请勿动】','ZR-G3 原文本框不被污染(实际='+txtEl().value+')');
  ok(zapi.getOcrBusy()===false,'ZR-G4 失败后 _ocrBusy 复位(实际='+zapi.getOcrBusy()+')');

  // ZR-H: 本地引擎(Tesseract)未加载 + 无 CDN 元素 → 状态“引擎不可用”且不崩
  setCfg({provider:'tesseract'});
  delete zctx.Tesseract;
  let hThrew=null;
  try{ await zapi.smartOCR({target:{files:[fakeFile]}},'all'); }catch(e){ hThrew=e; }
  const cdn=ZR.getEl('tessCDN');
  if(cdn.onerror) cdn.onerror();
  ok(!hThrew,'ZR-H 本地引擎缺失不崩(实际='+(hThrew&&hThrew.message)+')');
  ok(/引擎加载失败|引擎不可用/.test(stEl().innerHTML),'ZR-H2 状态提示引擎不可用(实际='+stEl().innerHTML+')');
  ok(zapi.getOcrBusy()===false,'ZR-H3 引擎缺失后 _ocrBusy 复位(实际='+zapi.getOcrBusy()+')');

  // ZR-I: ocrspace 整链异常（preprocess + 网络）→ 不向外抛、状态红字、数据不污染、_ocrBusy 复位
  setCfg({provider:'ocrspace',ocrSpaceKey:'KEY'});
  zctx.fetch=()=>Promise.reject(new Error('network down'));
  txtEl().value='【ocrspace原有内容】';
  let iThrew=null;
  try{ await zapi.smartOCR({target:{files:[fakeFile]}},'all'); }catch(e){ iThrew=e; }
  await new Promise(r=>setTimeout(r,60));
  ok(!iThrew,'ZR-I ocrspace整链异常不向外抛(实际='+(iThrew&&iThrew.message)+')');
  ok(/识别失败/.test(stEl().innerHTML),'ZR-I2 状态显示识别失败(实际='+stEl().innerHTML+')');
  ok(txtEl().value==='【ocrspace原有内容】','ZR-I3 原文本不被污染(实际='+txtEl().value+')');
  ok(zapi.getOcrBusy()===false,'ZR-I4 失败后_ocrBusy复位(实际='+zapi.getOcrBusy()+')');
}

console.log('\n=== ZU: 库位管理级联（renameLoc/delLoc/addLocSetting 联动商品 loc）===');
{
  api.products=[]; api.cash=[]; api.flow=[]; api.parties=[]; api.ar=[]; api.delLog=[]; api.stockLog=[];
  api.cfg.locPresets=['1库','2库','3库'];
  ['螺丝','扳手','电钻','钳子'].forEach((n,i)=>{api.products.push({id:'P'+i,name:n,cat:'工具',spec:'',unit:'个',conv:{},loc: i<2?'1库':'2库',_t:1,stock:0,safe:10,cost:1,wholesale:2,retail:3,price:3,note:''});});
  // ZU-1..ZU-5：renameLoc 改名 → 预设更新 + 引用该库位的商品全部级联改名 + 旧名无残留 + 不改其它 + 打 _t
  D.getEl('loc_0').value='新库';
  api.renameLoc(0);
  ok(api.cfg.locPresets[0]==='新库','ZU-1 renameLoc预设更新(实际='+api.cfg.locPresets[0]+')');
  ok(api.products.filter(p=>p.loc==='新库').length===2,'ZU-2 两个1库商品级联改名(实际='+api.products.filter(p=>p.loc==='新库').length+')');
  ok(api.products.filter(p=>p.loc==='1库').length===0,'ZU-3 旧名1库无残留(实际='+api.products.filter(p=>p.loc==='1库').length+')');
  ok(api.products.filter(p=>p.loc==='2库').length===2,'ZU-4 2库商品不受影响(实际='+api.products.filter(p=>p.loc==='2库').length+')');
  ok(api.products.filter(p=>p.loc==='新库').every(p=>typeof p._t==='number'),'ZU-5 改名商品打_t(云同步可传播)');
  // ZU-6..ZU-9：重名 / 空名 守卫
  D.getEl('loc_0').value='2库';
  ctx.__lastAlert='';
  api.renameLoc(0);
  ok(api.cfg.locPresets[0]==='新库','ZU-6 重名不改写(实际='+api.cfg.locPresets[0]+')');
  ok(/已存在/.test(ctx.__lastAlert||''),'ZU-7 重名弹提示(实际='+ctx.__lastAlert+')');
  D.getEl('loc_0').value='   ';
  ctx.__lastAlert='';
  api.renameLoc(0);
  ok(api.cfg.locPresets[0]==='新库','ZU-8 空名不改写(实际='+api.cfg.locPresets[0]+')');
  ok(/不能为空/.test(ctx.__lastAlert||''),'ZU-9 空名弹提示(实际='+ctx.__lastAlert+')');
  // ZU-10..ZU-12：delLoc 删“正在用的库位” → 预设移除 + 引用商品 loc 清空 + 其它不动
  api.cfg.locPresets=['1库','2库'];
  api.products.forEach(p=>{ p.loc = (p.id==='P0')?'1库':'2库'; });
  ctx.confirm=(m)=>true;
  api.delLoc(0);
  ok(api.cfg.locPresets.length===1 && api.cfg.locPresets[0]==='2库','ZU-10 删除后预设剩1个(实际='+JSON.stringify(api.cfg.locPresets)+')');
  ok(api.products.find(p=>p.id==='P0').loc==='','ZU-11 被删库位商品loc清空(实际='+JSON.stringify(api.products.find(p=>p.id==='P0').loc)+')');
  ok(api.products.find(p=>p.id==='P1').loc==='2库','ZU-12 未用库位商品不受影响(实际='+api.products.find(p=>p.id==='P1').loc+')');
  // ZU-13：delLoc 取消确认 → 不动
  api.cfg.locPresets=['1库','2库'];
  ctx.confirm=(m)=>false;
  api.delLoc(0);
  ok(api.cfg.locPresets.length===2,'ZU-13 取消删除预设不变(实际='+api.cfg.locPresets.length+')');
  // ZU-14..ZU-17：addLocSetting 新增 / 重名不新增 / 空名不新增
  ctx.__promptRet='4库';
  const lenA=api.cfg.locPresets.length;
  api.addLocSetting();
  ok(api.cfg.locPresets.length===lenA+1 && api.cfg.locPresets.includes('4库'),'ZU-14 新增库位成功(实际='+JSON.stringify(api.cfg.locPresets)+')');
  ctx.__promptRet='4库';
  ctx.__lastAlert='';
  api.addLocSetting();
  ok(api.cfg.locPresets.length===lenA+1,'ZU-15 重名不新增(实际长度='+api.cfg.locPresets.length+')');
  ok(/已存在/.test(ctx.__lastAlert||''),'ZU-16 重名弹提示');
  ctx.__promptRet='';
  api.addLocSetting();
  ok(api.cfg.locPresets.length===lenA+1,'ZU-17 空名不新增(实际长度='+api.cfg.locPresets.length+')');
  // ZU-18..ZU-20：渲染安全 + 旧值兜底
  api.cfg.locPresets=[];
  api.renderLocMgr();
  ok(/暂无/.test(D.getEl('locMgr').innerHTML),'ZU-18 空预设显示暂无');
  api.cfg.locPresets=['1库','2库']; api.products[0].loc='1库';
  api.renderLocMgr();
  ok(/个商品使用/.test(D.getEl('locMgr').innerHTML),'ZU-19 显示商品使用数');
  api.locBadge('1库'); api.locBadge('');
  const lsh=api.locSelectHTML('旧库');
  ok(/旧库（旧值）/.test(lsh),'ZU-20 旧值兜底选项(实际包含旧库='+lsh.includes('旧库')+')');
}

// ZW: 商品图片上传链路（压缩/上传/回填容错）—— 防坏图崩、防网络失败崩、URL 正确
console.log('\n=== ZW. 商品图片上传链路容错 ===');
{
  // ZW1: compressImage 正常图 → 解析出 blob（不崩）
  let cErr=null,cRes=null;
  try{ cRes=await ctx.compressImage({},800); }catch(e){ cErr=e; }
  ok(!cErr && cRes && typeof cRes==='object','ZW1 compressImage 正常解析出blob(实际='+(cErr?cErr.message:'无')+')');
}
{
  // ZW2: compressImage 图片解码失败（onerror）→ 明确 reject，不崩
  const origImg=ctx.Image;
  ctx.Image=function(){ Object.defineProperty(this,'src',{set(v){ if(this.onerror) this.onerror(new Error('decode fail')); },get(){return this._s;}}); };
  let z2err=null;
  try{ await ctx.compressImage({},800); }catch(e){ z2err=e; }
  ctx.Image=origImg;
  ok(z2err && /解码失败/.test(z2err.message),'ZW2 坏图→明确reject(实际='+(z2err?z2err.message:'无')+')');
}
{
  // ZW3: uploadPic 未启用云同步 → 明确 reject「请先在云端启用同步」
  api.setCloud({enabled:false});
  let z3err=null;
  try{ await ctx.uploadPic({type:'image/jpeg'},'book/products/x.jpg'); }catch(e){ z3err=e; }
  ok(z3err && /云端/.test(z3err.message),'ZW3 未启用云→明确报错(实际='+(z3err?z3err.message:'无')+')');
}
{
  // ZW4: uploadPic 启用云+正常响应 → 解析出正确的公开 URL（ourStorageBase+path）
  api.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'bk',token:'t',bucket:'wujin-pics'});
  ctx.__fetchLog=[];
  let z4err=null,z4url=null;
  try{ z4url=await ctx.uploadPic({type:'image/jpeg'},'bk/products/P1.jpg'); }catch(e){ z4err=e; }
  const base=ctx.ourStorageBase();
  ok(!z4err && z4url===base+'bk/products/P1.jpg','ZW4 上传成功返回公开URL(实际='+z4url+')');
  ok(base==='https://x.supabase.co/storage/v1/object/public/wujin-pics/','ZW4b ourStorageBase 拼装正确(实际='+base+')');
}
{
  // ZW5: uploadPic 存储网关返回 400 → 明确 reject「上传失败(400)」不崩
  const origFetch=ctx.fetch;
  ctx.fetch=()=>Promise.resolve({ok:false,status:400,json:()=>Promise.resolve({})});
  api.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'bk',token:'t',bucket:'wujin-pics'});
  let z5err=null;
  try{ await ctx.uploadPic({type:'image/jpeg'},'bk/products/P1.jpg'); }catch(e){ z5err=e; }
  ctx.fetch=origFetch;
  ok(z5err && /上传失败\(400\)/.test(z5err.message),'ZW5 网关400→明确报错(实际='+(z5err?z5err.message:'无')+')');
}
{
  // ZW6: uploadPic 网络异常（fetch 抛错）→ 明确 reject 不崩
  const origFetch=ctx.fetch;
  ctx.fetch=()=>Promise.reject(new Error('network down'));
  api.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'bk',token:'t',bucket:'wujin-pics'});
  let z6err=null;
  try{ await ctx.uploadPic({type:'image/jpeg'},'bk/products/P1.jpg'); }catch(e){ z6err=e; }
  ctx.fetch=origFetch;
  ok(z6err && /network down/.test(z6err.message),'ZW6 网络异常→明确reject(实际='+(z6err?z6err.message:'无')+')');
}
{
  // ZW7: isOurPic / ourStorageBase / genPicPath 逻辑正确
  api.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'bk',token:'t',bucket:'wujin-pics'});
  const base=ctx.ourStorageBase();
  ok(base==='https://x.supabase.co/storage/v1/object/public/wujin-pics/','ZW7a ourStorageBase 拼装');
  ok(ctx.isOurPic(base+'bk/x.jpg')===true,'ZW7b 自家URL判为自家');
  ok(ctx.isOurPic('https://evil.com/x.jpg')===false,'ZW7c 外部URL判为外部');
  ok(ctx.isOurPic('')===false,'ZW7d 空URL非自家');
  ok(ctx.genPicPath('P1')==='bk/products/P1.jpg','ZW7e genPicPath 拼装(实际='+ctx.genPicPath('P1')+')');
}
{
  // ZW8: removeOurPic 仅对自家URL触发DELETE；外部URL不动存储
  api.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'bk',token:'t',bucket:'wujin-pics'});
  ctx.__fetchLog=[];
  ctx.removeOurPic('https://evil.com/x.jpg');
  ok(ctx.__fetchLog.filter(f=>f.method==='DELETE').length===0,'ZW8a 外部URL不触发删除');
  ctx.removeOurPic(ctx.ourStorageBase()+'bk/x.jpg');
  ok(ctx.__fetchLog.filter(f=>f.method==='DELETE').length===1,'ZW8b 自家URL触发1次DELETE');
}

// ZX: 模糊测试骨架（随机畸形输入，断言不崩、不出 NaN、库存有限、对账结构正确）
console.log('\n=== ZX. 模糊测试骨架（畸形输入健壮性）===');
{
  function rndScalar(){
    const r=Math.random();
    if(r<0.15) return Math.random()*1e9;
    if(r<0.30) return -Math.random()*1e9;
    if(r<0.42) return NaN;
    if(r<0.54) return Infinity;
    if(r<0.66) return '';
    if(r<0.78) return '   ';
    if(r<0.88) return null;
    return undefined;
  }
  function rndObj(depth){
    const o={}; const n=1+Math.floor(Math.random()*4);
    for(let i=0;i<n;i++){ o['k'+Math.floor(Math.random()*5)]= depth>0 ? (Math.random()<0.5?rndScalar():rndObj(depth-1)) : rndScalar(); }
    return o;
  }
  // ZX1-4: importJSON 吃随机畸形对象不崩
  for(let i=0;i<4;i++){
    let threw=null; try{ api.importJSON(rndObj(3)); }catch(e){ threw=e; }
    ok(!threw,'ZX'+(i+1)+' importJSON 畸形对象不崩'+(threw?(' → '+threw.message):''));
  }
  // ZX5-7: commitFlow 吃随机字段不崩，库存有限
  const {P}=freshScenario(); const today=api.todayStr();
  api.products=api.products.map(p=>({...p,stock:10}));
  for(let i=0;i<3;i++){
    let threw=null;
    try{
      api.commitFlow({pid:P[0],qty:rndScalar(),price:rndScalar(),type:Math.random()<0.5?'buy':'sell',uname:'个',ufactor:rndScalar(),settle:Math.random()<0.5?'cash':'credit',date:today,pname:'螺丝',partyId:Math.random()<0.5?api.parties[0].id:undefined,partyName:'张三'});
    }catch(e){ threw=e; }
    ok(!threw,'ZX'+(5+i)+' commitFlow 随机字段不崩'+(threw?(' → '+threw.message):''));
    const st=api.products.find(x=>x.id===P[0]).stock;
    ok(Number.isFinite(st),'ZX'+(5+i)+'b 库存仍为有限数(实际='+st+')');
  }
  // ZX8: 注入 50 条随机坏流水后 renderKPI/renderStockAna/renderAll 不崩、不出 NaN
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];
  api.products=[{id:'P1',name:'螺丝',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''}];
  for(let i=0;i<50;i++){ api.commitFlow({pid:'P1',qty:rndScalar(),price:rndScalar(),type:Math.random()<0.5?'buy':'sell',uname:'个',ufactor:rndScalar(),settle:Math.random()<0.5?'cash':'credit',date:today,pname:'螺丝',partyName:'张三'}); }
  let threw=null; try{ api.renderKPI(); ctx.renderStockAna(); api.renderAll(); }catch(e){ threw=e; }
  ok(!threw,'ZX8 50条随机坏流水后渲染不崩'+(threw?(' → '+threw.message):''));
  const kpEl=D.getEl('kpSell'); ok(!kpEl||String(kpEl.textContent||'').indexOf('NaN')<0,'ZX8b 概览销售额不含NaN');
  // ZX9: 极大值不溢出、不含NaN
  api.flow=[{id:'FBig',type:'sell',pid:'P1',pname:'螺丝',qty:1e15,price:1e15,refund:false,date:today,_t:1}];
  let threw2=null; try{ api.renderKPI(); }catch(e){ threw2=e; }
  ok(!threw2,'ZX9 极大值不崩');
  const ks=D.getEl('kpSell'); ok(ks && String(ks.textContent||'').indexOf('NaN')<0,'ZX9b 极大值不含NaN');
  // ZX10: reconcileStock 畸形数据下不崩且返回结构正确
  let threw3=null,r3=null; try{ r3=ctx.reconcileStock(); }catch(e){ threw3=e; }
  ok(!threw3,'ZX10 reconcileStock 畸形数据不崩'+(threw3?(' → '+threw3.message):''));
  ok(r3&&Array.isArray(r3.mism)&&Array.isArray(r3.legacy),'ZX10b reconcileStock 返回 {mism,legacy}');
  // ZX11: reconcileFix 一致路径不崩
  let threw4=null; try{ ctx.reconcileFix(); }catch(e){ threw4=e; }
  ok(!threw4,'ZX11 reconcileFix 不崩'+(threw4?(' → '+threw4.message):''));
}

console.log('\n=== ZY. 开机自检自愈（autoHealthCheck）===');
{
  // 注入各种低级损坏
  api.products=[
    {id:'G1',name:'正常品',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:5,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''},
    {id:'G2',name:'NaN库存',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:NaN,safe:1,cost:1,wholesale:2,retail:3,price:3,note:''},
    {name:'缺id',cat:'工具',spec:'',unit:'个',conv:{},loc:'',stock:2,price:3},
    {id:'G4',name:'Infinity价',cat:'工具',spec:'',unit:'个',conv:{},loc:'',_t:1,stock:1,safe:1,cost:1,wholesale:2,retail:3,price:Infinity,note:''},
    {id:'G5',name:'conv坏',cat:'工具',spec:'',unit:'个',conv:'bad',loc:'',_t:1,stock:1,price:3},
    '坏元素字符串', null, 123
  ];
  api.flow=[
    {id:'F1',type:'sell',pid:'G1',qty:Infinity,price:5,refund:false,date:api.todayStr(),_t:1},
    {id:'F2',type:'buy',pid:'G1',qty:2,price:'abc',date:api.todayStr(),_t:1}
  ];
  api.cash=[
    {id:'C1',type:'in',cat:'其他',amount:'abc',date:api.todayStr(),_t:1},
    {id:'C2',type:'out',cat:'其他',amount:NaN,date:api.todayStr(),_t:1}
  ];
  api.delLog=[
    {id:'D1',type:'product',t:1},
    {type:'flow',t:2},
    {id:'D3',t:3},
    '坏墓碑'
  ];
  let threw=null,res=null;
  try{ res=ctx.autoHealthCheck(); }catch(e){ threw=e; }
  ok(!threw,'ZY1 autoHealthCheck 不抛异常'+(threw?(' → '+threw.message):''));
  ok(res&&typeof res.fixed==='number'&&res.fixed>0,'ZY2 确实修复了若干处(fixed='+(res&&res.fixed)+')');
  const g1=api.products.find(p=>p.id==='G1');
  ok(g1&&g1.stock===5,'ZY3 正常品未被改动(stock=5)');
  const g2=api.products.find(p=>p.id==='G2');
  ok(g2&&g2.stock===0,'ZY4 NaN库存已归零(stock='+(g2&&g2.stock)+')');
  const g4=api.products.find(p=>p.id==='G4');
  ok(g4&&g4.price===0,'ZY5 Infinity单价已归零(price='+(g4&&g4.price)+')');
  const filled=api.products.filter(p=>p.name==='缺id');
  ok(filled.length===1&&typeof filled[0].id==='string'&&filled[0].id,'ZY6 缺id已补且唯一');
  ok(typeof filled[0]._t==='number','ZY7 缺_t已补');
  ok(!api.products.some(p=>typeof p!=='object'||Array.isArray(p)),'ZY8 非对象商品元素已隔离');
  const g5=api.products.find(p=>p.id==='G5');
  ok(g5&&g5.conv&&typeof g5.conv==='object'&&!Array.isArray(g5.conv),'ZY9 conv 非对象已修复为{}');
  const f1=api.flow.find(f=>f.id==='F1');
  ok(f1&&f1.qty===0,'ZY10 Infinity数量已归零(qty='+(f1&&f1.qty)+')');
  const f2=api.flow.find(f=>f.id==='F2');
  ok(f2&&f2.price===0,'ZY11 字符串单价已归零(price='+(f2&&f2.price)+')');
  const c1=api.cash.find(c=>c.id==='C1');
  ok(c1&&c1.amount===0,'ZY12 字符串金额已归零(amount='+(c1&&c1.amount)+')');
  const c2=api.cash.find(c=>c.id==='C2');
  ok(c2&&c2.amount===0,'ZY13 NaN金额已归零(amount='+(c2&&c2.amount)+')');
  ok(!api.delLog.some(d=>typeof d!=='object'||Array.isArray(d)),'ZY14 坏墓碑已隔离');
  const dmiss=api.delLog.filter(d=>d.type==='flow');
  ok(dmiss.length===1&&typeof dmiss[0].id==='string'&&dmiss[0].id,'ZY15 墓碑缺id已补');
  const d3=api.delLog.find(d=>d.id==='D3');
  ok(d3&&d3.type==='?','ZY16 墓碑缺type已补为?');
  let res2=null;try{ res2=ctx.autoHealthCheck(); }catch(e){ res2={err:e.message}; }
  ok(res2&&res2.fixed===0&&res2.removed===0,'ZY17 二次运行幂等(无新修复 fixed='+(res2&&res2.fixed)+')');
  api.products=[];api.cash=[];api.flow=[];api.parties=[];api.ar=[];api.stockLog=[];api.delLog=[];
  let threw3=null;try{ ctx.autoHealthCheck(); }catch(e){ threw3=e; }
  ok(!threw3,'ZY18 全空数据不崩');
}

console.log('\n=== ZZ. 明细改日期→流水日期同步（v1.13.26 修复）===');
{
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:10,price:1,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const sl=api.stockLog.find(s=>s.pid===P[0] && s.src==='buy');
  const fid=sl.fid; const newDate='2026-01-15';
  api.editStockLog(sl.id);
  ctx.document.getElementById('sl_date').value=newDate;
  ctx.document.getElementById('sl_synflow').checked=true;
  ctx.document.getElementById('sl_qty').value=String(sl.qty);
  ctx.document.getElementById('sl_unit').value='1';
  ctx.document.getElementById('sl_price').value=String(api.flow.find(f=>f.id===fid).price);
  ctx.document.getElementById('sl_adj').checked=false;
  ctx.document.getElementById('sl_delflow').checked=false;
  api.confirmModal();
  const f=api.flow.find(x=>x.id===fid);
  ok(f.date===newDate,'ZZ1 明细改日期+勾同步 → 流水日期已同步 (f.date='+f.date+')');
  ok(api.stockLog.find(s=>s.id===sl.id).date===newDate,'ZZ2 明细自身日期已更新');
  ok(f._hist&&f._hist.some(h=>h.ch&&h.ch.some(c=>c.f==='日期')),'ZZ3 流水修改历史记录了日期变更');
}
{
  // ZZ4: 新建流水时，流水与出入库明细日期应一致（创建即同源）
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:5,price:2,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  const sl=api.stockLog.find(s=>s.fid===f.id);
  ok(sl && sl.date===f.date,'ZZ4 新建流水→明细日期一致 (flow='+f.date+' sl='+(sl&&sl.date)+')');
}
{
  // ZZ5: 编辑流水(原地)改日期 → 明细日期也必须跟着变（昨天那坑的反方向）
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:5,price:2,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  const newDate='2026-03-20';
  ctx.document.getElementById('ef_qty').value=String(f.qty);
  ctx.document.getElementById('ef_price').value=String(f.price);
  ctx.document.getElementById('ef_settle').value=f.settle;
  ctx.document.getElementById('ef_party').value=f.partyId||'';
  ctx.document.getElementById('ef_date').value=newDate;
  ctx.document.getElementById('ef_note').value=f.note||'';
  api.saveFlowEdit(f.id);
  const sl=api.stockLog.find(s=>s.fid===f.id);
  ok(f.date===newDate,'ZZ5a 编辑流水改日期→流水日期已更新 (f.date='+f.date+')');
  ok(sl && sl.date===newDate,'ZZ5b 编辑流水改日期→明细日期同步 (sl.date='+(sl&&sl.date)+')');
}
{
  // ZZ6: 编辑流水改数量 → 明细数量也必须跟着变
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:5,price:2,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  ctx.document.getElementById('ef_qty').value='8';
  ctx.document.getElementById('ef_price').value=String(f.price);
  ctx.document.getElementById('ef_settle').value=f.settle;
  ctx.document.getElementById('ef_party').value=f.partyId||'';
  ctx.document.getElementById('ef_date').value=f.date;
  ctx.document.getElementById('ef_note').value=f.note||'';
  api.saveFlowEdit(f.id);
  const sl=api.stockLog.find(s=>s.fid===f.id);
  ok(f.qty===8,'ZZ6a 编辑流水改数量→流水数量已更新');
  ok(sl && sl.qty===8,'ZZ6b 编辑流水改数量→明细数量同步');
}
{
  // ZZ7: 编辑流水改备注 → 流水备注更新且不崩（明细本身无备注字段，属正常）
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:5,price:2,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  ctx.document.getElementById('ef_qty').value=String(f.qty);
  ctx.document.getElementById('ef_price').value=String(f.price);
  ctx.document.getElementById('ef_settle').value=f.settle;
  ctx.document.getElementById('ef_party').value=f.partyId||'';
  ctx.document.getElementById('ef_date').value=f.date;
  ctx.document.getElementById('ef_note').value='改了备注';
  api.saveFlowEdit(f.id);
  ok(api.flow.find(x=>x.id===f.id).note==='改了备注','ZZ7 编辑流水改备注→流水备注已更新且不崩');
}
{
  // ZZ8: 明细编辑「同步流水」与「同步现金/应收」拆分验证
  const {P}=freshScenario();
  const today=api.todayStr();
  // --- ZZ8a/b: 默认只勾「同步流水」(sl_cash 不勾) → 流水同步，现金不动 ---
  api.commitFlow({pid:P[0],qty:3,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  let f=api.flow[api.flow.length-1];
  let sl=api.stockLog.find(s=>s.fid===f.id);
  const cid=f.linkCashId;
  let c0=api.cash.find(x=>x.id===cid);
  let cashDate0=c0?c0.date:null;
  api.editStockLog(sl.id);
  let newDate='2026-05-05';
  ctx.document.getElementById('sl_date').value=newDate;
  ctx.document.getElementById('sl_synflow').checked=true;   // 默认勾选
  ctx.document.getElementById('sl_cash').checked=false;      // 默认不勾选
  ctx.document.getElementById('sl_qty').value=String(sl.qty);
  ctx.document.getElementById('sl_unit').value='1';
  ctx.document.getElementById('sl_price').value=String(f.price);
  ctx.document.getElementById('sl_adj').checked=false;
  ctx.document.getElementById('sl_delflow').checked=false;
  api.confirmModal();
  let c=api.cash.find(x=>x.id===cid);
  ok(f.date===newDate,'ZZ8a 明细改日期→流水日期同步(默认)');
  ok(c && c.date===cashDate0,'ZZ8b 默认不勾现金→现金日期不变(不过度同步)');
  // --- ZZ8c/d: 显式勾「同步现金」才改现金(A2 路径仍可用) ---
  api.editStockLog(sl.id);
  let newDate2='2026-05-20';
  ctx.document.getElementById('sl_date').value=newDate2;
  ctx.document.getElementById('sl_synflow').checked=true;
  ctx.document.getElementById('sl_cash').checked=true;       // 显式勾选
  ctx.document.getElementById('sl_qty').value=String(sl.qty);
  ctx.document.getElementById('sl_unit').value='1';
  ctx.document.getElementById('sl_price').value=String(f.price);
  ctx.document.getElementById('sl_adj').checked=false;
  ctx.document.getElementById('sl_delflow').checked=false;
  api.confirmModal();
  c=api.cash.find(x=>x.id===cid);
  ok(f.date===newDate2,'ZZ8c 明细改日期→流水日期同步(勾现金)');
  ok(c && c.date===newDate2,'ZZ8d 勾选同步现金→现金日期同步(A2)');
  // --- ZZ8e/f/g: 赊账 勾选同步现金 → 应收同步 ---
  api.commitFlow({pid:P[0],qty:2,price:4,type:'buy',uname:'个',ufactor:1,settle:'credit',date:today,pname:'螺丝',partyName:'某单位'});
  f=api.flow[api.flow.length-1];
  sl=api.stockLog.find(s=>s.fid===f.id);
  api.editStockLog(sl.id);
  let newDate3='2026-06-06';
  ctx.document.getElementById('sl_date').value=newDate3;
  ctx.document.getElementById('sl_synflow').checked=true;
  ctx.document.getElementById('sl_cash').checked=true;
  ctx.document.getElementById('sl_qty').value=String(sl.qty);
  ctx.document.getElementById('sl_unit').value='1';
  ctx.document.getElementById('sl_price').value=String(f.price);
  ctx.document.getElementById('sl_adj').checked=false;
  ctx.document.getElementById('sl_delflow').checked=false;
  api.confirmModal();
  let a=api.ar.find(x=>x.id===f.linkArIds[0]);
  ok(f.date===newDate3,'ZZ8e 赊账:明细改日期→流水日期同步');
  ok(a && a.date===newDate3,'ZZ8f 赊账:勾选同步→应收日期同步(A2)');
  ok(a && a.due==='2026-07-06','ZZ8g 赊账:应收到期日按新日期+30天重算');
}
{
  // ZZ9: 删除明细默认勾选"连带删除流水" → 流水+现金/应收被级联删
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:3,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  const sl=api.stockLog.find(s=>s.fid===f.id);
  const cid=f.linkCashId;
  api.delStockLog(sl.id);
  ctx.document.getElementById('sl_delflow').checked=true;
  ctx.document.getElementById('sl_adj').checked=false;
  api.confirmModal();
  ok(!api.flow.find(x=>x.id===f.id),'ZZ9a 删除明细(默认勾选)→对应流水已删');
  ok(!api.cash.find(x=>x.id===cid),'ZZ9b 删除明细(默认勾选)→对应现金已删');
}

console.log('\n=== ZZ10/ZZ11. 打开弹窗即按默认态禁用互斥框（修复"默认勾选时下方逻辑不可选中框仍可选"）===');
{
  // ZZ10: 编辑弹窗打开时 sl_synflow 默认勾 → sl_adj/sl_delflow 应被禁用(不可选)，sl_cash 作子项仍可选
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:3,price:5,type:'sell',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  const sl=api.stockLog.find(s=>s.fid===f.id);
  api.editStockLog(sl.id); // 打开即触发 on-open 互斥纠正
  ok(ctx.document.getElementById('sl_synflow').checked===true,'ZZ10a 编辑弹窗打开时 sl_synflow 默认勾选');
  ok(ctx.document.getElementById('sl_adj').disabled===true,'ZZ10b 修复：sl_synflow 勾选时 sl_adj(仅调整库存)被禁用(不可选)');
  ok(ctx.document.getElementById('sl_delflow').disabled===true,'ZZ10c 修复：sl_synflow 勾选时 sl_delflow(连带删除)被禁用(不可选)');
  ok(ctx.document.getElementById('sl_cash').disabled===false,'ZZ10d sl_cash(同步现金/应收)作为子项仍可选');
}
{
  // ZZ11: 删除弹窗打开时 sl_delflow 默认勾 → sl_adj 应被禁用
  const {P}=freshScenario();
  const today=api.todayStr();
  api.commitFlow({pid:P[0],qty:2,price:4,type:'buy',uname:'个',ufactor:1,settle:'cash',date:today,pname:'螺丝',partyName:''});
  const f=api.flow[api.flow.length-1];
  const sl=api.stockLog.find(s=>s.fid===f.id);
  api.delStockLog(sl.id);
  ok(ctx.document.getElementById('sl_delflow').checked===true,'ZZ11a 删除弹窗打开时 sl_delflow 默认勾选');
  ok(ctx.document.getElementById('sl_adj').disabled===true,'ZZ11b 修复：sl_delflow 勾选时 sl_adj(调整库存)被禁用(不可选)');
}

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
if(fail){ console.log('失败项：'); found.forEach(f=>console.log('  - '+f)); }
process.exit(fail?1:0);
})();
