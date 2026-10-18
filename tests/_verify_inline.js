// 专项：内联事件属性拼接插值未走 jsStr()（v1.15.14 只扫了 ${} 模板形态，漏了全部 '+x+' 拼接形态）
// 背景：v1.15.14 立规「内联事件属性里的 id/参数必须走 jsStr()」并配了静态哨兵，但哨兵正则只匹配
// onXxx="fn('${...}") 模板形态；源码里大量 onXxx="fn(''+x+'')" 拼接形态从未清扫。
// 这些 x 多为记录 id——而 parseImportData 的 arr() 明确「导入备份的 id 不做字符过滤」，
// 于是一份带引号 id 的备份即可在 stockLog/party/对账单/历史抽屉等处 break out 成 XSS。
// 本族实际含四种形态 + 两个连带家族：
//   ① 拼接形态 onclick="fn(''+x+'')"            → jsStr()
//   ② 模板形态 onclick="fn('${x}')"（含多参第二位）→ jsStr()
//   ③ 处理器字符串构造 fn:`doneTodo('${x.id}')` 再整体嵌入 onclick="${it.fn}" → 构造处 jsStr()
//   ④ JSON.stringify 入属性 oninput="fn("+JSON.stringify(id)+")"——双引号撑破双引号属性，
//      对任何 id 都令处理器变语法错误（功能缺陷，不止 XSS）
//   ⑤ 非事件属性（option value / 元素 id / class / style）裸插值 → esc()
//   ⑥ 备份族：saveBackupTarget 编辑态失效静默落空 + 换类型 stale 字段残留 + runAllBackups 不重渲染
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
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,
    alert:(m)=>{ctx.__lastAlert=m;},confirm:(m)=>{ctx.__lastConfirm=m;return ctx.__confirmRet!==false;},__confirmRet:true,
    URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,TextDecoder,Blob,btoa,atob,escape,unescape,
    CompressionStream, DecompressionStream,
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
  get _bkEditing(){return _bkEditing}, set _bkEditing(v){_bkEditing=v},
  get _bkLastRun(){return _bkLastRun}, set _bkLastRun(v){_bkLastRun=v},
  renderStockLog, renderParty, renderFlowTpls, renderBackupTargets, showStatement, histFoot,
  renderToday, doSearch, editStockLog, fillFlowProducts, productOptionsHTML, fillParty, fillClearSelects,
  editFlow, slUnitOptions, showRestockDraft,
  saveBackupTarget, runOneBackup, runAllBackups, autoCloudBackup, pushToTarget, pushSupabase,
  getBackups, saveBackups, bkStatusText, bkTypeLabel, bkEsc, delBackup, toggleBackup, editBackup,
  renderAll, saveAllLocal, save
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  return ctx;
}

const D=makeDevice('inline');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const $=id=>D.document.getElementById(id);

/* 恶意 id/电话：单引号 break out + 伪注释，模拟「导入一份带引号 id 的备份」 */
const EVIL="x';alert(1);//";
const jsStrEq=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n');
const escEq=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const EVIL_JS=jsStrEq(EVIL), EVIL_HTML=escEq(EVIL);
// 断言某函数调用的实参已被 jsStr 化：原样 breakout 不出现、转义形态出现
function chkArg(container,fn,m){
  const raw=fn+"('"+EVIL+"')", safe=fn+"('"+EVIL_JS+"')";
  ok(container.indexOf(raw)<0 && container.indexOf(safe)>=0, m+'（breakout 已消除、jsStr 形态在位）');
}
// 断言 HTML 属性插值已 esc 化
function chkAttr(container,attr,m){
  ok(container.indexOf(attr+'="'+EVIL+'"')<0 && container.indexOf(attr+'="'+EVIL_HTML+'"')>=0, m+'（属性 breakout 已消除、esc 形态在位）');
}

function seedBase(){
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:8,price:10,cat:'A',spec:'',safe:0,_t:1}];
  api.cash=[];api.flow=[];api.ar=[];api.todos=[];api.delLog=[];
}

(async function main(){

console.log('内联事件拼接插值 jsStr 化 + 备份族专项（第 25 轮）\n');

/* ============ A. XSS 探针：导入带引号 id 的备份 ============ */
console.log('A. XSS 探针（导入带引号 id 的备份）');

// A1 出入库台账：editStockLog / showStockHist / delStockLog + data-id
{
  seedBase();
  api.stockLog=[{id:EVIL,type:'in',qty:3,unit:'个',date:'2026-10-01',_t:1,pid:'p1',pname:'电钻',src:'manual'}];
  api.renderStockLog();
  const h=$('stockLogList').innerHTML;
  chkArg(h,'editStockLog','A1a 台账「编辑」按钮 id 已转义');
  chkArg(h,'showStockHist','A1b 台账「历史」按钮 id 已转义');
  chkArg(h,'delStockLog','A1c 台账「删除」按钮 id 已转义');
  chkAttr(h,'data-id','A1d 台账复选框 data-id 已走 esc()（HTML 属性上下文）');
}

// A2 往来单位：delParty / collect×2 / copyPhone
{
  seedBase();
  api.ar=[{id:'ar1',kind:'receivable',partyId:EVIL,party:'坏客户',amount:100,paidAmount:0,due:'2026-10-01',_t:1},
          {id:'ar2',kind:'payable',partyId:EVIL,party:'坏客户',amount:50,paidAmount:0,due:'2026-10-01',_t:1}];
  api.parties=[{id:EVIL,name:'坏客户',type:'customer',phone:EVIL,contact:'',addr:'',_t:1}];
  api.renderParty();
  const h=$('partyList').innerHTML;
  chkArg(h,'delParty','A2a 往来「删除」按钮 id 已转义（历史缺陷：整行是模板字面量，按钮从未触发）');
  ok(h.indexOf("collect('"+EVIL+"'")<0 && h.indexOf("collect('"+EVIL_JS+"'")>=0,
     'A2b 往来「收款/付款」按钮 id 已转义（双参调用，校验到首个实参边界）');
  chkArg(h,'copyPhone','A2c 往来「复制电话」按钮电话已转义（esc 在 JS 串上下文不够）');
}

// A3 整单模板：loadFlowTpl / delFlowTpl
{
  seedBase();
  api.save('flowTpl',[{id:EVIL,name:'模板甲',lines:[{name:'电钻',qty:1,price:10}]}]);
  api.renderFlowTpls();
  const h=$('flowTplChips').innerHTML;
  chkArg(h,'loadFlowTpl','A3a 模板「载入」按钮 id 已转义');
  chkArg(h,'delFlowTpl','A3b 模板「删除」按钮 id 已转义');
}

// A4 备份位置：runOneBackup / editBackup / delBackup / toggleBackup
{
  seedBase();
  api.save('backups',[{id:EVIL,type:'webdav',name:'坏目标',enabled:true,url:'https://dav.x/f.json',user:'u',pass:'p',lastBackup:0,lastOk:null,lastMsg:''}]);
  api.renderBackupTargets();
  const h=$('backupTargets').innerHTML;
  chkArg(h,'runOneBackup','A4a 备份「立即备份」按钮 id 已转义');
  chkArg(h,'editBackup','A4b 备份「编辑」按钮 id 已转义');
  chkArg(h,'delBackup','A4c 备份「删除」按钮 id 已转义');
  chkArg(h,'toggleBackup','A4d 备份「启用」复选框 id 已转义');
}

// A5 对账单：exportStatementCSV / copyStatementText
{
  seedBase();
  api.parties=[{id:EVIL,name:'坏客户',type:'customer',phone:'',contact:'',addr:'',_t:1}];
  api.showStatement(EVIL);
  const h=D.__modal&&D.__modal.bodyHtml||'';
  chkArg(h,'exportStatementCSV','A5a 对账单「导出 CSV」按钮 id 已转义');
  chkArg(h,'copyStatementText','A5b 对账单「复制文本」按钮 id 已转义');
}

// A6 历史抽屉：histFoot 的 undoLast
{
  seedBase();
  api.stockLog=[{id:'sl1',type:'in',qty:1,unit:'个',date:'2026-10-01',_t:1,pid:'p1',pname:'电钻',src:'manual'}];
  const h=api.histFoot('stocklog',EVIL);
  ok(h.indexOf("undoLast('stocklog','"+EVIL+"',")<0 && h.indexOf("undoLast('stocklog','"+EVIL_JS+"',")>=0,
     'A6 历史抽屉「撤销」按钮 id 已转义（breakout 已消除）');
}

// A7 全局搜索跳转：searchJump 四类（模板形态、第二参数位）
{
  seedBase();
  api.products=[{id:EVIL,name:'电钻',unit:'个',conv:{},stock:100,cost:8,price:10,cat:'A',spec:'',safe:0,_t:1}];
  api.parties=[{id:EVIL,name:'电钻客户',type:'customer',phone:'',contact:'',addr:'',_t:1}];
  api.flow=[{id:EVIL,type:'sell',pid:EVIL,pname:'电钻',partyId:EVIL,party:'电钻客户',qty:1,price:10,settle:'cash',date:'2026-10-01',_t:1}];
  api.cash=[{id:EVIL,type:'in',cat:'销售电钻',amount:10,date:'2026-10-01',note:'',_t:1}];
  $('sr_q').value='电钻';
  api.doSearch();
  const h=$('sr_res').innerHTML;
  ok(h.indexOf("searchJump('stock','"+EVIL+"')")<0 && h.indexOf("searchJump('stock','"+EVIL_JS+"')")>=0,'A7a 搜索「库存」跳转 id 已转义');
  ok(h.indexOf("searchJump('party','"+EVIL+"')")<0 && h.indexOf("searchJump('party','"+EVIL_JS+"')")>=0,'A7b 搜索「往来」跳转 id 已转义');
  ok(h.indexOf("searchJump('flow','"+EVIL+"')")<0 && h.indexOf("searchJump('flow','"+EVIL_JS+"')")>=0,'A7c 搜索「买卖」跳转 id 已转义');
  ok(h.indexOf("searchJump('cash','"+EVIL+"')")<0 && h.indexOf("searchJump('cash','"+EVIL_JS+"')")>=0,'A7d 搜索「流水」跳转 id 已转义');
}

// A8 今日要处理：doneTodo/delTodo（处理器字符串构造处插值，再整体嵌入 onclick）
{
  seedBase();
  api.todos=[{id:EVIL,text:'测试待办',done:false,due:'2026-10-15'}];
  api.renderToday();
  const h=$('todayList').innerHTML;
  ok(h.indexOf("doneTodo('"+EVIL+"')")<0 && h.indexOf("doneTodo('"+EVIL_JS+"')")>=0,'A8a 「完成」按钮 id 已转义');
  ok(h.indexOf("delTodo('"+EVIL+"')")<0 && h.indexOf("delTodo('"+EVIL_JS+"')")>=0,'A8b 「删除」按钮 id 已转义');
}

// A9 台账编辑抽屉：slEditPrev 实参（历史缺陷：JSON.stringify 双引号撑破双引号属性，任何 id 都令处理器变语法错误）
{
  seedBase();
  api.stockLog=[{id:EVIL,type:'in',qty:3,unit:'个',date:'2026-10-01',_t:1,pid:'p1',pname:'电钻',src:'manual'}];
  api.editStockLog(EVIL);
  const h=D.__modal&&D.__modal.bodyHtml||'';
  ok(h.indexOf('slEditPrev("')<0 && h.indexOf("slEditPrev('"+EVIL_JS+"')")>=0,
     'A9a 编辑抽屉 oninput/onchange 的 slEditPrev 实参已 jsStr 化（不得再出现 JSON.stringify 双引号形态）');
}

// A10 非事件属性：option value / 元素 id / 类型文本
{
  seedBase();
  api.products=[{id:EVIL,name:'电钻',unit:'个',conv:{},stock:1,cost:8,price:10,cat:'A',spec:'',safe:10,_t:1}];
  api.parties=[{id:EVIL,name:'坏客户',type:EVIL,phone:'',contact:'',addr:'',_t:1}];
  const poh=api.productOptionsHTML();
  chkAttr(poh,'value','A10a 商品下拉 option value 已 esc 化');
  api.fillParty($('f_party'));
  const ph=$('f_party').innerHTML;
  chkAttr(ph,'value','A10b 往来下拉 option value 已 esc 化');
  ok(ph.indexOf('（'+EVIL+'）')<0 && ph.indexOf('（'+EVIL_HTML+'）')>=0,'A10c 往来下拉「类型」文本已 esc 化');
  api.fillClearSelects();
  chkAttr($('clr_product').innerHTML,'value','A10d 清空筛选商品下拉 option value 已 esc 化');
  api.flow=[{id:'fl1',type:'sell',pid:EVIL,pname:'电钻',partyId:EVIL,party:'坏客户',qty:1,price:10,settle:'cash',date:'2026-10-01',_t:1}];
  api.editFlow('fl1');
  chkAttr(D.__modal&&D.__modal.bodyHtml||'','value','A10e 编辑买卖往来下拉 option value 已 esc 化');
  api.showRestockDraft();
  const rh=D.__modal&&D.__modal.bodyHtml||'';
  ok(rh.indexOf('id="rs_'+EVIL+'_q"')<0 && rh.indexOf('id="rs_'+EVIL_HTML+'_q"')>=0,'A10f 进货草稿输入框元素 id 已 esc 化');
  const uh=api.slUnitOptions({id:EVIL,unit:'个',conv:{[EVIL]:12}},'个',1);
  ok(uh.indexOf('value="'+EVIL+'"')<0 && uh.indexOf('value="12"')>=0,'A10g 单位下拉 value 恒为数值系数（标签走 esc，无字符串注入面）');
}

/* ============ B. 备份族 ============ */
console.log('\nB. 备份族');

// B1 编辑态失效（目标已被删）→ 不得抛错、不得静默丢失、必须明确提示并清理失效编辑态
{
  seedBase();
  api.save('backups',[]);
  api._bkEditing='bk_gone';
  $('bkType').value='supabase'; $('bkName').value='测试';
  $('bk_url').value='https://x.supabase.co'; $('bk_key').value='k'; $('bk_book').value='b';
  D.__lastAlert='';
  let threw=null;
  try{ api.saveBackupTarget(); }catch(e){ threw=e; }
  ok(!threw,'B1a 编辑态目标已不存在时保存不抛错');
  ok(api.getBackups().length===0,'B1b 且不写入任何数据');
  ok(/不存在/.test(D.__lastAlert||''),'B1c 且明确提示「已不存在、本次未保存」（历史缺陷：静默走完保存流程，用户误以为存上了）');
  ok(api._bkEditing===null,'B1d 且清理失效的编辑态（否则后续每次保存都落空）');
}

// B2 正常新增 + 校验 + 编辑保留状态 + 换类型清 stale 字段
{
  seedBase();
  api.save('backups',[]);
  api._bkEditing=null; D.__confirmRet=false;
  $('bkType').value='supabase'; $('bkName').value='主备';
  $('bk_url').value=''; $('bk_key').value='k'; $('bk_book').value='b';
  api.saveBackupTarget();
  ok(api.getBackups().length===0 && /URL/.test(D.__lastAlert||''),'B2a 缺 URL 被校验拦住并提示');
  $('bk_url').value='https://x.supabase.co';
  api.saveBackupTarget();
  const arr=api.getBackups();
  ok(arr.length===1 && /^bk_/.test(arr[0].id) && arr[0].enabled===true && arr[0].lastOk===null,
     'B2b 正常新增：生成 id、默认启用、尚未备份状态');
  // 编辑保留 id 与历史状态
  api._bkEditing=arr[0].id;
  arr[0].lastBackup=123; arr[0].lastOk=true; arr[0].enabled=false; api.saveBackups(arr);
  $('bkName').value='改名后';
  api.saveBackupTarget();
  const e=api.getBackups()[0];
  ok(e.id===arr[0].id && e.name==='改名后' && e.enabled===false && e.lastBackup===123 && e.lastOk===true,
     'B2c 编辑保留 id/启用态/上次备份时间与结果');
  // 换类型：旧类型字段不得残留
  api._bkEditing=e.id;
  $('bkType').value='webdav'; $('bk_url').value='https://dav.x/f.json'; $('bk_user').value='u'; $('bk_pass').value='p';
  api.saveBackupTarget();
  const w=api.getBackups()[0];
  ok(w.type==='webdav' && w.key===undefined && w.book===undefined && w.token===undefined,
     'B2d 编辑换类型后旧类型字段（key/book/token）不残留（历史缺陷：Object.assign 合并式残留旧凭据）');
}

// B3 runAllBackups：状态落盘 + 重渲染
{
  seedBase();
  api.save('backups',[
    {id:'bk1',type:'webdav',name:'甲',enabled:true,url:'https://dav.x/a.json',user:'',pass:'',lastBackup:0,lastOk:null,lastMsg:''},
    {id:'bk2',type:'webdav',name:'乙',enabled:false,url:'https://dav.x/b.json',user:'',pass:'',lastBackup:0,lastOk:null,lastMsg:''}
  ]);
  D.fetch=()=>Promise.resolve({ok:true,status:200});
  const origRT=D.renderBackupTargets; let rtCount=0;
  D.renderBackupTargets=function(){ rtCount++; return origRT.apply(null,arguments); };
  api.runAllBackups();
  await new Promise(r=>setTimeout(r,0));
  const arr=api.getBackups();
  ok(arr[0].lastOk===true && arr[0].lastBackup>0,'B3a 启用的目标备份成功后状态落盘');
  ok(arr[1].lastOk===null,'B3b 未启用的目标不被推送');
  ok(rtCount>0,'B3c 备份回调触发界面重渲染（历史缺陷：状态行不刷新）');
  D.renderBackupTargets=origRT;
}

// B4 pushSupabase：URL/头/体 + 失败处理
{
  seedBase();
  let cap=null;
  D.fetch=(url,opt)=>{ cap={url,opt}; return Promise.resolve({ok:true,status:200}); };
  const t={id:'bk1',type:'supabase',name:'S',url:'https://x.supabase.co',key:'KEY',book:'wu jin',token:'tk'};
  let r1=null; api.pushSupabase(t,{products:[],cash:[],flow:[],todos:[],parties:[],ar:[],delLog:[],stockLog:[],cfg:{shop:'s'}},ok=>{r1=ok;});
  await new Promise(r=>setTimeout(r,0));
  ok(r1===true && cap&&cap.url==='https://x.supabase.co/rest/v1/wujin?book=eq.wu%20jin','B4a URL 与 book 编码正确');
  ok(cap&&cap.opt.method==='PUT'&&cap.opt.headers.apikey==='KEY'&&/^Bearer /.test(cap.opt.headers.Authorization),'B4b PUT + apikey/Bearer 头');
  const body=cap?JSON.parse(cap.opt.body):{};
  ok(body.book==='wu jin'&&body.token==='tk'&&body.data&&body.data.cfg&&Array.isArray(body.data.products),
     'B4c 体含 book/token/data（备份比主同步多带 cfg，灾难恢复不丢设置）');
  // 失败：HTTP 500
  D.fetch=()=>Promise.resolve({ok:false,status:500});
  let r2=null; api.pushSupabase(t,{},ok=>{r2=ok;});
  await new Promise(r=>setTimeout(r,0));
  ok(r2===false && t._lastErr==='HTTP 500','B4d HTTP 非 2xx → 回调 false 且记录 HTTP 500');
  // 失败：网络抛错
  D.fetch=()=>Promise.reject(new Error('boom'));
  let r3=null; api.pushSupabase(t,{},ok=>{r3=ok;});
  await new Promise(r=>setTimeout(r,0));
  ok(r3===false && t._lastErr==='boom','B4e 网络异常 → 回调 false 且记录错误信息');
}

// B5 autoCloudBackup 节流
{
  seedBase();
  api.save('backups',[{id:'bk1',type:'webdav',name:'甲',enabled:true,url:'https://dav.x/a.json',user:'',pass:'',lastBackup:0,lastOk:null,lastMsg:''}]);
  let calls=0; D.fetch=()=>{calls++;return Promise.resolve({ok:true,status:200});};
  api._bkLastRun=0;
  api.autoCloudBackup();
  ok(calls===1,'B5a 首次（_bkLastRun=0）立即跑一轮');
  api.autoCloudBackup(); api.autoCloudBackup();
  ok(calls===1,'B5b 6 小时内重复调用被节流（不重复推）');
  api._bkLastRun=0;
  api.autoCloudBackup();
  ok(calls===2,'B5c 超过 6 小时再跑一轮');
}

// B6 纯函数锁
{
  ok(api.bkTypeLabel('supabase')==='数据库型云端'&&api.bkTypeLabel('webdav')==='通用网盘(WebDAV)'&&api.bkTypeLabel('baidu')==='百度网盘','B6a bkTypeLabel');
  ok(api.bkStatusText({lastOk:true,lastBackup:1234567890}).indexOf('✅')>=0
     && api.bkStatusText({lastOk:false,lastMsg:'x'}).indexOf('x')>=0
     && api.bkStatusText({})==='尚未备份','B6b bkStatusText 三态');
  ok(api.bkEsc('<a&\'"')==='&lt;a&amp;&#39;&quot;','B6c bkEsc 全字符转义');
}

// B7 删除正在编辑的目标 → 编辑态同步失效
{
  seedBase();
  D.__confirmRet=true;
  api.save('backups',[{id:'bk1',type:'webdav',name:'甲',enabled:true,url:'https://dav.x/a.json',user:'',pass:'',lastBackup:0,lastOk:null,lastMsg:''}]);
  api.editBackup('bk1');
  ok(api._bkEditing==='bk1','B7a 编辑态已指向该目标');
  api.delBackup('bk1');
  ok(api._bkEditing===null,'B7b 删除后编辑态同步失效（否则保存时静默落空）');
  ok(api.getBackups().length===0,'B7c 且目标确已删除');
  D.__confirmRet=false;
}

/* ============ C. 静态哨兵与回归 ============ */
console.log('\nC. 哨兵与回归');

// C1a 拼接形态静态扫描：内联事件里不得再有未包裹 jsStr() 的 '+标识符 插值
// 白名单（均有伴随锁证明其为数字/整体处理器，改传字符串会改变实参类型）：
//   gi/i/lp = 数字循环索引/价格；onClick = histFoot 预构建的完整处理器串（构造处已 jsStr）
{
  const hits=html.match(/on(?:click|change|input)="[^"]*'\+(?!jsStr\(|this\.|onClick\+|(?:gi|i|lp)\+)[\w$]/g)||[];
  ok(hits.length===0,'C1a 静态哨兵：内联事件拼接插值全部包裹 jsStr()（现存 '+hits.length+' 处未包裹）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
  // this.getAttribute 形态豁免：确认其仍零误报地留在源码里（回归锁，防哨兵过肃）
  ok(/cashDetail\('cat:'\+this\.getAttribute/.test(html),'C1b this.getAttribute 运行时取值形态不受影响');
  // 白名单伴随锁：证明豁免的三个标识符在其站点确为数字
  ok(/keys\.forEach\(\(k,gi\)/.test(html),'C1c 白名单 gi 确为 keys.forEach 数字索引');
  ok(/flowDraft\.forEach\(\(l,i\)/.test(html),'C1d 白名单 i 确为草稿行 forEach 数字索引');
  ok(/let lp=lastFlowPrice\(/.test(html),'C1e 白名单 lp 确为价格数值');
  ok(/const onClick="undoLast\('"\+jsStr\(kind\)/.test(html),'C1f 白名单 onClick 为整体处理器串且构造处已 jsStr');
}

// C1g 模板形态静态扫描：事件属性里的 ${...} 必须 jsStr()/整体处理器/数字
{
  const hits=html.match(/on[a-z]+="[^"]*\$\{(?!jsStr\(|it\.fn|(?:i|buy|wh|rt|p|pages)\})[a-z$][\w$]*(?:\.[\w$]+)?\}/g)||[];
  ok(hits.length===0,'C1g 静态哨兵：事件属性模板插值全部包裹 jsStr()/为整体处理器/为数字（现存 '+hits.length+' 处）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
  ok(/const buy=Math\.max\(/.test(html) && /, rt=Math\.max\(/.test(html),'C1h 白名单 buy/rt 确为 Math.max 价格数值');
  ok(/w\.forEach\(p=>/.test(html),'C1i 白名单 p 确为翻页窗口数字');
}

// C1j 处理器字符串构造点：反引号里 fn('${id}') 必须 jsStr 化（v1.15.14 首参哨兵看不见第二参位与构造点）
{
  const hits=html.match(/[a-zA-Z_$][\w$]*\('\$\{(?!jsStr\()/g)||[];
  ok(hits.length===0,'C1j 静态哨兵：处理器字符串构造点全部包裹 jsStr()（现存 '+hits.length+' 处）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
}

// C1k 非事件属性·拼接形态：任何属性插值必须 esc()/jsStr()
{
  const hits=html.match(/(?:data-[\w-]+|value|title|placeholder|id|alt|src|href|for|class|style|type)="[^"]*'\+(?!esc\(|jsStr\()[a-z$(]/g)||[];
  ok(hits.length===0,'C1k 静态哨兵：非事件属性拼接插值全部包裹 esc()（现存 '+hits.length+' 处）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
}

// C1l 非事件属性·模板裸链形态：${x}/${x.y} 必须 esc()
{
  const hits=html.match(/(?:data-[\w-]+|value|title|placeholder|id|alt|src|href|for|class|style|type)="[^"]*\$\{(?!esc\()[a-z$][\w$]*(?:\.[\w$]+)?\}/g)||[];
  ok(hits.length===0,'C1l 静态哨兵：非事件属性模板裸链插值全部包裹 esc()（现存 '+hits.length+' 处）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
}

// C1m JSON.stringify 不得再入 HTML 属性（双引号撑破双引号属性，任何 id 都令处理器变语法错误）
{
  const hits=html.match(/on[a-z]+="[^"]*'\+JSON\.stringify\(/g)||[];
  ok(hits.length===0,'C1m 静态哨兵：事件属性不得再出现 JSON.stringify 实参（现存 '+hits.length+' 处）');
  if(hits.length)console.log('    未包裹站点：'+hits.slice(0,6).join(' | '));
}

// C2 正常 id 行为不变（回归锁）
{
  seedBase();
  api.stockLog=[{id:'sl1',type:'in',qty:1,unit:'个',date:'2026-10-01',_t:1,pid:'p1',pname:'电钻',src:'manual'}];
  api.renderStockLog();
  ok($('stockLogList').innerHTML.indexOf("editStockLog('sl1')")>=0,'C2a 台账正常 id 的编辑按钮与原行为一致');
  api.parties=[{id:'pa1',name:'张三',type:'customer',phone:'138',contact:'',addr:'',_t:1}];
  api.renderParty();
  ok($('partyList').innerHTML.indexOf("delParty('pa1')")>=0,'C2b 往来正常 id 的删除按钮与原行为一致（修复前为死按钮）');
  api.save('backups',[{id:'bk1',type:'webdav',name:'甲',enabled:true,url:'https://dav.x/a.json',user:'',pass:'',lastBackup:0,lastOk:null,lastMsg:''}]);
  api.renderBackupTargets();
  ok($('backupTargets').innerHTML.indexOf("runOneBackup('bk1')")>=0,'C2c 备份正常 id 的按钮与原行为一致');
  const hf=api.histFoot('product','p1');
  ok(hf.indexOf("undoLast('product','p1',")>=0,'C2d 历史抽屉正常 id 的撤销调用与原行为一致');
  api.todos=[{id:'td1',text:'正常待办',done:false,due:'2026-10-15'}];
  api.renderToday();
  const th=$('todayList').innerHTML;
  ok(th.indexOf("doneTodo('td1')")>=0 && th.indexOf("delTodo('td1')")>=0,'C2e 今日要处理正常 id 的完成/删除按钮与原行为一致');
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:1,cost:8,price:10,cat:'A',spec:'',safe:10,_t:1}];
  $('sr_q').value='电钻';
  api.doSearch();
  ok($('sr_res').innerHTML.indexOf("searchJump('stock','p1')")>=0,'C2f 全局搜索正常 id 的跳转与原行为一致');
  api.stockLog=[{id:'sl1',type:'in',qty:1,unit:'个',date:'2026-10-01',_t:1,pid:'p1',pname:'电钻',src:'manual'}];
  api.editStockLog('sl1');
  ok((D.__modal&&D.__modal.bodyHtml||'').indexOf("slEditPrev('sl1')")>=0,'C2g 台账编辑抽屉正常 id 的 slEditPrev 调用形态正确');
  api.parties=[{id:'pa1',name:'张三',type:'customer',phone:'138',contact:'',addr:'',_t:1}];
  api.fillParty($('f_party'));
  ok($('f_party').innerHTML.indexOf('value="pa1"')>=0,'C2h 往来下拉正常 id 的 option value 与原行为一致');
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:1,cost:8,price:10,cat:'A',spec:'',safe:10,_t:1}];
  const uh=api.slUnitOptions({id:'p1',unit:'个',conv:{'盒':12}},'盒',12);
  ok(uh.indexOf('value="12"')>=0 && uh.indexOf('盒')>=0,'C2i 单位下拉系数与标签与原行为一致');
}

console.log('\n结果: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
