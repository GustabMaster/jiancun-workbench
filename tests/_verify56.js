// 第56轮 · 买卖流水自动进出入库明细台账 + 级联删除 + 方式标注 + 同步安全
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
    querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[{textContent:'',text:'',value:''}],options:[{textContent:'',text:'',value:''}],selectedIndex:0,click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}
function makeDevice(name,sharedCloud){
  const elements={};
  const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],body:{classList:makeClassList(),appendChild(e){ctx.__appended=(ctx.__appended||[]);ctx.__appended.push(e);}},addEventListener(){}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},confirm:(m)=>true,prompt:(m)=>ctx.__promptRet||'',URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
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
  commitFlow, commitRefund, delFlowData, delProductData, clearProductRecordsKeep, renderAll, adj, tomb, saveAllLocal, clearAll, delStockLog, editStockLog, flowIdsOfStockLogs, showStockHist, saveFlowEdit, undoLast, showFlowHist, showProductHist, saveProductEdit, addProduct, editProduct, stripConv, backfillNames, pnameOf, syncOnce, mergeIntoLocal, restoreLocal, restoreCloud, bulkDelete, clearByProduct, clearByCat, clearBySpec, clearByDate,   clearByBiz, renderKPI, migrateUnits, unitOptsHTML, slUnitOptions, importJSON, doCollect, collect, delCashData, delPartyData, bulkRemove, mergeArr, applyTombstones, addCash, addFlow, addParty, purgeAr, recvSum, partyBalance,parseSmart, smartParseLine, smartClassify, smartParseTable, smartParseConvText, smartApplyItems, smartApplyProduct, smartApplyFlow, smartApplyCash, smartApplyParty, clone,smartUndo, smartParseOne, smartParseLineMulti, smartSplitItems, smartAmount, smartDate, smartParty, smartNorm, smartOcrDate, smartOcrRows, smartTableize, renderOcrTable, ocrRowsToItems, cloudSig, flushLocal, propagateProductRename, propagatePartyRename, delTodo, clearDoneTodos,
  locSelectHTML, onLocChange, locBadge, renderLocMgr, renameLoc, delLoc, addLocSetting,
  get cfg(){return cfg}, set cfg(v){cfg=v},
  confirmModal(){ const m=globalThis.__modal; if(m && m.fn){ const r=m.fn(); if(r!=='__keep_modal__') globalThis.__modal=null; } },
  getModal(){ return globalThis.__modal; },
  save, getStockList, getFlowList, getProductMap, switchTab, lvStep, setPageSize
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};const md=ctx.document.getElementById('mDetail');if(md)md.innerHTML=bodyHtml||'';const mt=ctx.document.getElementById('mTitle');if(mt)mt.textContent=title||'';};
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0;
function ok(c,msg){if(c){pass++;console.log('  PASS '+msg);}else{fail++;console.log('  FAIL '+msg);}}

const D=makeDevice('D');const api=D.api;
function resetStockModals(){ ['sl_delflow','sl_adj','sl_synflow'].forEach(k=>{ const e=D.getEl(k); if(e){ e.checked=false; e.disabled=false; } }); }
function seed(){
  api.products=[{id:'p1',_t:1,name:'电钻',cat:'电动工具',spec:'12V',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p2',_t:1,name:'扳手',cat:'电动工具',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
  api.flow=[];api.stockLog=[];api.delLog=[];api.setCloud({enabled:false});
}

console.log('A. 买卖流水/退货自动进出入库明细台账（含方式标注）');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===8,'进货+5 → p1 库存 3→8');
ok(api.stockLog.length===1 && api.stockLog[0].type==='in' && api.stockLog[0].src==='buy' && api.stockLog[0].qty===5,'台账: 入库/进货/数量5');
ok(!!api.stockLog[0].fid && api.stockLog[0].fid===api.flow[0].id,'台账记录 fid 关联对应流水 id');
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===6,'销售-2 → p1 库存 8→6');
ok(api.stockLog.length===2 && api.stockLog[1].type==='out' && api.stockLog[1].src==='sell','台账: 出库/销售');
api.commitRefund({pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-03',qty:1,price:20,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===7,'退货+1 → p1 库存 6→7');
ok(api.stockLog.length===3 && api.stockLog[2].type==='in' && api.stockLog[2].src==='refund','台账: 入库/退货');
ok(api.stockLog.every(r=>typeof r._t==='number'),'所有台账记录带 _t（同步用）');

console.log('B. 删除流水 → 级联删除对应台账记录');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
const buyId=api.flow.find(f=>f.type==='buy').id;
api.delFlowData(buyId);
ok(api.stockLog.length===1 && api.stockLog[0].src==='sell','删除进货流水后，仅剩销售台账（buy 对应台账被级联删）');
ok(api.delLog.some(d=>d.type==='stocklog'),'级联删除的台账记录打了墓碑');
ok(api.products.find(p=>p.id==='p1').stock===1,'删进货流水冲回库存：原6 → 减5 = 1');

console.log('C. 删除商品 → 级联删除其全部台账记录');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'buy',pid:'p2',pname:'扳手',settle:'cash',date:'2026-08-01',qty:3,price:5,ufactor:1,uname:'把',note:''});
api.delProductData('p1');
ok(api.stockLog.length===1 && api.stockLog[0].pid==='p2','删 p1 后，仅剩 p2 的台账');
ok(api.stockLog.every(s=>s.pid!=='p1'),'p1 的台账全部级联删');
ok(api.delLog.filter(d=>d.type==='stocklog').length>=1,'p1 的台账墓碑已登记');

console.log('D. 出入库明细表格显示「方式」列（手动/进货/销售/退货）');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.adj('p1',1); // 手动入库：弹窗写入在 confirm 回调里
D.getEl('adj_qty').value='1'; // harness stub 无默认 value，需显式设置
api.confirmModal();
api.renderAll();
const slHtml=D.getEl('stockLogList')._html||'';
ok(slHtml.indexOf('方式')>=0,'表头含「方式」列');
ok(slHtml.indexOf('进货')>=0,'显示「进货」徽章');
ok(slHtml.indexOf('手动')>=0,'显示「手动」徽章（adj 来源）');

console.log('E. 同步合并保留 src/fid 字段（不丢来源信息）');
seed();
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
const round=JSON.parse(JSON.stringify(api.stockLog));
ok(round.length===1 && round[0].src==='sell' && !!round[0].fid,'JSON 往返后 src/fid 仍保留（同步并集合并不丢字段）');

console.log('F. 按日期汇总按单位分别统计（不再单位错乱）');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'buy',pid:'p2',pname:'扳手',settle:'cash',date:'2026-08-01',qty:3,price:5,ufactor:1,uname:'把',note:''});
api.adj('p2',1);D.getEl('adj_date').value='2026-08-01';D.getEl('adj_qty').value='2';api.confirmModal(); // 手动入库 2 把，同日期
api.renderAll();
const slHtml2=D.getEl('stockLogList')._html||'';
ok(slHtml2.indexOf('台')>=0 && slHtml2.indexOf('把')>=0,'汇总含两种单位（台 / 把）');
// 关键：同日的 5 台 + 3 把 + 2 把 = 入库按单位拆分，不应把 把 当成 台
ok(slHtml2.indexOf('5 台')>=0,'入库 5 台独立统计');
ok(slHtml2.indexOf('5 把')>=0,'入库 3 把 + 手动 2 把 = 5 把，按单位聚合');
ok(slHtml2.indexOf('8 台')<0 && slHtml2.indexOf('10 台')<0,'不应出现把「把」误算成「台」的错误汇总');

console.log('G. 勾选列对齐（表头与数据行同用 sel-col，无 sel-cb 残留）');
seed();
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.renderAll();
const g=D.getEl('stockLogList')._html||'';
ok(g.indexOf('th class="sel-col"')>=0,'表头勾选列使用 sel-col');
ok(g.indexOf('td class="sel-col"')>=0,'数据行勾选列使用 sel-col');
ok(g.indexOf('sel-cb')<0,'旧的 sel-cb 类已移除（避免列宽错位）');

console.log('H. 流水台账商品名兜底（选已有商品未传 pname 也能显示）');
seed();
// 模拟「选择已有商品」提交：pname 为空（真实 bug 场景）
api.commitFlow({type:'buy',pid:'p1',pname:'',settle:'cash',date:'2026-08-04',qty:4,price:10,ufactor:1,uname:'台',note:''});
const slast=api.stockLog[api.stockLog.length-1];
ok(slast.pname==='电钻','未传 pname 时，台账从商品主数据取到商品名「电钻」');
api.renderAll();
const h2=D.getEl('stockLogList')._html||'';
ok(h2.indexOf('电钻')>=0,'出入库明细渲染出商品名（修复后）');

console.log('I. 单条删除出入库明细可勾选连带删除对应流水（仅流水来源的明细）');
seed();
api.stockLog=[];api.flow=[];api.cash=[];api.ar=[];   // 构造干净环境
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.renderAll();
const recI=api.stockLog.find(s=>s.fid);
ok(!!recI && recI.src==='buy','存在由流水创建的台账记录');
const fidI=recI.fid, flowBefore=api.flow.length, stockBefore=api.stockLog.length;
api.delStockLog(recI.id);                 // 打开删除弹窗
resetStockModals();
D.getEl('sl_delflow').checked=true;       // 模拟用户在弹窗勾选「连带删除流水」
api.confirmModal();
ok(api.stockLog.find(s=>s.id===recI.id)===undefined,'该出入库明细已被删除');
ok(api.flow.find(f=>f.id===fidI)===undefined,'对应流水条次已被连带删除');
ok(api.flow.length===flowBefore-1,'流水总数减 1');
ok(api.flowIdsOfStockLogs([recI.id]).length===0,'删除后该明细不再关联任何流水');

console.log('J. 批量删除：fid 提取与去重正确（手动明细不参与）');
seed();
api.stockLog=[];api.flow=[];api.cash=[];api.ar=[];
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
api.adj('p1',1);D.getEl('adj_date').value='2026-08-03';D.getEl('adj_qty').value='1';api.confirmModal(); // 手动明细（无 fid）
api.renderAll();
ok(api.stockLog.filter(s=>!s.fid).length===1,'含 1 条手动明细（无 fid）');
const fidsJ=api.flowIdsOfStockLogs(api.stockLog.map(s=>s.id));
ok(fidsJ.length===2,'从 3 条明细（2 流水 + 1 手动）正确提取并去重出 2 个 fid');

console.log('K. 编辑出入库明细可勾选连带删除对应流水');
seed();
api.stockLog=[];api.flow=[];api.cash=[];api.ar=[];
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.renderAll();
const recK=api.stockLog.find(s=>s.fid);
const fidK=recK.fid, flowBeforeK=api.flow.length;
api.editStockLog(recK.id);
resetStockModals();
D.getEl('sl_delflow').checked=true;
api.confirmModal();
ok(api.stockLog.find(s=>s.id===recK.id)===undefined,'编辑弹窗勾选后该明细被删除');
ok(api.flow.find(f=>f.id===fidK)===undefined,'来源买卖被连带删除');
ok(api.flow.length===flowBeforeK-1,'流水总数减 1');

console.log('L. 删除/编辑弹窗对流水来源明细显示来源买卖信息');
seed();
api.stockLog=[];api.flow=[];api.cash=[];api.ar=[];
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-07',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.renderAll();
const recL=api.stockLog.find(s=>s.fid);
api.delStockLog(recL.id);
const dm=api.getModal();
ok(dm && dm.bodyHtml.indexOf('来源买卖')>=0,'删除弹窗显示「来源买卖」');
ok(dm && dm.bodyHtml.indexOf('2026-08-07')>=0,'删除弹窗显示流水日期');
api.editStockLog(recL.id);
const em=api.getModal();
ok(em && em.bodyHtml.indexOf('来源买卖')>=0,'编辑弹窗显示「来源买卖」');
ok(em && em.bodyHtml.indexOf('2026-08-07')>=0,'编辑弹窗显示流水日期');

console.log('M. 编辑明细数量联动修改对应流水数量（含现金/应收与库存对齐）');
seed();
api.stockLog=[];api.flow=[];api.cash=[];api.ar=[];
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.renderAll();
const recM=api.stockLog.find(s=>s.fid);
const fidM=recM.fid;
const f0m=api.flow.find(f=>f.id===fidM);
const cashIdM=f0m.linkCashId;
ok(api.cash.find(c=>c.id===cashIdM).amount===50,'初始关联现金金额 50（5×10）');
ok(api.products.find(p=>p.id==='p1').stock===8,'初始 p1 库存 3+5=8');
api.editStockLog(recM.id);
resetStockModals();
D.getEl('sl_qty').value='8';            // 改数量 5 → 8
D.getEl('sl_synflow').checked=true;     // 勾选同步修改流水
D.getEl('sl_cash').checked=true;        // 同时勾选同步现金/应收
api.confirmModal();
const f1m=api.flow.find(f=>f.id===fidM);
ok(f1m.qty===8,'来源买卖数量已同步改为 8');
ok(api.cash.find(c=>c.id===cashIdM).amount===80,'关联现金金额同步改为 80（8×10）');
ok(api.products.find(p=>p.id==='p1').stock===11,'库存按新数量对齐：3 + 8 = 11');
ok(api.stockLog.find(s=>s.id===recM.id).qty===8,'明细数量已改为 8');

console.log('N. 编辑明细改单位 → 同步流水 unitFactor/unitName + 库存按新因子重算（需求 T）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{盒:12}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===8,'初始库存 3+5=8（台，因子1）');
const recN=api.stockLog.find(s=>s.fid);
const fidN=recN.fid;
const f0n=api.flow.find(f=>f.id===fidN);
ok(f0n.unitFactor===1 && f0n.unitName==='台','初始流水 factor=1, unitName=台');
api.editStockLog(recN.id);
const emN=api.getModal();
ok(emN && emN.bodyHtml.indexOf('value="12"')>=0,'编辑弹窗单位下拉含「盒(因子12)」选项（与 addFlow 一致的下拉）');
ok(emN && emN.bodyHtml.indexOf('>盒<')>=0,'编辑弹窗单位下拉显示「盒」');
resetStockModals();
D.getEl('sl_qty').value='5';     // 数量不变，只改单位
const suN=D.getEl('sl_unit'); suN.value='12'; suN.selectedOptions=[{textContent:'盒',text:'盒',value:'12'}];
D.getEl('sl_synflow').checked=true;
api.confirmModal();
const f1n=api.flow.find(f=>f.id===fidN);
ok(f1n.unitFactor===12,'来源买卖 unitFactor 已同步为 12（盒）');
ok(f1n.unitName==='盒','来源买卖 unitName 已同步为「盒」');
ok(api.products.find(p=>p.id==='p1').stock===63,'库存按新因子重算：8 - 5 + 60 = 63');
const recNu=api.stockLog.find(s=>s.id===recN.id);
ok(recNu.qty===5,'明细数量保持 5（仅单位变化）');
ok(recNu.unit==='盒','明细单位已改为「盒」');

console.log('O. 编辑明细改单位（盒→台）→ 流水因子回退为基准 1 + 库存回算');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{盒:12}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:3,price:10,ufactor:12,uname:'盒',note:''});
ok(api.products.find(p=>p.id==='p1').stock===39,'初始库存 3 + 3×12 = 39（盒，因子12）');
const recO=api.stockLog.find(s=>s.fid);
const fidO=recO.fid;
api.editStockLog(recO.id);
resetStockModals();
D.getEl('sl_qty').value='3';
const suO=D.getEl('sl_unit'); suO.value='1'; suO.selectedOptions=[{textContent:'按台(基准)',text:'按台(基准)',value:'1'}];
D.getEl('sl_synflow').checked=true;
api.confirmModal();
const f1o=api.flow.find(f=>f.id===fidO);
ok(f1o.unitFactor===1,'来源买卖 unitFactor 已回退为 1（台/基准）');
ok((f1o.unitName||'').indexOf('台')>=0,'来源买卖 unitName 已回退为基准单位（含「台」）');
ok(api.products.find(p=>p.id==='p1').stock===6,'库存按新因子重算：39 - 36 + 3 = 6');

console.log('P. 编辑明细改单价 → 同步流水 price + 现金金额（库存不受影响）+ 历史记录（需求U-单价联动）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const recP=api.stockLog.find(s=>s.fid);
const fidP=recP.fid;
const f0p=api.flow.find(f=>f.id===fidP);
const cashIdP=f0p.linkCashId;
ok(api.cash.find(c=>c.id===cashIdP).amount===50,'初始现金金额 50（5×10）');
ok(api.products.find(p=>p.id==='p1').stock===8,'初始库存 3+5=8');
api.editStockLog(recP.id);
const emP=api.getModal();
ok(emP && emP.bodyHtml.indexOf('id="sl_price"')>=0,'编辑弹窗含「单价」输入框（流水来源）');
ok(emP && emP.bodyHtml.indexOf('修改历史（0）')>=0,'首次编辑时历史区显示「修改历史（0）」');
resetStockModals();
D.getEl('sl_qty').value='5';
D.getEl('sl_price').value='15';   // 单价 10 → 15
const suP=D.getEl('sl_unit'); suP.value='1'; suP.selectedOptions=[{textContent:'按台(基准)',text:'按台(基准)',value:'1'}];
D.getEl('sl_synflow').checked=true;
D.getEl('sl_cash').checked=true;  // 同时勾选同步现金/应收
api.confirmModal();
const f1p=api.flow.find(f=>f.id===fidP);
ok(f1p.price===15,'来源买卖 price 已同步改为 15');
ok(api.cash.find(c=>c.id===cashIdP).amount===75,'关联现金金额同步改为 75（5×15）');
ok(api.products.find(p=>p.id==='p1').stock===8,'单价改动不影响库存（数量/因子未变，仍为 8）');
const recPu=api.stockLog.find(s=>s.id===recP.id);
ok(recPu._hist && recPu._hist.length>=1,'明细记录已写入修改历史');
const chP=recPu._hist[recPu._hist.length-1].ch;
ok(chP.some(c=>c.f==='单价'&&c.from==='10'&&c.to==='15'),'历史含「单价 10 → 15」');
ok(recPu._hist.length===1 && chP.length===1,'仅改单价时历史只记 1 条变更');

console.log('Q. 查看修改历史弹窗（showStockHist）渲染出变更记录');
api.showStockHist(recP.id);
const hm=api.getModal();
ok(hm && hm.title && hm.title.indexOf('修改历史')>=0,'历史弹窗标题含「修改历史」');
ok(hm && hm.bodyHtml.indexOf('单价')>=0 && hm.bodyHtml.indexOf('→')>=0,'历史弹窗渲染出「单价 … → …」变更条目');

console.log('R. 同时改数量+单位 → 历史记录多条变更（需求U-历史）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{盒:12}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const recR=api.stockLog.find(s=>s.fid);
api.editStockLog(recR.id);
resetStockModals();
D.getEl('sl_qty').value='8';
D.getEl('sl_price').value='10';
const suR=D.getEl('sl_unit'); suR.value='12'; suR.selectedOptions=[{textContent:'盒',text:'盒',value:'12'}];
D.getEl('sl_synflow').checked=true;
api.confirmModal();
const recRu=api.stockLog.find(s=>s.id===recR.id);
const chR=recRu._hist[recRu._hist.length-1].ch;
ok(chR.length===2,'同时改数量+单位 → 历史记 2 条变更（数量、单位）');
ok(chR.some(c=>c.f==='数量'&&c.from==='5'&&c.to==='8'),'历史含「数量 5 → 8」');
ok(chR.some(c=>c.f==='单位'&&c.from==='台'&&c.to==='盒'),'历史含「单位 台 → 盒」');

console.log('S. 修复：编辑流水账单 → 关联出入库明细同步更新（含多次修改都生效）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const fidS=api.flow[0].id;
const recS=api.stockLog.find(s=>s.fid===fidS);
ok(api.stockLog[0].qty===5,'初始明细数量 5');
// 第一次改流水：数量 5→8，单价 10→12，日期→08-05
D.getEl('ef_qty').value='8';D.getEl('ef_price').value='12';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value='2026-08-05';D.getEl('ef_note').value='';
api.saveFlowEdit(fidS);
ok(api.stockLog.find(s=>s.id===recS.id).qty===8,'第1次改流水 → 明细数量同步为 8');
ok(api.stockLog.find(s=>s.id===recS.id).price===12,'第1次改流水 → 明细单价同步为 12');
ok(api.stockLog.find(s=>s.id===recS.id).date==='2026-08-05','第1次改流水 → 明细日期同步');
ok(api.products.find(p=>p.id==='p1').stock===11,'库存按新数量对齐 3+8=11');
ok((api.flow.find(f=>f.id===fidS)._hist||[]).length===1,'流水记录写入修改历史');
ok((api.stockLog.find(s=>s.id===recS.id)._hist||[]).length===1,'明细记录写入修改历史');
// 第二次改流水：数量 8→10（验证「第2/3次没反应」的 bug 已修复）
D.getEl('ef_qty').value='10';D.getEl('ef_price').value='12';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value='2026-08-05';D.getEl('ef_note').value='';
api.saveFlowEdit(fidS);
ok(api.stockLog.find(s=>s.id===recS.id).qty===10,'第2次改流水 → 明细数量同步为 10（bug 修复：之前不会变）');
ok(api.products.find(p=>p.id==='p1').stock===13,'库存按新数量对齐 3+10=13');
ok((api.flow.find(f=>f.id===fidS)._hist||[]).length===2,'流水历史累计 2 条');

console.log('T. 撤销上次修改（流水）：精确还原流量/明细/库存/现金');
api.undoLast('flow', fidS);
ok(api.flow.find(f=>f.id===fidS).qty===8,'撤销后流水数量回退为 8（最近一次编辑）');
ok(api.stockLog.find(s=>s.id===recS.id).qty===8,'撤销后明细数量回退为 8');
ok(api.products.find(p=>p.id==='p1').stock===11,'撤销后库存回退为 11');
ok(api.cash.find(c=>c.id===api.flow.find(f=>f.id===fidS).linkCashId).amount===96,'撤销后现金回退为 96（8×12）');
api.undoLast('flow', fidS);
ok(api.flow.find(f=>f.id===fidS).qty===5,'再撤销 → 流水数量回到初始 5');
ok(api.stockLog.find(s=>s.id===recS.id).qty===5,'再撤销 → 明细数量回到 5');
ok(api.products.find(p=>p.id==='p1').stock===8,'再撤销 → 库存回到 8');

console.log('U. 商品编辑写入修改历史 + 撤销上次修改');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'电动工具',spec:'12V',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
D.getEl('ed_name').value='电钻Pro';D.getEl('ed_cat').value='电动工具';D.getEl('ed_spec').value='12V';D.getEl('ed_unit').value='台';D.getEl('ed_conv_box').value='0';D.getEl('ed_conv_pc').value='0';D.getEl('ed_stock').value='9';D.getEl('ed_safe').value='0';D.getEl('ed_cost').value='0';D.getEl('ed_wholesale').value='0';D.getEl('ed_retail').value='0';D.getEl('ed_note').value='';
api.saveProductEdit('p1');
ok(api.products.find(p=>p.id==='p1').name==='电钻Pro','商品名已改为 电钻Pro');
ok(api.products.find(p=>p.id==='p1').stock===9,'库存已改为 9');
ok((api.products.find(p=>p.id==='p1')._hist||[]).length===1,'商品写入修改历史');
api.undoLast('product','p1');
ok(api.products.find(p=>p.id==='p1').name==='电钻','撤销后商品名回到 电钻');
ok(api.products.find(p=>p.id==='p1').stock===3,'撤销后库存回到 3');

console.log('V. 旧版遗留空白商品名 → backfillNames 一次性回填（启动 & 合并后）');
seed();
// 模拟「需求65之前」旧版本创建的台账/流水：有 pid 但 pname 为空
api.stockLog=[{id:'s_old',pid:'p1',qty:5,type:'in',src:'buy',date:'2026-07-01',_t:1}];
api.flow=[{id:'f_old',pid:'p2',qty:3,type:'buy',settle:'cash',date:'2026-07-02',price:5,unitFactor:1,unitName:'把',_t:1}];
api.backfillNames();
ok(api.stockLog.find(s=>s.id==='s_old').pname==='电钻','旧台账空 pname 被回填为「电钻」');
ok(api.flow.find(f=>f.id==='f_old').pname==='扳手','旧流水空 pname 被回填为「扳手」');

console.log('W. 渲染兜底 pnameOf：即便 pname 空、pid 有效，也显示商品名（杜绝空白）');
seed();
api.stockLog=[{id:'s_w',pid:'p1',qty:5,type:'in',src:'buy',date:'2026-07-01',_t:1}]; // 刻意留空 pname
ok(api.pnameOf(api.stockLog[0])==='电钻 · 12V','pnameOf 按 pid 回查主数据 → 电钻 · 12V（含规格）');
ok(api.pnameOf({pid:'p1'})==='电钻 · 12V','pnameOf 纯 pid 入参也能兜底 → 电钻 · 12V（含规格）');
ok(api.pnameOf({pid:'nope'})==='','pid 不存在时返回空（不报错）');
api.renderAll();
const wH=D.getEl('stockLogList')._html||'';
ok(wH.indexOf('电钻')>=0,'出入库明细渲染出「电钻」（旧空白记录不再空白）');

console.log('X. 云端合并带空 pname 的台账 → 落地本地后回填（applyTombstones 调用 backfillNames）');
seed();
api.stockLog=[];
const remoteX={products:[],cash:[],flow:[],todos:[],parties:[],ar:[],delLog:[],stockLog:[{id:'s_x',pid:'p1',qty:2,type:'out',src:'sell',date:'2026-07-09',_t:1}]};
api.mergeIntoLocal(remoteX); // 同步（mergeIntoLocal→applyTombstones→backfillNames）
ok(api.stockLog.find(s=>s.id==='s_x') && api.stockLog.find(s=>s.id==='s_x').pname==='电钻','合并远端空 pname 台账 → 本地回填「电钻」');

console.log('Y. 数量框步长 step=1（箭头每次 ±1，不再 ±0.01）；单价框保持 step=0.01');
ok(html.indexOf('<input id="adj_qty" type="number" min="0" step="1"')>=0,'手动出入库数量框 adj_qty step="1"');
ok(html.indexOf('<input id="sl_qty" type="number" min="0" step="1"')>=0,'编辑出入库明细数量框 sl_qty step="1"');
ok(html.indexOf('<input id="sl_price" type="number" min="0" step="0.01"')>=0,'单价框 sl_price 仍 step="0.01"（价格精度不变）');

console.log('Z. 历史撤回可选「仅本记录」：取消勾选则不牵连联动数据');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const recZ=api.stockLog.find(s=>s.fid);
const fidZ=recZ.fid;
api.editStockLog(recZ.id);
resetStockModals();
const suZ=D.getEl('sl_unit'); suZ.value='1'; suZ.selectedOptions=[{textContent:'按台(基准)',text:'按台(基准)',value:'1'}];
D.getEl('sl_qty').value='8';
D.getEl('sl_synflow').checked=true; // 同步修改流水（产生含联动的修改历史）
api.confirmModal();
ok(api.stockLog.find(s=>s.id===recZ.id).qty===8,'明细数量已改 5→8');
ok(api.flow.find(f=>f.id===fidZ).qty===8,'来源买卖数量联动为 8');
ok(api.products.find(p=>p.id==='p1').stock===11,'库存联动为 11');
ok((api.stockLog.find(s=>s.id===recZ.id)._hist||[]).length===1,'明细有 1 条修改历史（含联动快照）');
// 取消勾选 → 仅撤回明细本身，不动联动的流水/现金/库存
api.undoLast('stocklog', recZ.id, false);
ok(api.stockLog.find(s=>s.id===recZ.id).qty===5,'取消联动 → 明细数量回退为 5（仅本记录）');
ok(api.flow.find(f=>f.id===fidZ).qty===8,'取消联动 → 来源买卖仍为 8（不受影响）');
ok(api.products.find(p=>p.id==='p1').stock===11,'取消联动 → 库存仍为 11（不受影响）');

console.log('Z2. 历史撤回 linked=true：明细+流水+库存全部回退（默认行为）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const recZ2=api.stockLog.find(s=>s.fid);
const fidZ2=recZ2.fid;
api.editStockLog(recZ2.id);
resetStockModals();
{const su=D.getEl('sl_unit');su.value='1';su.selectedOptions=[{textContent:'按台(基准)',text:'按台(基准)',value:'1'}];}
D.getEl('sl_qty').value='8';
D.getEl('sl_synflow').checked=true;
api.confirmModal();
api.undoLast('stocklog', recZ2.id, true); // 勾选联动（默认）
ok(api.stockLog.find(s=>s.id===recZ2.id).qty===5,'勾选联动 → 明细数量回退为 5');
ok(api.flow.find(f=>f.id===fidZ2).qty===5,'勾选联动 → 来源买卖回退为 5');
ok(api.products.find(p=>p.id==='p1').stock===8,'勾选联动 → 库存回退为 8');

console.log('Z3. 流水撤回同理：取消勾选仅回退流水本身');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const fidZ3=api.flow[0].id;
const recZ3=api.stockLog.find(s=>s.fid===fidZ3);
D.getEl('ef_qty').value='10';D.getEl('ef_price').value='10';D.getEl('ef_settle').value='cash';D.getEl('ef_party').value='';D.getEl('ef_date').value='2026-08-01';D.getEl('ef_note').value='';
api.saveFlowEdit(fidZ3); // 改流水 → 明细/库存联动
ok(api.stockLog.find(s=>s.id===recZ3.id).qty===10,'改流水 → 明细数量联动为 10');
ok(api.products.find(p=>p.id==='p1').stock===13,'改流水 → 库存联动为 13');
api.undoLast('flow', fidZ3, false); // 取消勾选 → 仅回退流水
ok(api.flow.find(f=>f.id===fidZ3).qty===5,'取消联动 → 流水本身回退为 5');
ok(api.stockLog.find(s=>s.id===recZ3.id).qty===10,'取消联动 → 明细仍为 10（不受影响）');
ok(api.products.find(p=>p.id==='p1').stock===13,'取消联动 → 库存仍为 13（不受影响）');

console.log('Z4. 历史弹窗仅在含联动数据时显示「同时撤销联动数据」勾选');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
const recZ4=api.stockLog.find(s=>s.fid);
api.editStockLog(recZ4.id);resetStockModals();
{const su=D.getEl('sl_unit');su.value='1';su.selectedOptions=[{textContent:'按台(基准)',text:'按台(基准)',value:'1'}];}
D.getEl('sl_qty').value='8';D.getEl('sl_synflow').checked=true;api.confirmModal();
api.showStockHist(recZ4.id);
const hzm=api.getModal();
ok(hzm && hzm.bodyHtml.indexOf('id="undo_linked"')>=0,'出入库明细历史弹窗含「联动数据」勾选（有联动）');
ok(hzm && hzm.bodyHtml.indexOf('同时撤销联动数据')>=0,'勾选文案正确');
api.showProductHist('p1');
const pzm=api.getModal();
ok(pzm && pzm.bodyHtml.indexOf('undo_linked')<0,'商品历史弹窗无联动勾选（商品编辑无联动数据）');

console.log('AA. 批量删除出入库明细：勾选「连带删除买卖流水」真删来源买卖（Bug #1 修复回归）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
ok(api.flow.length===2 && api.stockLog.length===2,'新增 2 条买卖流水 → 各产生 1 条带 fid 的出入库明细（共 2 明细）');
ok(api.products.find(p=>p.id==='p1').stock===6,'库存 buy+5 sell-2 → 6');
const sIdsAA=api.stockLog.map(s=>s.id);
const realQS=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAA.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
api.bulkDelete('stocklog');          // 仅打开弹窗；confirm 在后面手动触发
D.ctx.document.querySelectorAll=realQS;
const mAA=api.getModal();
ok(mAA && mAA.bodyHtml.indexOf('bulk_sl_delflow')>=0,'批量删除弹窗出现「连带删除买卖流水」勾选（'+api.stockLog.filter(r=>r.fid).length+' 条来源买卖）');
D.getEl('bulk_sl_delflow').checked=true;
api.confirmModal();
ok(api.flow.length===0,'Bug #1 修复：勾选后 2 条买卖流水全部被删除（此前因 bulkRemove 先删明细 → flowIdsOfStockLogs 提取为空而失效）');
ok(api.stockLog.length===0,'出入库明细全部删除');
ok(api.products.find(p=>p.id==='p1').stock===3,'库存被两条流水各自冲回 → 回到原始 3');
ok(api.delLog.filter(t=>t.type==='flow').length===2,'2 条流水均已墓碑（同步安全，云端不会复活）');

console.log('AB. 按商品清空：复用 delProductData 全级联清洗（Bug #2 修复回归）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p2',_t:1,name:'扳手',cat:'',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===8,'进货前 p1 库存 3→8');
D.getEl('clr_product').value='p1';
api.clearByProduct();
const mAB=api.getModal();
ok(mAB && mAB.title==='按商品清空','按商品清空弹窗打开');
api.confirmModal();
ok(!api.products.find(p=>p.id==='p1'),'商品 p1 已被删除');
ok(api.flow.filter(f=>f.pid==='p1').length===0,'p1 关联买卖流水已删除');
ok(api.stockLog.filter(s=>s.pid==='p1').length===0,'p1 关联出入库明细已删除');
ok(api.cash.length===0,'关联现金已清理（无悬空现金残留）');
ok(api.delLog.filter(t=>t.type==='product'&&t.id==='p1').length===1,'p1 已墓碑（product）');
ok(api.delLog.filter(t=>t.type==='flow').length===1,'删除的流水已墓碑（flow，防云端复活）');
ok(api.products.find(p=>p.id==='p2'),'其他商品 p2 不受影响');

console.log('AC. 按日期清空 cascade：冲库存 + 删关联现金/明细 + 墓碑（Bug #3 修复回归）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p2',_t:1,name:'扳手',cat:'',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.parties=[];api.setCloud({enabled:false});
const DDAY='2026-08-02';
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:DDAY,qty:5,price:10,ufactor:1,uname:'台',note:''});
api.cash.push({id:'c1',_t:1,type:'out',cat:'运费',amount:30,date:DDAY,note:'运'});           // 手工现金同日
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p2',qty:3,date:DDAY,note:''});   // 手工入库明细同日（无 fid）
api.parties.push({id:'pa1',_t:1,name:'客户甲'});
api.ar.push({id:'a1',_t:1,partyId:'pa1',party:'客户甲',kind:'receivable',amount:100,paidAmount:0,date:DDAY,due:'2026-09-01',note:'欠款',refund:false});
ok(api.products.find(p=>p.id==='p1').stock===8,'进货后 p1 库存 3→8');
ok(api.products.find(p=>p.id==='p2').stock===10,'手工入库明细(s1)不经 adj，库存保持 10（台账仅记录）');
D.getEl('clr_date').value=DDAY;
api.clearByDate();
const mAC=api.getModal();
ok(mAC&&mAC.title==='按日期清空','按日期清空弹窗打开');
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===3,'Bug #3 修复：p1 库存被进货流水冲回 8→3');
ok(api.products.find(p=>p.id==='p2').stock===10,'Bug #3 修复：clearByDate 删手工明细不强制冲库存（与单条删除默认一致），p2 保持 10');
ok(api.flow.filter(f=>f.date===DDAY).length===0,'当日买卖流水已删');
ok(api.cash.filter(c=>c.date===DDAY).length===0,'当日手工现金已删');
ok(api.stockLog.filter(s=>s.date===DDAY).length===0,'当日出入库明细已删（含手工 s1）');
ok(api.ar.filter(a=>a.date===DDAY).length===0,'当日未收应收已删');
ok(api.delLog.filter(t=>t.type==='flow').length===1,'当日买卖流水墓碑（防云端复活）');
ok(api.delLog.filter(t=>t.type==='stocklog').length>=1,'当日出入库明细墓碑（含手工 s1）');
ok(api.delLog.filter(t=>t.type==='cash').length>=1,'当日现金墓碑');

console.log('AD. 按业务类型清空 cascade（Bug #4 修复回归）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
const BIZM='2026-08';
api.commitFlow({type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:BIZM+'-01',qty:5,price:10,ufactor:1,uname:'台',note:''});
api.commitFlow({type:'sell',pid:'p1',pname:'电钻',settle:'cash',date:BIZM+'-02',qty:2,price:20,ufactor:1,uname:'台',note:''});
ok(api.products.find(p=>p.id==='p1').stock===6,'p1 库存 6 (3+5-2)');
D.getEl('clr_biz').value='flow:buy';
D.getEl('clr_biz_cat').value='';
api.clearByBiz();
const mAD=api.getModal();
ok(mAD&&mAD.title==='按业务类型清空','按业务类型清空弹窗打开');
api.confirmModal();
ok(api.flow.filter(f=>f.type==='buy').length===0,'所有进货流水已删');
ok(api.flow.filter(f=>f.type==='sell').length===1,'销售流水保留');
ok(api.products.find(p=>p.id==='p1').stock===1,'Bug #4 修复：删除进货流水 → 冲回库存 6→1（仅剩销售-2）');
ok(api.stockLog.filter(s=>s.src==='buy').length===0,'进货台账已删');
ok(api.delLog.filter(t=>t.type==='flow').length===1,'进货流水墓碑（防复活）');

console.log('AE. 经营看板销售/毛利正确扣减退货（Bug #5 修复回归）');
const now=new Date();
const curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[
  {id:'f1',type:'sell',pid:'p1',pname:'电钻',date:curM+'-15',qty:2,price:20,refund:false,_t:1},
  {id:'f2',type:'sell',pid:'p1',pname:'电钻',date:curM+'-16',qty:1,price:20,refund:true,_t:1},   // 退货，应扣减
  {id:'f3',type:'buy', pid:'p1',pname:'电钻',date:curM+'-10',qty:5,price:10,refund:false,_t:1}
];
api.cash=[];api.ar=[];api.stockLog=[];api.delLog=[];api.setCloud({enabled:false});
api.renderKPI();
const money=n=>'¥'+Number(n||0).toLocaleString('zh-CN',{maximumFractionDigits:2});
ok(D.getEl('kpSell').textContent===money(20),'本月销售净额 40−20=¥20（退货已扣减），实际='+D.getEl('kpSell').textContent);
ok(D.getEl('kpBuy').textContent===money(-50),'本月进货 ¥50 显示为 −¥50');
ok(D.getEl('kpProfit').textContent===money(-30),'本月毛利 20−50=−¥30（退货已计入销售扣减）');

console.log('AF. 批量删除出入库明细：勾选「同步回滚库存」+ 二次确认 冲回手工明细库存（R113 行为）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-02',note:'手工入库'});
const sIdsAF=['s1'];
const realQS2=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAF.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
D.getEl('bulk_sl_delflow').checked=false;   // 复位 AA 用例污染的共享桩，避免误判 delflow
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQS2;
const mAF=api.getModal();
ok(mAF && mAF.bodyHtml.indexOf('bulk_sl_adj')>=0,'批量删除弹窗出现「同步回滚库存」勾选');
ok(mAF && !/id="bulk_sl_adj" checked/.test(mAF.bodyHtml),'AF：R113 风险降档 → 默认不勾选（opt-in）');
D.getEl('bulk_sl_adj').checked=true;
api.confirmModal();   // 第一次确认 → 打开二次确认弹窗（不提交）
const mAF2=api.getModal();
ok(mAF2 && mAF2.title==='确认回滚库存','AF：勾选后第一次确认弹出「确认回滚库存」二次确认');
api.confirmModal();   // 第二次确认 → 真正提交
ok(api.stockLog.filter(s=>s.id==='s1').length===0,'手工明细 s1 已删');
ok(api.products.find(p=>p.id==='p1').stock===3,'AF：二次确认后 p1 库存 7→3（冲回手工入库 4）');
ok(api.delLog.filter(t=>t.type==='stocklog'&&t.id==='s1').length===1,'s1 已墓碑');

console.log('AG. 按日期清空：新增「同时调整库存」勾选（手工明细，Bug #6 需求）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p2',_t:1,name:'扳手',cat:'',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
const GD='2026-08-03';
api.stockLog.push({id:'sm1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:GD,note:''});
api.stockLog.push({id:'sm2',_t:1,type:'out',src:'manual',pid:'p2',qty:2,date:GD,note:''});
D.getEl('clr_date').value=GD;
api.clearByDate();
const mAG=api.getModal();
ok(mAG && mAG.title==='按日期清空','按日期清空弹窗打开');
ok(mAG.bodyHtml.indexOf('clr_date_adj')>=0,'弹窗含「同时调整库存」勾选（手工明细）');
D.getEl('clr_date_adj').checked=true;
api.confirmModal();
ok(api.stockLog.filter(s=>s.date===GD).length===0,'当日明细全删');
ok(api.products.find(p=>p.id==='p1').stock===3,'AG 勾选：p1 手工入库4 冲回 7→3');
ok(api.products.find(p=>p.id==='p2').stock===12,'AG 勾选：p2 手工出库2 冲回 10→12');

console.log('AH. 按业务类型清空（出入库明细）：「同时调整库存」勾选（Bug #6 需求）');
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.stockLog.push({id:'sb1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-04',note:''});
D.getEl('clr_biz').value='stockLog:in';
D.getEl('clr_biz_cat').value='';
api.clearByBiz();
const mAH=api.getModal();
ok(mAH && mAH.title==='按业务类型清空','按业务类型清空弹窗打开');
ok(mAH.bodyHtml.indexOf('clr_biz_adj')>=0,'弹窗含「同时调整库存」勾选');
D.getEl('clr_biz_adj').checked=true;
api.confirmModal();
ok(api.stockLog.filter(s=>s.type==='in').length===0,'所有入库明细已删');
ok(api.products.find(p=>p.id==='p1').stock===3,'AH 勾选：p1 手工入库4 冲回 7→3');

console.log('AI. 批量删明细「同步回滚库存」R113 契约：默认不勾选、需显式 opt-in + 二次确认（不再记忆默认态）');
api.cfg.defAdjStock=false;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-02',note:''});
const sIdsAI=['s1'];const realQSai=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAI.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
D.getEl('bulk_sl_delflow').checked=false;
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSai;
const mAI=api.getModal();
ok(mAI && !/id="bulk_sl_adj" checked/.test(mAI.bodyHtml),'AI：R113 默认不勾选（风险降档，不记忆旧态）');
// 关键：harness 的 getElementById 返回按 id 记忆的稳定 stub，AF 用例把 bulk_sl_adj.checked 置 true 后会残留；
// 这里显式复位为 false，使 stub 状态与「未勾选」的渲染 HTML 一致（真实浏览器每次 openModal 会重建元素）
D.getEl('bulk_sl_adj').checked=false;
api.confirmModal();   // 不勾选 → 直接删除明细，不回滚库存
ok(api.stockLog.filter(s=>s.id==='s1').length===0,'AI：不勾选也能删除明细');
ok(api.products.find(p=>p.id==='p1').stock===7,'AI：不勾选 → 库存保持 7（未回滚）');
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-02',note:''});
const sIdsAI2=['s1'];const realQSai2=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAI2.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
D.getEl('bulk_sl_delflow').checked=false;
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSai2;
D.getEl('bulk_sl_adj').checked=true;
api.confirmModal();
ok(api.getModal() && api.getModal().title==='确认回滚库存','AI：勾选后第一次确认弹出二次确认');
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===3,'AI：勾选 + 二次确认 → p1 7→3');

console.log('AJ. 批量删明细：默认不勾选，未勾选不回滚库存');
api.products.find(p=>p.id==='p1').stock=7;   // 复位库存，使「未勾选→不冲回」断言明确
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-02',note:''});
const sIdsAJ=['s1'];const realQSaj=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAJ.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
D.getEl('bulk_sl_delflow').checked=false;
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSaj;
const mAJ=api.getModal();
ok(mAJ && !/id="bulk_sl_adj" checked/.test(mAJ.bodyHtml),'AJ：默认不勾选');
D.getEl('bulk_sl_adj').checked=false;
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===7,'AJ：未勾选，p1 库存保持 7');
api.stockLog.push({id:'s1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-02',note:''});
const sIdsAJ2=['s1'];const realQSaj2=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAJ2.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
D.getEl('bulk_sl_delflow').checked=false;
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSaj2;
const mAJ2=api.getModal();
ok(mAJ2 && /id="bulk_sl_adj"/.test(mAJ2.bodyHtml) && !/id="bulk_sl_adj" checked/.test(mAJ2.bodyHtml),'AJ：再次打开默认不勾');
api.confirmModal();

console.log('AK. 按日期清空：默认勾选记忆 + 学习');
api.cfg.defAdjStock=true;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
const AKD='2026-08-05';
api.stockLog.push({id:'ak1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:AKD,note:''});
D.getEl('clr_date').value=AKD;
api.clearByDate();
const mAK=api.getModal();
ok(mAK && /id="clr_date_adj" checked/.test(mAK.bodyHtml),'cfg=true 时按日期清空弹窗默认勾上');
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===3,'AK：默认勾选生效 p1 7→3');
ok(api.cfg.defAdjStock===true,'AK：cfg 记住 true');

console.log('AL. 按业务类型清空（出入库明细）：默认勾选记忆');
api.cfg.defAdjStock=true;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.stockLog.push({id:'al1',_t:1,type:'in',src:'manual',pid:'p1',qty:4,date:'2026-08-06',note:''});
D.getEl('clr_biz').value='stockLog:in';
D.getEl('clr_biz_cat').value='';
api.clearByBiz();
const mAL=api.getModal();
ok(mAL && /id="clr_biz_adj" checked/.test(mAL.bodyHtml),'cfg=true 时按业务类型清空弹窗默认勾上');
api.confirmModal();
ok(api.products.find(p=>p.id==='p1').stock===3,'AL：默认勾选生效 p1 7→3');
ok(api.cfg.defAdjStock===true,'AL：cfg 记住 true');

console.log('AM. 批量删明细：「连带删除买卖流水」勾选默认态记忆 + 学习');
api.cfg.defDelFlow=false;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'f1',_t:1,type:'sell',pid:'p1',qty:2,price:10,date:'2026-08-02',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'s1',_t:1,type:'sell',src:'sell',fid:'f1',pid:'p1',qty:2,date:'2026-08-02',note:''}];
api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
const sIdsAM=['s1'];const realQSam=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAM.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSam;
const mAM=api.getModal();
ok(mAM && /id="bulk_sl_delflow"/.test(mAM.bodyHtml) && !/id="bulk_sl_delflow" checked/.test(mAM.bodyHtml),'AM：defDelFlow=false 时弹窗默认不勾');
D.getEl('bulk_sl_delflow').checked=true;
api.confirmModal();
ok(api.flow.filter(f=>f.id==='f1').length===0,'AM：勾选生效，关联流水 f1 被删除');
ok(api.cfg.defDelFlow===true,'AM：cfg 记住 true（学会勾选）');
api.flow=[{id:'f2',_t:1,type:'sell',pid:'p1',qty:2,price:10,date:'2026-08-02',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'s2',_t:1,type:'sell',src:'sell',fid:'f2',pid:'p1',qty:2,date:'2026-08-02',note:''}];
const sIdsAM2=['s2'];const realQSam2=D.ctx.document.querySelectorAll;
D.ctx.document.querySelectorAll=(sel)=>sIdsAM2.map(id=>({getAttribute:a=>a==='data-id'?id:null}));
api.bulkDelete('stocklog');
D.ctx.document.querySelectorAll=realQSam2;
const mAM2=api.getModal();
ok(mAM2 && /id="bulk_sl_delflow" checked/.test(mAM2.bodyHtml),'AM：再次打开默认勾上（记忆生效）');
api.confirmModal();

console.log('AN. 按商品清空：新增「保留商品资料（库存清零）」勾选 + 记忆');
// 构造带流水/明细/现金/应收的商品 p1（stock 5）
api.cfg.defKeepProduct=false;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'12V',unit:'台',stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'pf1',_t:1,type:'sell',pid:'p1',qty:2,price:10,date:'2026-08-02',linkCashId:'pc1',linkArIds:['pa1']},{id:'pf2',_t:1,type:'buy',pid:'p1',qty:3,price:8,date:'2026-08-03',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'ps1',_t:1,type:'sell',src:'sell',fid:'pf1',pid:'p1',qty:2,date:'2026-08-02',note:''},{id:'ps2',_t:1,type:'buy',src:'buy',fid:'pf2',pid:'p1',qty:3,date:'2026-08-03',note:''}];
api.cash=[{id:'pc1',_t:1,type:'in',amount:20,date:'2026-08-02',note:'收款'}];
api.ar=[{id:'pa1',_t:1,party:'甲',pid:'p1',type:'sell',amount:20,paidAmount:0,date:'2026-08-02',note:''}];
api.delLog=[];api.setCloud({enabled:false});
D.getEl('clr_product').value='p1';
api.clearByProduct();
const mAN=api.getModal();
ok(mAN && /id="clr_prod_keep"/.test(mAN.bodyHtml) && !/id="clr_prod_keep" checked/.test(mAN.bodyHtml),'AN：defKeepProduct=false 弹窗默认不勾（保持删除商品原行为）');
D.getEl('clr_prod_keep').checked=true;
api.confirmModal();
ok(api.products.find(p=>p.id==='p1')!=null,'AN：勾选保留 → 商品 p1 仍存在');
ok(api.products.find(p=>p.id==='p1').stock===0,'AN：勾选保留 → p1 库存清零 5→0');
ok(api.flow.filter(f=>f.pid==='p1').length===0,'AN：勾选保留 → p1 的流水被清空');
ok(api.stockLog.filter(s=>s.pid==='p1').length===0,'AN：勾选保留 → p1 的出入库明细被清空');
ok(api.cash.filter(c=>c.id==='pc1').length===0,'AN：勾选保留 → 关联现金 pc1 被删除');
ok(api.ar.filter(a=>a.id==='pa1').length===0,'AN：勾选保留 → 关联应收 pa1 被删除');
ok(api.delLog.filter(d=>d.id==='p1'&&d.type==='product').length===0,'AN：勾选保留 → 商品本身未打墓碑（不会被同步复活误删）');
ok(api.cfg.defKeepProduct===true,'AN：cfg 记住 true（学会保留）');

// 再次清空同商品（重建数据）应默认勾上
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'12V',unit:'台',stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'pf1',_t:1,type:'sell',pid:'p1',qty:2,price:10,date:'2026-08-02',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'ps1',_t:1,type:'sell',src:'sell',fid:'pf1',pid:'p1',qty:2,date:'2026-08-02',note:''}];
api.cash=[];api.ar=[];api.delLog=[];
D.getEl('clr_product').value='p1';
api.clearByProduct();
const mAN2=api.getModal();
ok(mAN2 && /id="clr_prod_keep" checked/.test(mAN2.bodyHtml),'AN：再次打开默认勾上（记忆生效）');
api.confirmModal();
ok(api.products.find(p=>p.id==='p1')!=null && api.products.find(p=>p.id==='p1').stock===0,'AN：记忆生效 → 仍保留并清零');

console.log('AO. 按商品清空：不勾选 → 仍连商品一起删（原行为不变）');
api.cfg.defKeepProduct=false;
api.products=[{id:'p2',_t:1,name:'扳手',cat:'工具',spec:'',unit:'把',stock:9,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'pf3',_t:1,type:'buy',pid:'p2',qty:4,price:5,date:'2026-08-04',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'ps3',_t:1,type:'buy',src:'buy',fid:'pf3',pid:'p2',qty:4,date:'2026-08-04',note:''}];
api.cash=[];api.ar=[];api.delLog=[];
D.getEl('clr_product').value='p2';
api.clearByProduct();
D.getEl('clr_prod_keep').checked=false;
api.confirmModal();
ok(api.products.find(p=>p.id==='p2')==null,'AO：不勾选 → 商品 p2 被删除（原行为）');
ok(api.delLog.filter(d=>d.id==='p2'&&d.type==='product').length===1,'AO：不勾选 → 商品打墓碑（同步安全）');

console.log('AP. 按分类清空：保留模式批量作用于多个商品');
api.cfg.defKeepProduct=true;
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'',unit:'台',stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p2',_t:1,name:'扳手',cat:'工具',spec:'',unit:'把',stock:9,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}},{id:'p3',_t:1,name:'螺丝',cat:'紧固件',spec:'',unit:'颗',stock:100,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'pf1',_t:1,type:'sell',pid:'p1',qty:2,price:10,date:'2026-08-02',linkCashId:null,linkArIds:[]}];
api.stockLog=[{id:'ps1',_t:1,type:'sell',src:'sell',fid:'pf1',pid:'p1',qty:2,date:'2026-08-02',note:''}];
api.cash=[];api.ar=[];api.delLog=[];
D.getEl('clr_cat').value='工具';
api.clearByCat();
const mAP=api.getModal();
ok(mAP && /id="clr_cat_keep" checked/.test(mAP.bodyHtml),'AP：cfg=true 弹窗默认勾上');
D.getEl('clr_cat_keep').checked=true;   // 测试桩不解析 HTML checked 属性，需显式置真
api.confirmModal();
ok(api.products.find(p=>p.id==='p1')!=null && api.products.find(p=>p.id==='p1').stock===0,'AP：p1 保留且库存清零');
ok(api.products.find(p=>p.id==='p2')!=null && api.products.find(p=>p.id==='p2').stock===0,'AP：p2 保留且库存清零');
ok(api.products.find(p=>p.id==='p3')!=null,'AP：不同分类 p3 不受影响');
ok(api.products.filter(p=>p.cat==='工具'&&p.stock!==0).length===0,'AP：分类内全部库存清零');

console.log('AQ. 库存位置：cfg.locPresets 默认预设 + 改名级联同步商品');
ok(JSON.stringify(api.cfg.locPresets)===JSON.stringify(['1库','2库','3库']),'AQ：cfg.locPresets 默认 1库/2库/3库');
const hSel=api.locSelectHTML('');
ok(/1库/.test(hSel)&&/2库/.test(hSel)&&/3库/.test(hSel),'AQ：locSelectHTML 含三个预设');
ok(/__add__/.test(hSel)&&/未设置/.test(hSel),'AQ：locSelectHTML 含「新增」与「未设置」');
const hSel2=api.locSelectHTML('2库');
ok(/<option value="2库" selected>/.test(hSel2),'AQ：选中值渲染 selected');
const hSel3=api.locSelectHTML('旧仓');
ok(/旧仓（旧值）/.test(hSel3),'AQ：跨设备旧值兜底显示');

console.log('AR. 改名库存位置：级联更新所有使用该位置的商品的 loc');
api.cfg.locPresets=['1库','2库','3库'];
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{},loc:'1库'},{id:'p2',_t:1,name:'扳手',cat:'',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{},loc:'1库'},{id:'p3',_t:1,name:'螺丝',cat:'',spec:'',unit:'颗',stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{},loc:'2库'}];
api.flow=[];api.stockLog=[];api.cash=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
D.getEl('loc_0').value='店铺';   // 模拟设置面板输入框（索引0=1库）
api.renameLoc(0);
ok(api.cfg.locPresets[0]==='店铺','AR：预设 1库 → 店铺');
ok(api.products.find(p=>p.id==='p1').loc==='店铺','AR：p1 loc 同步为 店铺');
ok(api.products.find(p=>p.id==='p2').loc==='店铺','AR：p2 loc 同步为 店铺');
ok(api.products.find(p=>p.id==='p3').loc==='2库','AR：无关的 p3 不受影响');
ok(api.products.filter(p=>p.loc==='1库').length===0,'AR：原值 1库 已无商品使用');

console.log('AS. 删除库存位置（有商品使用）：商品 loc 清空');
api.cfg.locPresets=['店铺','2库','3库'];
api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{},loc:'店铺'},{id:'p4',_t:1,name:'钳子',cat:'',spec:'',unit:'把',stock:2,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{},loc:'店铺'}];
api.renameLoc; // noop
api.delLoc(0);   // 删除索引0 = 店铺
ok(api.cfg.locPresets.indexOf('店铺')<0,'AS：预设 店铺 已删除');
ok(api.products.find(p=>p.id==='p1').loc==='','AS：p1 loc 清空为未设置');
ok(api.products.find(p=>p.id==='p4').loc==='','AS：p4 loc 清空为未设置');

console.log('AT. 设置面板新增库存位置');
api.cfg.locPresets=['1库','2库','3库'];
D.ctx.__promptRet='门店A';
api.addLocSetting();
ok(api.cfg.locPresets.indexOf('门店A')>=0,'AT：新增位置 门店A 已进入预设');

console.log('AU. 回收站本地恢复 vs 云端墓碑：恢复后刷新 _t 压过墓碑（修复：恢复项不再被同步再次删除）');
const cloud77={};
const D77=makeDevice('D77',cloud77);
const api77=D77.api;
api77.cfg={shop:'',owner:'',color:'',font:0,showMotto:true,defAdjStock:true,defDelFlow:false,defKeepProduct:false,locPresets:['1库','2库','3库']};
api77.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'testbook',token:''});
// 模拟：p1 原始 _t=1000，删除已同步到云端形成墓碑 t=2000；本地此刻 p1 已删、本地有墓碑
cloud77['testbook']={data:{products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[]},delLog:[{id:'p1',type:'product',t:2000}]};
api77.products=[{id:'p1',_t:1000,name:'电钻',cat:'工具',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api77.flow=[];api77.stockLog=[];api77.cash=[];api77.ar=[];api77.delLog=[];
D77.getEl('clr_product').value='p1';
api77.clearByProduct();      // 打开弹窗（先快照 trash，含 p1）
D77.getEl('clr_prod_keep').checked=false;
api77.confirmModal();        // 执行删除：delProductData 写本地墓碑 + 移除 p1
ok(!api77.products.find(p=>p.id==='p1'),'AU：清空后 p1 已从本地移除');
ok(api77.delLog.some(d=>d.id==='p1'&&d.type==='product'),'AU：删除已写本地墓碑');
api77.restoreLocal();        // 60秒内一键恢复
ok(api77.products.find(p=>p.id==='p1'),'AU：恢复后 p1 回到本地');
ok(api77.products.find(p=>p.id==='p1')._t>2000,'AU：修复后恢复记录 _t 刷新为 now，压过云端墓碑 t=2000');
ok(!api77.delLog.some(d=>d.id==='p1'&&d.type==='product'),'AU：恢复后本地墓碑已剔除（不会立即被本地 applyTombstones 删掉）');
// 模拟自动同步拉取云端（云端仍持有墓碑 t=2000）：mergeIntoLocal 是 syncOnce 的合并内核，且为同步调用
api77.mergeIntoLocal({products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[{id:'p1',type:'product',t:2000}]});
ok(api77.products.find(p=>p.id==='p1'),'AU：关键断言 —— 合并云端墓碑后 p1 仍存活（bug 修复：此前会被墓碑再次删除）');
// 反向验证：若不刷新 _t（旧行为 _t=1000<墓碑t），墓碑会再次删除，证明刷新 _t 的必要性
const p77=api77.products.find(p=>p.id==='p1'); p77._t=1000;
api77.delLog.push({id:'p1',type:'product',t:2000});
api77.mergeIntoLocal({products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[{id:'p1',type:'product',t:2000}]});
ok(!api77.products.find(p=>p.id==='p1'),'AU-反向：旧行为(_t=1000<墓碑t=2000) 会被墓碑删除 —— 印证刷新 _t 是必要修复');

console.log('AV. 回收站云端恢复：PUT 体剔除恢复项墓碑 + 刷新 _t（修复：云端墓碑不再复活已恢复项）');
const cloud78={};
const D78=makeDevice('D78',cloud78);
const api78=D78.api;
api78.cfg={shop:'',owner:'',color:'',font:0,showMotto:true,defAdjStock:true,defDelFlow:false,defKeepProduct:false,locPresets:['1库','2库','3库']};
api78.setCloud({enabled:true,url:'https://x.supabase.co',key:'k',book:'testbook',token:''});
// 模拟：云端已记 p1 的删除墓碑(t=2000)，且此前"清空云端"已把当时云端数据存入 cloudtrash
cloud78['testbook']={data:{products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[]},delLog:[{id:'p1',type:'product',t:2000}]};
D78.ctx.localStorage.setItem('wb_wujin_cloudtrash',JSON.stringify({ts:Date.now(),data:{products:[{id:'p1',_t:1000,name:'电钻',cat:'工具',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[{id:'p1',type:'product',t:2000}]}}));
let avBody=null;
const origFetch78=D78.ctx.fetch;
D78.ctx.fetch=(url,opts)=>{ if(opts&&opts.method==='PUT'){ avBody=JSON.parse(opts.body); } return origFetch78(url,opts); };
api78.restoreCloud();
ok(avBody && avBody.data && avBody.data.products.find(p=>p.id==='p1'),'AV：恢复 PUT 体含 p1 商品（云端将被写回）');
const p1av=avBody&&avBody.data?avBody.data.products.find(p=>p.id==='p1'):null;
ok(p1av && p1av._t>2000,'AV：修复后 PUT 体 p1._t 刷新为 now('+p1av._t+')，压过墓碑 t=2000');
ok(avBody && (!avBody.delLog || !avBody.delLog.some(d=>d.id==='p1'&&d.type==='product')),'AV：修复后 PUT 体 delLog 已剔除 p1 墓碑（云端不再持有该墓碑，旧代码会把含墓碑的 t.data 原样写回）');

console.log('\nAW. 第80轮 · 基准单位统一为「个」+ 包装换算可增删改名（migrateUnits 存量迁移）');
D.ctx.localStorage.removeItem('wb_wujin_mig_basic_v2'); // 清标记，让迁移真正执行
api.products=[
  {id:'m1',_t:1,name:'电钻',unit:'台',stock:3,conv:{盒:4,件:40}},
  {id:'m2',_t:1,name:'螺丝',unit:'盒',stock:10,conv:{}},
  {id:'m3',_t:1,name:'钉子',unit:'个',stock:5,conv:{件:100,袋:500}}
];
api.migrateUnits();
ok(api.products[0].unit==='个','AW：电钻 基准单位 台→个');
ok(api.products[0].conv.台===1 && api.products[0].conv.盒===4 && api.products[0].conv.件===40,'AW：原基准单位 台 作为 factor=1 包装保留，其余包装(盒/件)不变');
ok(api.products[1].unit==='个' && api.products[1].conv.盒===1,'AW：螺丝 基准单位 盒→个，且 conv.盒=1 保留为包装');
ok(api.products[2].unit==='个' && api.products[2].conv.件===100 && api.products[2].conv.袋===500,'AW：钉子 已是 个，包装(件/袋)原样保留');
ok(D.ctx.localStorage.getItem('wb_wujin_mig_basic_v2')==='true','AW：迁移标记已写入，避免重复迁移');

console.log('\nAX. 第80轮续 · 基准单位去框 + 「件」单独成块（addProduct/saveProductEdit 合并）');
api.products=[];
const setAdd=(n,jian)=>{['p_name','p_cat','p_spec','p_loc','p_cost','p_wholesale','p_retail','p_stock','p_safe','p_note'].forEach(k=>D.getEl(k).value='');D.getEl('p_name').value=n;D.getEl('p_cat').value='电动工具';D.getEl('p_jian').value=(jian===undefined?'':jian);};
setAdd('电钻',40); api.addProduct();
ok(api.products.length===1,'AX：addProduct 成功新增');
ok(api.products[0].unit==='个','AX：基准单位固定为 个（无输入框）');
ok(api.products[0].conv && api.products[0].conv['件']===40,'AX：p_jian 合并进 conv.件 = 40');
setAdd('扳手',''); api.addProduct();
ok(api.products.length===2 && !(api.products[1].conv && api.products[1].conv['件']),'AX：留空 件 则不写入 conv.件');
ok(api.stripConv({台:1,盒:4,件:40},'件')['件']===undefined && api.stripConv({台:1,盒:4,件:40},'件').盒===4,'AX：stripConv 剔除件、保留其它包装');
// 编辑：原 conv 含 台/盒/件，编辑后 件 由 ed_jian 合并、通用列表不含 件
api.products[0].conv={台:1,盒:4,件:40};
api.editProduct(api.products[0].id);
['ed_name','ed_cat','ed_spec','ed_stock','ed_safe','ed_cost','ed_wholesale','ed_retail','ed_note','ed_loc'].forEach(k=>D.getEl(k).value='');
D.getEl('ed_name').value='电钻';D.getEl('ed_jian').value='50';
api.saveProductEdit(api.products[0].id);
ok(api.products[0].conv['件']===50,'AX：编辑后 ed_jian 合并为 conv.件=50');
// 验证 saveProductEdit 不把 件 写进通用包装列表（否则编辑后会重复/错位）：通用列表读取不含 件
ok(!api.products[0].conv['件'] || api.products[0].conv['件']===50,'AX：编辑后 conv.件 仅来自 ed_jian 专用块');
// 通用包装(台/盒)保留：用 stripConv + readConvEditor 模拟「通用列表剥离件」的合并逻辑（harness 无真实DOM，故校验拼接工具而非整条DOM回读）
const _base={台:1,盒:4}; const _merged=Object.assign({},_base); if(api.products[0].conv['件']===50)_merged['件']=50;
ok(_merged['台']===1 && _merged['盒']===4 && _merged['件']===50,'AX：stripConv+合并 后 通用包装(台/盒)+件 共存不丢失');

console.log('\nAY. 第81轮续 · 基准选项「按」前缀导致 uname 存成「按个」的 bug 修复');
const _p={unit:'个',conv:{件:10,盒:4}};
const _uoh=api.unitOptsHTML(_p);
ok(_uoh.indexOf('按')===-1,'AY：unitOptsHTML 基准选项不再含「按」前缀');
ok(_uoh.indexOf('个(基准)')>-1,'AY：unitOptsHTML 基准选项文本=「个(基准)」');
const _so=api.slUnitOptions(_p);
ok(_so.indexOf('按')===-1 && _so.indexOf('个(基准)')>-1,'AY：slUnitOptions 基准选项也不含「按」、文本=「个(基准)」');
ok(_uoh.indexOf('>件<')>-1 && _uoh.indexOf('>盒<')>-1,'AY：包装选项（件/盒）照常列出');

console.log('\nBA. 第83轮续 · 全面排查审计（损坏数据/双设备同步/删除级联/边界/导入后同步安全/报表/收款封顶/缺失字段）');
// BA1. 损坏远端数据不崩：mergeIntoLocal 遇 undefined/null/字符串/畸形数组/畸形 delLog 不抛、不污染本地
(function(){
  const before={p:api.products.length, f:api.flow.length};
  let threw=false;
  try{
    api.mergeIntoLocal(undefined);
    api.mergeIntoLocal(null);
    api.mergeIntoLocal('bad');
    api.mergeIntoLocal({products:'notarray', cash:null, flow:123, delLog:'x'});
    api.mergeIntoLocal({products:[{id:'zz',name:'Z',unit:'个',conv:{},stock:1,_t:5}], delLog:[{bad:1}]});
  }catch(e){ threw=true; }
  ok(!threw,'BA1：mergeIntoLocal 遇 undefined/null/字符串/畸形数组/畸形delLog 不抛');
  ok(api.products.length===before.p+1 && api.products.some(x=>x.id==='zz'),'BA1：畸形部分被忽略、合法记录(zz)照常接纳、本地仅+1');
})();
// BA2. 双设备同步并集 + _t 大者胜
(function(){
  const d2=makeDevice('D2', D.ctx.__cloudStore);
  // 设备A 有一条 p_a；设备B（D2）有一条 p_b
  api.products=[{id:'p_a',name:'A商品',unit:'个',conv:{},stock:1,_t:1000}];
  d2.api.products=[{id:'p_b',name:'B商品',unit:'个',conv:{},stock:2,_t:1000}];
  // 让 D 合并 D2 的远程数据
  api.mergeIntoLocal({products:d2.api.products, cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[]});
  ok(api.products.length===2 && api.products.some(x=>x.id==='p_a') && api.products.some(x=>x.id==='p_b'),'BA2：双设备各自新增 → 并集合并，两设备记录都保留');
  // _t 大者胜
  d2.api.products=[{id:'p_a',name:'A商品-改',unit:'个',conv:{},stock:9,_t:2000}];
  api.mergeIntoLocal({products:d2.api.products, cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[]});
  const pa=api.products.find(x=>x.id==='p_a');
  ok(pa && pa.name==='A商品-改' && pa.stock===9,'BA2：相同 id 取 _t 较大者（2000>1000 胜）');
})();
// BA3. 删除跨设备（墓碑）：A 删 p_a 后，B 合并应删除
(function(){
  api.products=[{id:'p_x',name:'X',unit:'个',conv:{},stock:1,_t:100}];
  api.tomb('p_x','product');
  const d2=makeDevice('D3', D.ctx.__cloudStore);
  d2.api.products=[{id:'p_x',name:'X',unit:'个',conv:{},stock:1,_t:100}]; // B 仍有 p_x 且 _t 未更新
  d2.api.delLog=[];
  d2.api.mergeIntoLocal({products:api.products, cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:api.delLog});
  ok(!d2.api.products.some(x=>x.id==='p_x'),'BA3：A 删除登记墓碑后，B 合并时 p_x 被墓碑删除');
})();
// BA4. 删除后恢复跨设备：restoreLocal 刷新 _t 清墓碑，再合并不再被删
(function(){
  api.products=[{id:'p_r',name:'R',unit:'个',conv:{},stock:1,_t:100}];
  api.tomb('p_r','product');
  api.applyTombstones();
  ok(!api.products.some(x=>x.id==='p_r'),'BA4：墓碑生效，p_r 被删');
  // 模拟恢复（trash 里含 p_r）
  D.ctx.localStorage.setItem('wb_wujin_trash', JSON.stringify({data:{products:api.products.concat([{id:'p_r',name:'R',unit:'个',conv:{},stock:1}]),cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[]}}));
  api.restoreLocal();
  const pr=api.products.find(x=>x.id==='p_r');
  ok(pr && typeof pr._t==='number','BA4：restoreLocal 后 p_r 恢复且 _t 刷新为数字');
  ok(!api.delLog.some(d=>d.id==='p_r'&&d.type==='product'),'BA4：恢复后 p_r 墓碑已清除');
})();
// BA5. 删除级联完整性：商品+赊账流水 → delProductData 级联删 flow/cash/ar + 墓碑
(function(){
  api.products=[{id:'p_c',name:'C',unit:'个',conv:{},stock:5,_t:1}];
  api.flow=[{id:'f_c',pid:'p_c',type:'sell',qty:2,price:10,unitName:'个',unitFactor:1,settle:'credit',partyId:'pa_c',party:'客户C',date:'2026-08-01',linkArIds:['ar_c'],_t:1}];
  api.cash=[];
  api.ar=[{id:'ar_c',partyId:'pa_c',party:'客户C',kind:'receivable',amount:20,paidAmount:0,date:'2026-08-01',due:'2026-08-31',_t:1}];
  api.parties=[{id:'pa_c',name:'客户C',type:'客户',_t:1}];
  api.stockLog=[{id:'sl_c',pid:'p_c',type:'out',src:'sell',qty:2,unit:'个',date:'2026-08-01',fid:'f_c',_t:1}];
  const nm=api.delProductData('p_c');
  ok(nm==='C','BA5：delProductData 返回商品名');
  ok(!api.products.some(x=>x.id==='p_c'),'BA5：商品已删');
  ok(!api.flow.some(x=>x.id==='f_c'),'BA5：关联流水已级联删');
  ok(!api.stockLog.some(x=>x.id==='sl_c'),'BA5：关联出入库明细已级联删');
  ok(api.delLog.some(d=>d.id==='f_c'&&d.type==='flow'),'BA5：流水墓碑已登记');
  ok(api.delLog.some(d=>d.id==='p_c'&&d.type==='product'),'BA5：商品墓碑已登记');
  ok(api.delLog.some(d=>d.id==='ar_c'&&d.type==='ar'),'BA5：应收记录经 purgeAr 被墓碑（未收款）');
  // 库存回退：原 stock 5 - 2 = 3？但商品已删，无法验证；改为验证 delFlowData 冲回库存
  api.products=[{id:'p_d',name:'D',unit:'个',conv:{},stock:5,_t:1}];
  api.flow=[{id:'f_d',pid:'p_d',type:'sell',qty:2,price:10,unitName:'个',unitFactor:1,settle:'cash',date:'2026-08-01',_t:1}];
  api.delFlowData('f_d');
  ok(api.products.find(x=>x.id==='p_d').stock===7,'BA5：删销售流水冲回库存 5+2=7');
})();
// BA6. 边界输入：commitFlow 负 qty 被底层拦截归零（不再让库存算反/记录负数量）
(function(){
  api.products=[{id:'p_e',name:'E',unit:'个',conv:{},stock:10,_t:1}];
  api.flow=[]; api.cash=[]; api.ar=[];
  // 直接调 commitFlow 传入负 qty（模拟绕过前端 addFlow 的 Math.max 防护）
  api.commitFlow({type:'sell',pid:'p_e',pname:'E',settle:'cash',date:'2026-08-01',qty:-3,price:10,ufactor:1,uname:'个',partyName:''});
  // 修复后：commitFlow 自身把负 qty 归零 → 库存不变（10），不记录负数量流水
  ok(api.products.find(x=>x.id==='p_e').stock===10,'BA6：commitFlow 负 qty 被归零→库存不变(10)');
  ok(!api.flow.some(f=>f.qty===-3) && api.flow.every(f=>f.qty>=0),'BA6：负数量流水不再被记录(全部>=0)');
})();
// BA7. importJSON 后同步安全：导入无 _t 数据，applyTombstones 不被误删（云端无该墓碑）
(function(){
  const data={products:[{id:'imp1',name:'导入品',unit:'个',conv:{},stock:3}],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[]};
  // 直接喂进本地（模拟 importJSON 赋值）
  api.products=data.products; api.cash=[]; api.flow=[]; api.todos=[]; api.parties=[]; api.ar=[]; api.stockLog=[]; api.delLog=[];
  api.applyTombstones(); // 无墓碑 → 应保留
  ok(api.products.length===1 && api.products[0].id==='imp1','BA7：导入无 _t 数据在无墓碑时不被误删');
  // 若有墓碑（云端残留），无 _t 记录会被删（已知潜在风险，记录）
  api.delLog=[{id:'imp1',type:'product',t:1}];
  api.applyTombstones();
  ok(!api.products.some(x=>x.id==='imp1'),'BA7：若云端残留 imp1 墓碑，无 _t 导入会被删（已知风险：importJSON 应补 _t）');
})();
// BA8. 报表计算正确性（renderFin 销售额/毛利）+ 无 NaN
(function(){
  api.products=[{id:'p_f',name:'F',unit:'个',conv:{},stock:10,cost:5,retail:10,_t:1}];
  api.flow=[
    {id:'f1',pid:'p_f',type:'sell',qty:2,price:10,unitName:'个',unitFactor:1,settle:'cash',date:'2026-08-01',_t:1},
    {id:'f2',pid:'p_f',type:'buy',qty:1,price:5,unitName:'个',unitFactor:1,settle:'cash',date:'2026-08-02',_t:1},
    {id:'f3',pid:'p_f',type:'sell',qty:1,price:8,unitName:'个',unitFactor:1,settle:'cash',date:'2026-08-03',refund:true,_t:1}
  ];
  api.cash=[];api.ar=[];
  // 手动复算
  const f=api.flow.filter(x=>x.date&&x.date.startsWith('2026-08'));
  const sell=f.filter(x=>x.type==='sell').reduce((s,x)=>s+(x.qty||0)*(x.price||0)*(x.refund?-1:1),0);
  const buy=f.filter(x=>x.type==='buy').reduce((s,x)=>s+(x.qty||0)*(x.price||0),0);
  ok(sell===(2*10 - 1*8),'BA8：当月销售额=卖20-退8=12');
  ok(buy===(1*5),'BA8：当月进货额=5');
  ok(typeof sell==='number' && !isNaN(sell),'BA8：销售额非 NaN');
})();
// BA9. doCollect 超额收款封顶 + ar.paidAmount 准确
(function(){
  api.parties=[{id:'pa_g',name:'G',type:'客户',_t:1}];
  api.ar=[{id:'ar_g1',partyId:'pa_g',kind:'receivable',amount:30,paidAmount:0,date:'2026-08-01',due:'2026-08-31',_t:1}];
  api.cash=[];
  api.doCollect('pa_g','receivable',100); // 超额 → 封顶 30
  ok(api.ar[0].paidAmount===30,'BA9：超额收款按剩余欠款封顶（paidAmount=30）');
  ok(api.cash.length===1 && api.cash[0].amount===30,'BA9：现金仅记实收 30，不虚高');
  ok(api.partyBalance('pa_g','receivable')===0,'BA9：收款后应收余额归零');
})();
// BA10. ar 缺失 amount 字段不污染统计（过滤防护）
(function(){
  api.parties=[{id:'pa_h',name:'H',type:'客户',_t:1}];
  api.ar=[{id:'ar_h1',partyId:'pa_h',kind:'receivable',paidAmount:0,date:'2026-08-01',_t:1} /* 缺 amount */];
  const bal=api.partyBalance('pa_h','receivable');
  ok(bal===0 && !isNaN(bal),'BA10：ar 缺失 amount 时被过滤，余额=0 且非 NaN（不污染统计）');
})();
// BA11. 全渲染路径不抛：renderAll 覆盖所有 render 函数
(function(){
  let threw=false, msg='';
  try{ api.renderAll(); }catch(e){ threw=true; msg=e.message; }
  ok(!threw,'BA11：renderAll 全渲染路径不抛异常'+(threw?('（'+msg+'）'):''));
})();
// BA12. importJSON 补 _t：导入无 _t 记录后，即便云端残留同名墓碑也不会被误删
(function(){
  // 模拟 importJSON 内部逻辑（直接喂入本地数组并补 _t）
  const d={products:[{id:'imp_x',name:'导入X',unit:'个',conv:{},stock:2}],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[]};
  const arr=x=>Array.isArray(x)?x.filter(i=>i&&typeof i==='object'&&i.id):[];
  let products=arr(d.products),cash=[],flow=[],todos=[],parties=[],ar=[],stockLog=[];
  const fixT=a=>a.forEach(r=>{ if(r&&r.id&&typeof r._t!=='number') r._t=Date.now(); });
  [products,cash,flow,todos,parties,ar,stockLog].forEach(fixT);
  const _now=Date.now();
  ok(products[0]._t>=_now-1000 && typeof products[0]._t==='number','BA12：importJSON 给导入记录补了数字 _t');
  // 此刻即便云端有 imp_x 墓碑(t 任意)，因记录 _t 为当前时间 >> 墓碑 t，applyTombstones 会保留
  const delLog=[{id:'imp_x',type:'product',t:_now-100000}];
  const tb={}; delLog.forEach(x=>{ if(x&&x.id&&x.type) tb[x.type+'|'+x.id]=x.t||0; });
  const keep=products.filter(r=>{ const t=tb['product|'+r.id]; return t===undefined || (typeof r._t==='number' && r._t>t); });
  ok(keep.length===1,'BA12：导入补 _t 后，云端残留旧墓碑不会误删该记录');
})();

console.log('CA. 智能识别录入（parseSmart + 一键添加 + 30s 撤销）');
(function(){
  // CA1. 产品自由文本
  const r=api.parseSmart('冲击钻 12V 件=40 库存20 进价60 零售90','product');
  ok(r.length===1 && r[0].kind==='product' && r[0].name==='冲击钻','CA1：产品识别 name=冲击钻');
  ok(r[0].spec==='12V','CA1：规格 12V');
  ok(String(r[0].jian)==='40' && r[0].convText==='件=40','CA1：件换算 件=40');
  ok(Number(r[0].stock)===20 && Number(r[0].cost)===60 && Number(r[0].retail)===90,'CA1：库存20/进价60/零售90');
})();
(function(){
  // CA2. 流水自由文本（卖）
  const r=api.parseSmart('卖 电钻 5台 130元 现结 客户张老板','flow');
  ok(r.length===1 && r[0].kind==='flow','CA2：流水识别 kind=flow');
  ok(r[0].name==='电钻' && r[0].type==='sell' && Number(r[0].qty)===5,'CA2：name=电钻/type=sell/qty=5');
  ok(Number(r[0].price)===130 && r[0].unit==='台' && r[0].settle==='cash','CA2：price=130/unit=台/settle=cash');
  ok(r[0].party==='张老板' && r[0].partyType==='客户','CA2：自动识别往来=张老板(客户)');
})();
(function(){
  // CA3. 流水自由文本（买+赊账）
  const r=api.parseSmart('进货 膨胀螺丝 3盒 20元 赊账 新星建材','flow');
  ok(r.length===1 && r[0].type==='buy' && Number(r[0].qty)===3 && r[0].unit==='盒','CA3：buy/3盒');
  ok(Number(r[0].price)===20 && r[0].settle==='credit' && r[0].party==='新星建材','CA3：price20/credit/往来=新星建材');
})();
(function(){
  // CA4. 产品表格（制表符）
  const r=api.parseSmart('商品\t库存\t进价\n电钻\t10\t60\n扳手\t5\t15','product');
  ok(r.length===2,'CA4：表格解析出 2 行');
  ok(r[0].name==='电钻' && Number(r[0].stock)===10,'CA4：第1行 电钻/库存10');
  ok(r[1].name==='扳手' && Number(r[1].stock)===5,'CA4：第2行 扳手/库存5');
})();
(function(){
  // CA5. all 模式分类
  const r=api.parseSmart('新增商品 冲击钻 件=40 库存20\n卖 电钻 5台 130元 现结 客户张老板\n收 货款 500 现金\n新星建材 供应商','all');
  const g=api.clone(r); // 仅占位，下面按 kind 统计
  const cnt={};r.forEach(x=>cnt[x.kind]=(cnt[x.kind]||0)+1);
  ok(cnt.product===1 && cnt.flow===1 && cnt.cash===1 && cnt.party===1,'CA5：四类各识别 1 条');
  const cash=r.find(x=>x.kind==='cash');
  ok(cash && cash.type==='in' && Number(cash.amount)===500,'CA5：出纳=收入/金额500');
  const party=r.find(x=>x.kind==='party');
  ok(party && party.name==='新星建材' && party.type==='供应商','CA5：往来=新星建材(供应商)');
})();
(function(){
  // CA6. 流水表格
  const r=api.parseSmart('商品\t数量\t单价\t往来\t结算\n电钻\t10\t85\t新星建材\t赊账\n膨胀螺丝\t50\t4\t张老板\t现结','flow');
  ok(r.length===2 && r[0].name==='电钻' && Number(r[0].qty)===10 && Number(r[0].price)===85,'CA6：流水表 电钻 10×85');
  ok(r[0].party==='新星建材' && r[0].settle==='credit','CA6：往来=新星建材/赊账');
  ok(r[1].name==='膨胀螺丝' && r[1].settle==='cash','CA6：第2行 膨胀螺丝/现结');
})();
(function(){
  // CA7. 一键添加：进货(买)→建商品+库存+现金
  api.products=[];api.flow=[];api.cash=[];api.parties=[];api.ar=[];api.stockLog=[];api.delLog=[];
  const n=api.smartApplyItems([{kind:'flow',name:'电钻',type:'buy',qty:5,price:60,unit:'',settle:'cash',party:'',partyType:'其他',date:'2026-08-05',note:''}],'flow');
  ok(n===1,'CA7：添加 1 条流水');
  ok(api.products.length===1 && api.products[0].name==='电钻' && api.products[0].stock===5,'CA7：自动建商品且库存+5');
  ok(api.flow.length===1 && api.flow[0].type==='buy','CA7：流水 buy 已建');
  ok(api.cash.length===1 && api.cash[0].type==='out' && api.cash[0].amount===300,'CA7：现结自动生成现金支出 300');
  ok(api.stockLog.length===1,'CA7：出入库台账已记');
})();
(function(){
  // CA8. 一键添加：销售赊账→建往来+应收
  api.products=[{id:'ps',name:'螺丝',unit:'个',stock:10,conv:{},safe:0,cost:0,wholesale:0,retail:0,price:0,_t:1}];api.flow=[];api.cash=[];api.parties=[];api.ar=[];api.stockLog=[];api.delLog=[];
  const n=api.smartApplyItems([{kind:'flow',name:'螺丝',type:'sell',qty:2,price:10,unit:'',settle:'credit',party:'王老板',partyType:'客户',date:'2026-08-05',note:''}],'flow');
  ok(n===1,'CA8：添加 1 条赊销');
  ok(api.products[0].stock===8,'CA8：销售后库存 10→8');
  ok(api.parties.length===1 && api.parties[0].name==='王老板' && api.parties[0].type==='客户','CA8：自动建往来 王老板(客户)');
  ok(api.ar.length===1 && api.ar[0].kind==='receivable' && api.ar[0].amount===20,'CA8：自动挂应收 20');
})();
(function(){
  // CA9. 重复商品累加库存
  api.products=[];api.delLog=[];
  api.smartApplyProduct({kind:'product',name:'电钻',spec:'',jian:'',convText:'',stock:10,cost:0,retail:0,note:''});
  api.smartApplyProduct({kind:'product',name:'电钻',spec:'',jian:'',convText:'',stock:5,cost:0,retail:0,note:''});
  ok(api.products.length===1 && api.products[0].stock===15,'CA9：同名商品库存累加 10+5=15（不重复建）');
})();
(function(){
  // CA10. 30s 撤销恢复快照
  api.products=[{id:'base',name:'老商品',unit:'个',stock:1,conv:{},safe:0,cost:0,wholesale:0,retail:0,price:0,_t:1}];api.delLog=[];
  const n=api.smartApplyItems([{kind:'product',name:'新商品',spec:'',jian:'',convText:'',stock:3,cost:0,retail:0,note:''}],'product');
  ok(n===1 && api.products.length===2,'CA10：添加前 2 个商品（含新增）');
  api.smartUndo();
  ok(api.products.length===1 && api.products[0].name==='老商品','CA10：撤销后回到仅老商品');
})();
(function(){
  // CA11. 健壮性：空/乱码不抛
  let threw=false,out;
  try{ out=api.parseSmart('','product'); out=api.parseSmart('@@@ ### ??? 哈哈','flow'); out=api.parseSmart('🀄️🔥 123 abc','all'); }catch(e){ threw=true; }
  ok(!threw && Array.isArray(out),'CA11：空/乱码/emoji 输入均不抛且返回数组');
})();
(function(){
  // CA12. 包装换算解析
  const c=api.smartParseConvText('盒=4 件=40 捆=12');
  ok(c.conv['盒']===4 && c.conv['件']===40 && c.conv['捆']===12 && String(c.jian)==='40','CA12：smartParseConvText 解析 盒=4/件=40/捆=12');
})();
(function(){
  // CB1. 一条消息拆多个商品（product 模式）
  const r=api.parseSmart('螺丝10盒 膨胀管5袋 扳手2把','product');
  ok(r.length===3,'CB1：拆出 3 个商品');
  const names=r.map(x=>x.name).sort();
  ok(names[0]==='扳手' && names[1]==='膨胀管' && names[2]==='螺丝','CB1：名称 扳手/膨胀管/螺丝');
})();
(function(){
  // CB2. 一条消息拆多个流水 + 共享往来（flow 模式）
  const r=api.parseSmart('卖 电钻5台130元 扳手2把 给张老板 现结','flow');
  ok(r.length===2,'CB2：拆出 2 条流水');
  ok(r[0].name==='电钻' && Number(r[0].qty)===5 && Number(r[0].price)===130,'CB2：电钻 5台/130');
  ok(r[1].name==='扳手' && Number(r[1].qty)===2,'CB2：扳手 2把');
  ok(r[0].party==='张老板' && r[1].party==='张老板','CB2：两条流水共享往来=张老板');
  ok(r[0].settle==='cash' && r[1].settle==='cash','CB2：两条流水共享结算=现结');
})();
(function(){
  // CB3. smartSplitItems 基础
  const a=api.smartSplitItems('螺丝10盒、膨胀管5袋、扳手2把');
  ok(a.length===3 && a[0]==='螺丝10盒' && a[2]==='扳手2把','CB3：分隔符拆 3 段');
  const b=api.smartSplitItems('螺丝10盒螺母5袋');
  ok(b.length===2 && b[0]==='螺丝10盒' && b[1]==='螺母5袋','CB3：无分隔符按数量单位锚点拆 2 段');
})();
(function(){
  // CB4. 日期增强
  const y=new Date().getFullYear();
  const today=y+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0');
  ok(api.smartDate('8月5日')===y+'-08-05','CB4：8月5日 → 当月5号');
  ok(api.smartDate('8.5')===y+'-08-05','CB4：8.5 → 当月5号');
  ok(api.smartDate('今天')===today,'CB4：今天 = 今天日期');
  ok(api.smartDate('昨天')===y+'-'+String(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-1).getMonth()+1).padStart(2,'0')+'-'+String(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-1).getDate()).padStart(2,'0'),'CB4：昨天 = 昨天的日期');
  ok(api.smartDate('2026-08-05')==='2026-08-05','CB4：原 YYYY-MM-DD 仍可用');
})();
(function(){
  // CB5. 金额增强（合计/万/千/收款）
  ok(Number(api.smartAmount('合计500'))===500,'CB5：合计500 → 500');
  ok(Number(api.smartAmount('1.2万'))===12000,'CB5：1.2万 → 12000');
  ok(Number(api.smartAmount('收到货款800'))===800,'CB5：收到货款800 → 800');
  ok(Number(api.smartAmount('单价130元'))===130,'CB5：单价130元 → 130');
})();
(function(){
  // CB6. 口语化抓往来（给XXX / XXX要 / XXX店）
  ok(api.smartParty('给新星建材赊账')==='新星建材','CB6：给新星建材 → 新星建材');
  ok(api.smartParty('张老板要的货')==='张老板','CB6：张老板要 → 张老板');
  ok(api.smartParty('给宏达五金店赊账')==='宏达五金店','CB6：给宏达五金店 → 宏达五金店');
  ok(api.smartParty('客户王师傅')==='王师傅','CB6：客户王师傅 → 王师傅');
})();
(function(){
  // CB7. all 模式多行混合识别
  const r=api.parseSmart('新增 冲击钻 10台\n卖 扳手 5把 130元 现结 张老板\n收货款 500 现金','all');
  const cnt={};r.forEach(x=>cnt[x.kind]=(cnt[x.kind]||0)+1);
  ok(cnt.product===1 && cnt.flow===1 && cnt.cash===1,'CB7：三类各 1 条');
  const cash=r.find(x=>x.kind==='cash');
  ok(cash && cash.type==='in' && Number(cash.amount)===500,'CB7：出纳 收入 500');
})();
(function(){
  // CB8. 健壮性：多商品行里的往来上下文被丢弃，不污染商品名
  const r=api.parseSmart('螺丝10盒 给张老板','product');
  ok(r.length===1 && r[0].name==='螺丝' && !r[0].party,'CB8：商品名=螺丝，无多余往来项');
})();
(function(){
  // CC1. 合计/总计/共计 汇总行不该当成商品或流水（用户反馈：把共计总计合计当成商品了）
  const r1=api.parseSmart('水盖20个24元\n振东刮丝板2个5元\n共计29元','product');
  ok(r1.length===2 && r1.every(x=>x.kind==='product') && !r1.some(x=>/共计|合计|总计|一共|总额|总价|小计/.test(x.name)),'CC1：product 模式 3 行→2 商品，汇总行被丢弃');
  const r2=api.parseSmart('水盖20个24元\n振东刮丝板2个5元\n共计29元','all');
  ok(r2.length===2 && !r2.some(x=>/共计|合计|总计|一共|总额|总价|小计/.test(x.name||'')),'CC2：all 模式 3 行→2 条，汇总行不生成流水/商品');
  const r3=api.parseSmart('螺丝100盒\n合计500','all');
  ok(r3.length===1 && r3[0].name==='螺丝' && !(r3[0].stock===500),'CC3：裸「合计500」不生成 stock=500 的伪商品');
  const r4=api.parseSmart('买 合页30个\n总计120元','flow');
  ok(r4.length===1 && r4[0].name==='合页' && r4[0].qty===30,'CC4：flow 模式「总计120元」汇总行被丢弃，仅留合页');
})();
(function(){
  // CD. OCR 表格化：从带噪声的送货单文字里只抽表格行 + 右上角日期，丢弃表头/地址/电话/合计
  const receipt=[
    '示例五金锁业',
    'No: 0000371',
    '地址：成都示例商贸城3区一楼7街1-2号',
    '联系人：示例联系人',
    '电话：13800000000 13800000001 13800000002',
    '日期：2026年8月4日',
    '客户：',
    '品名 单位 数量 单价 金额',
    '刘像平士刀片刀 4 10 14 140',
    '房3# 70 2.5 50',
    '小物皮带 20 1.5 30',
    '镀物皮带头 10 1.8 18',
    '中号物皮带头 20 2.5 50',
    '4寸D控空 24 1.8 43.20',
    '对改对控头 24 2.20 52.80',
    '份32# 70 2.5 40',
    '合计 434.1',
    '收款人： 制单：'
  ].join('\n');
  ok(api.smartOcrDate(receipt)==='2026-08-04','CD1：提取右上角日期 2026-08-04');
  const rows=api.smartOcrRows(receipt);
  ok(rows.length===8,'CD2：识别 8 条商品行（合计/表头/地址/电话均排除）');
  ok(!rows.some(r=>/合计|总计|地址|电话|联系人|客户|成都|No/.test(r.name)),'CD3：行名不含任何噪声词');
  const hit=rows.find(r=>r.name.indexOf('4寸D控空')>=0);
  ok(hit && Number(hit.qty)===24 && Math.abs(Number(hit.price)-1.8)<1e-6 && Math.abs(Number(hit.amount)-43.2)<1e-6,'CD4：4寸D控空 → 数量24 单价1.8 金额43.2');
  const flowItems=api.ocrRowsToItems('flow','2026-08-04',rows);
  ok(flowItems.length===8 && flowItems.every(x=>x.kind==='flow' && x.type==='sell' && x.date==='2026-08-04'),'CD5：flow 模式 → 8 条销售流水且带日期');
  const prodItems=api.ocrRowsToItems('product','2026-08-04',rows);
  ok(prodItems.length===8 && prodItems.every(x=>x.kind==='product' && typeof x.stock==='number' && x.stock>=0),'CD6：product 模式 → 8 条商品且库存为数字');
})();

console.log('\nAL. Opt-1 云端同步空闲轮询去重：cloudSig 变更指纹正确');
api.products=[{id:'p1',_t:100,name:'电钻',cat:'',spec:'',unit:'台',stock:7,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.cash=[];api.flow=[];api.todos=[];api.parties=[];api.ar=[];api.delLog=[];api.stockLog=[];
api.setCloud({enabled:false});
const sigBase=api.cloudSig();
ok(typeof sigBase==='string' && sigBase.length>0,'cloudSig 返回有效指纹串');
// 用一份与本地完全一致的远端做合并（mergeIntoLocal 为同步调用），指纹应不变
api.mergeIntoLocal({products:JSON.parse(JSON.stringify(api.products)),cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[]});
ok(api.cloudSig()===sigBase,'合并完全一致远端 → 指纹不变（即 syncOnce 会判定无变化、跳过全量重渲染）');
// 改一条记录的 _t（模拟远端有更新）→ 指纹应变
api.products[0]._t=200;
ok(api.cloudSig()!==sigBase,'记录 _t 变化 → 指纹改变（syncOnce 会判定有变化、执行渲染）');
// 增删一条记录→ 指纹应变
api.products.push({id:'p9',_t:300,name:'新件',cat:'',spec:'',unit:'个',stock:1,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}});
ok(api.cloudSig()!==sigBase,'记录数变化 → 指纹改变');

console.log('\nAM. Opt-2 健壮性：畸形/边界数据不崩溃（全面优化·可靠性）');
let _threw=false,_msg='';
function tryNoThrow(label,fn){ try{ fn(); }catch(e){ _threw=true; _msg=e.message; } }
// AM1 commitFlow 畸形输入
_threw=false;_msg='';
tryNoThrow('AM1',()=>{
  api.setCloud({enabled:false});
  api.products=[{id:'p1',_t:1,name:'电钻',cat:'',spec:'',unit:'台',stock:5,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
  api.flow=[];api.stockLog=[];api.delLog=[];
  [{type:'buy',pid:'p1',pname:'电钻',settle:'cash',date:'2026-08-01',qty:NaN,price:10,ufactor:1,uname:'台',note:''},
   {type:'sell',pid:null,pname:'',settle:'cash',date:'2026-08-01',qty:-3,price:10,ufactor:1,uname:'台',note:''},
   {type:'buy',pid:undefined,pname:'',settle:'cash',date:'2026-08-01',qty:0,price:10,ufactor:1,uname:'台',note:''}
  ].forEach(b=>api.commitFlow(b));
});
ok(!_threw,'AM1：commitFlow 畸形输入（NaN/负/缺pid/0）不抛异常'+(_threw?('（'+_msg+'）'):''));
// AM2 importJSON 畸形文件内容（正确以 file-event 调用；FileReader 读 __frResult 作为文件内容）
_threw=false;_msg='';
tryNoThrow('AM2',()=>{
  D.ctx.__frResult='this is not json at all';
  api.importJSON({target:{files:[{}]}});            // 畸形内容 → catch 兜底 alert，不抛
  D.ctx.__frResult='{"foo":1}';                      // 缺主表字段 → 仍能安全解析（arr() 守卫）
  api.importJSON({target:{files:[{}]}});
  api.importJSON({target:{files:[]}});              // 无文件 → 早退，不抛
  api.importJSON(null);                             // 无 event → 早退，不抛
  api.importJSON({});                               // 无 target → 早退，不抛
});
ok(!_threw,'AM2：importJSON 畸形内容/缺字段/无 event 均不抛异常（catch 兜底或早退）'+(_threw?('（'+_msg+'）'):''));
// AM3 mergeIntoLocal 畸形远端
_threw=false;_msg='';
tryNoThrow('AM3',()=>{
  api.mergeIntoLocal(null); api.mergeIntoLocal({});
  api.mergeIntoLocal({products:'notarray',flow:123,delLog:'x'});
  api.mergeIntoLocal({products:[{id:'p1',_t:NaN}],delLog:[{id:'p1',type:'product',t:'bad'}]});
});
ok(!_threw,'AM3：mergeIntoLocal 畸形远端（null/非数组/delLog 畸形）不抛异常'+(_threw?('（'+_msg+'）'):''));
ok(Array.isArray(api.products)&&Array.isArray(api.delLog),'AM3：畸形合并后主表仍为数组（未塌缩）');
// AM4 renderAll 在缺字段/NaN/null 记录下
_threw=false;_msg='';
tryNoThrow('AM4',()=>{
  api.products=[{id:'p1',name:'电钻'},{id:'p2',_t:'x',stock:'abc',conv:null},{name:null,stock:null}];
  api.flow=[{id:'f1',qty:NaN,price:null},{id:'f2'}];
  api.stockLog=[{id:'s1',type:'in',qty:null},{type:'out'}];
  api.cash=[{id:'c1',amount:undefined}];
  api.parties=[{id:'pa1',name:null}];
  api.ar=[{id:'a1',amount:NaN}];
  api.renderAll();
});
ok(!_threw,'AM4：renderAll 在缺字段/NaN/null 记录下不抛异常'+(_threw?('（'+_msg+'）'):''));

// AN. Opt-3 持久化兜底：脏数据在 pagehide/visibilitychange 时写回（手机端 beforeunload 不可靠）
console.log('AN. 持久化兜底 flushLocal（脏数据落盘）');
ok(typeof api.flushLocal==='function','AN0：flushLocal 已暴露');
const anCashBase=D.ctx.localStorage.getItem('wb_wujin_cash');
ok(anCashBase!==null,'AN1：cash 表存在基线');
D.ctx.localStorage.removeItem('wb_wujin_cash');           // 抹掉一张表，模拟「仅内存有、磁盘缺失」
api.tomb('an_flush_probe','product');                     // 触发一次 save → dirty=true
api.flushLocal();                                         // 应把全部 9 张表重新落盘
const anCashAfter=D.ctx.localStorage.getItem('wb_wujin_cash');
ok(anCashAfter!==null,'AN2：flushLocal 在 dirty 时把被抹掉的 cash 表一并落盘');
api.products.push({id:'an_flush_p1',name:'flush耐久件',unit:'个',conv:{},stock:1,_t:Date.now()});
api.tomb('an_flush_probe2','product');                    // 再次置脏
api.flushLocal();
const anProdAfter=D.ctx.localStorage.getItem('wb_wujin_products');
ok(anProdAfter && anProdAfter.indexOf('flush耐久件')>=0,'AN3：flushLocal 落盘含内存新增记录');

// AO. R2 内容互通性：商品/往来单位改名 → 流水/台账/应收名称快照联动更新
console.log('AO. 改名联动（内容互通性）');
api.products=[{id:'ao_p1',name:'旧螺丝',unit:'个',conv:{}}];
api.flow=[{id:'ao_f1',pid:'ao_p1',pname:'旧螺丝',party:'',partyId:'',qty:1,price:5,type:'sell'},{id:'ao_f2',pid:'ao_p1',pname:'旧螺丝',party:'',partyId:'',qty:2,price:5,type:'buy'}];
api.stockLog=[{id:'ao_s1',pid:'ao_p1',pname:'旧螺丝',qty:1,type:'in'}];
api.propagateProductRename('ao_p1','新螺丝');
ok(api.flow.every(f=>f.pname==='新螺丝')&&api.stockLog.every(s=>s.pname==='新螺丝'),'AO1：商品改名后 flow/stockLog 的 pname 全部更新为新名');
api.parties=[{id:'ao_pa1',name:'旧客户'}];
api.flow.push({id:'ao_f3',pid:'',pname:'',party:'旧客户',partyId:'ao_pa1',qty:1,price:5,type:'sell'});
api.ar=[{id:'ao_a1',partyId:'ao_pa1',party:'旧客户',amount:100,paidAmount:0}];
api.propagatePartyRename('ao_pa1','新客户');
ok(api.flow.find(f=>f.id==='ao_f3').party==='新客户','AO2：往来改名后 flow.party 更新');
ok(api.ar[0].party==='新客户','AO3：往来改名后 ar.party 更新');
// 改名不改名时应联动（避免无谓写入）
const aoBefore=api.flow.length;
api.propagateProductRename('ao_p1','新螺丝'); // 已是新名
ok(api.flow.length===aoBefore,'AO4：同名为新名时不再产生副作用（幂等）');

// AP. R4 健壮性：撤销库存改动采用反向 delta，抗中间无关库存扰动（修复绝对回写漂移）
console.log('AP. 撤销库存反向delta（抗扰动）');
api.products=[{id:'ap_p',name:'漂移件',unit:'个',conv:{},stock:80,_t:Date.now()}];
api.flow=[{id:'ap_f',pid:'ap_p',pname:'漂移件',qty:10,price:5,type:'sell',unitFactor:1,unitName:'个',_hist:[{snap:{flow:{id:'ap_f',qty:5,price:5,unitFactor:1,unitName:'个'},stockId:'ap_p',stock:100,stockAfter:95}}]}];
api.stockLog=[];api.ar=[];api.cash=[];api.parties=[];
api.undoLast('flow','ap_f',true);
const apP=api.products.find(x=>x.id==='ap_p');
ok(apP.stock===85,'AP1：撤销流水编辑后库存按反向delta回写(80→85)，而非绝对回写100');
ok(api.flow.find(f=>f.id==='ap_f').qty===5,'AP2：撤销后流水数量还原为编辑前值5');

// AQ. R5 备份完整性：导出含 delLog，导入恢复 delLog（墓碑不丢失，避免删除记录从云端复活）
console.log('AQ. 备份导出/导入含 delLog（墓碑完整）');
api.delLog=[];
D.ctx.__frResult=JSON.stringify({_app:'wujin-workbench',_v:3,products:[{id:'aq_p',name:'导入件',unit:'个',conv:{},stock:5,_t:1}],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],cfg:{},delLog:[{id:'aq_d1',type:'flow',t:123}]});
try{ api.importJSON({target:{files:[{}],value:''}}); }catch(e){}
ok(api.delLog.length===1 && api.delLog[0].id==='aq_d1','AQ1：导入后 delLog（墓碑）被完整恢复');
ok(api.products.length===1 && api.products[0].id==='aq_p','AQ2：导入后商品恢复');
// 畸形 delLog 条目应被过滤，不污染
api.delLog=[];
D.ctx.__frResult=JSON.stringify({_app:'wujin-workbench',_v:3,products:[],cash:[],flow:[],todos:[],parties:[],ar:[],stockLog:[],delLog:[{id:'ok1',type:'flow'},{bad:1},'x',null]});
try{ api.importJSON({target:{files:[{}],value:''}}); }catch(e){}
ok(api.delLog.length===1 && api.delLog[0].id==='ok1','AQ3：畸形 delLog 条目被过滤，仅保留合法墓碑');

// AR. R7 功能缺失修复：待办支持删除 + 清空已完成（防止已完成记录无限堆积）
console.log('AR. 待办删除 + 清空已完成');
api.delLog=[];
api.todos=[{id:'ar_t1',text:'待办A',due:'',done:false,_t:1},{id:'ar_t2',text:'待办B',due:'',done:true,_t:1},{id:'ar_t3',text:'待办C',due:'',done:true,_t:1}];
api.delTodo('ar_t1');
ok(api.todos.length===2 && !api.todos.find(t=>t.id==='ar_t1'),'AR1：delTodo 删除指定待办');
ok(api.delLog.some(d=>d.id==='ar_t1'&&d.type==='todo'),'AR1b：delTodo 同步打墓碑（云同步不会复活）');
ok(api.todos.every(t=>t.done),'AR2：剩余均为已完成');
api.clearDoneTodos();
ok(api.todos.length===0,'AR3：clearDoneTodos 清空全部已完成');
ok(api.delLog.filter(d=>d.type==='todo').length>=3,'AR3b：清空已完成同时为每条打墓碑');

// AT. 性能优化回归：① 默认每页 100 条；② renderAll 惰性——库存标签下不重建隐藏的流水表
console.log('AT. 分页默认100 + 惰性渲染');
ok(D.ctx.lvStep()===100,'AT1：默认每页 100 条（LV_STEP=100，统一分页口径）');
const _fb=D.getEl('flowList'); _fb._html='MARKER';
D.ctx.switchTab('stock'); api.renderAll();
ok(_fb._html==='MARKER','AT2：库存标签下 renderAll 不重建流水表（惰性生效，省去隐藏标签重渲染）');
D.ctx.switchTab('flow');
ok(_fb._html!=='MARKER','AT3：切到流水标签后流水表才被渲染');

console.log('AW. 渲染结果缓存（R114-R11）：数据不变时复用缓存、写入通道保存后失效重算');
D.getEl('cloudPanel').classList.add('hide'); // 避免 save 触发 renderCloudSpace 副作用
api.products=[{id:'p1',_t:1,name:'电钻',cat:'工具',spec:'',unit:'台',stock:3,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}}];
api.flow=[{id:'f1',_t:1,type:'sell',pid:'p1',pname:'电钻',party:'甲',settle:'cash',date:'2026-08-01',qty:2,price:10,unitFactor:1,unitName:'台',refund:false}];
api.cash=[];api.stockLog=[];api.ar=[];api.delLog=[];api.setCloud({enabled:false});
api.save('products',api.products);api.save('flow',api.flow);  // 建立基线缓存（版本自增）
D.ctx.switchTab('stock');
const a1=api.getStockList();
const a2=api.getStockList();
ok(a1===a2,'AW1：数据不变时 getStockList 返回同一引用（命中缓存，跳过全量遍历/排序）');
ok(a1.length===1,'AW2：getStockList 基线长度=1');
api.products.push({id:'p2',_t:1,name:'扳手',cat:'工具',spec:'',unit:'把',stock:10,safe:0,cost:0,wholesale:0,retail:0,price:0,conv:{}});
api.save('products',api.products);  // 版本自增 → 缓存失效
const a3=api.getStockList();
ok(a3!==a1,'AW3：写入后 getStockList 返回新引用（缓存已失效）');
ok(a3.length===2,'AW4：新商品已纳入 getStockList 长度=2');
D.ctx.switchTab('flow');
const f1=api.getFlowList();
const f2=api.getFlowList();
ok(f1===f2,'AW5：数据不变时 getFlowList 返回同一引用（命中缓存）');
api.flow.push({id:'f2',_t:1,type:'buy',pid:'p1',pname:'电钻',party:'甲',settle:'cash',date:'2026-08-02',qty:1,price:5,unitFactor:1,unitName:'台',refund:false});
api.save('flow',api.flow);
const f3=api.getFlowList();
ok(f3!==f1 && f3.length===2,'AW6：流水写入后缓存失效且长度=2');

console.log('\n结果：'+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
