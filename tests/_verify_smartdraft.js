// 专项：录单草稿族的解析落地链（smartFillDraftCore/lineFromSmartItem/settleFlowDraft/ensureDraftProduct/
// buyFastFillDraft/saveFlowDraftAsTpl/tplLineToDraft）与整单模板行操作（otAddRow/otDelRow/otToggleAll）。
// 背景：智能预览路径 smartApplyFlow 早在旧版本就补录了句内包装换算（「盒=4」→ 商品 conv + 流水因子），
// 但一句话录单/进货速录/整单模板三条草稿链从来只传单位名、不传播换算：
//   D1（P2）lineFromSmartItem 丢弃 it.convText → ensureDraftProduct 新建商品时 conv 恒为 {单位:1}。
//     「电钻 2盒 盒=4 180元」落账后库存按 2 个扣（应扣 8 个），且商品档案里的换算永久错成 1，
//     之后每一笔按盒记账的买卖全部算错。预览路径与草稿路径同一句话给出两种结果。
//     修：行上带 convText/unitText；ensureDraftProduct 新建时换算全量落入、复用已有商品时只补缺失单位
//     （不覆盖档案里用户主动维护的值）；settleFlowDraft 落账前按商品 conv 回算 ufactor/uname；
//     模板存取两处同步携带，整单带入不丢换算。
//   D2：ot* 行操作族（添加一行/删除此行/全选全不选）此前零覆盖，补行为锁定。
//   D3：lineFromSmartItem 直查——已有商品带换算/不带换算的两条老口径必须原样锁住，防修复改坏。
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
  const timers=[];
  const ctx={console,setTimeout:(f,ms)=>{return f?setTimeout(f,ms||0):0;},clearTimeout:()=>{},
    setInterval:(f,ms)=>{timers.push({f,ms});return timers.length;},clearInterval:()=>{},
    document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload();};},
    __frResult:'data:image/png;base64,AAAA',__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.__fetchLog=[];ctx.__fetchOk=true;
  ctx.fetch=(url,opts)=>{ctx.__fetchLog.push({url:url,method:opts&&opts.method});return Promise.resolve({ok:ctx.__fetchOk,status:ctx.__fetchOk?200:500,json:()=>Promise.resolve(ctx.__fetchOk?{}:{error_code:31066})});};
  ctx.__confirmRet=true;
  ctx.confirm=()=>ctx.__confirmRet;
  ctx.btoa=s=>Buffer.from(String(s),'binary').toString('base64');
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cash(){return cash}, set cash(v){cash=v},
  get flow(){return flow}, set flow(v){flow=v},
  get parties(){return parties}, set parties(v){parties=v},
  get ar(){return ar}, set ar(v){ar=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  get flowDraft(){return flowDraft}, set flowDraft(v){flowDraft=v},
  get flowType(){return flowType}, set flowType(v){flowType=v},
  get settle(){return settle}, set settle(v){settle=v},
  smartFillDraft, smartFillDraftCore, lineFromSmartItem,
  settleFlowDraft, ensureDraftProduct,
  buyFastFillDraft,
  saveFlowDraftAsTpl, loadFlowTpl, tplLineToDraft,
  smartParseOne, smartParseLineMulti, smartExtractConv, smartParseConvText, convTextFrom,
  smartApplyFlow, commitFlow, commitRefund,
  otAddRow, otDelRow, otToggleAll,
  save, load, renderAll
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(){};ctx.showTrashBanner=function(){};ctx.renderAll=function(){};
  ctx.__timers=timers;
  return ctx;
}

const D=makeDevice('smartdraft');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const tick=()=>new Promise(r=>setTimeout(r,20));

// 种子：全表清空 + 可选的一个「电钻」商品
function seed(elec){
  api.products=elec?[{id:'p1',name:'电钻',unit:'个',conv:elec.conv||{},stock:elec.stock,cost:8,retail:180,price:180,cat:'A',spec:'',safe:0,_t:1}]:[];
  api.flow=[];api.cash=[];api.ar=[];api.parties=[];api.stockLog=[];
  api.flowDraft=[];api.flowType='sell';api.settle='cash';
  D.__confirmRet=true;
}
const P0=()=>api.products[0];

(async function main(){
console.log('录单草稿 · 解析落地链 + 整单模板行操作专项\n');

// ===== D1-A：一句话录单——新商品 + 句内换算必须落进 conv 与流水因子 =====
// 注：新商品库存恒 0，单看一笔卖出会被 Math.max(0,…) 钳平→先同句进货建档，再卖，库存账才可观测
console.log('D1-A 一句话录单：新商品的包装换算落地（核心缺陷）');
{
  seed(null);
  api.flowType='buy';
  api.smartFillDraftCore('电钻 10盒 盒=4 380元',null);   // 先按一句话进货 10 盒（建档）
  api.settleFlowDraft();
  ok(P0() && P0().conv['盒']===4,'A1a 进货建档 conv[盒]=4（未修代码：恒为 1，实际 '+(P0()?P0().conv['盒']:'无商品')+'）');
  ok(P0() && P0().stock===40,'A1b 入库 10×4=40（未修：按 10 个入，实际 '+(P0()?P0().stock:'无商品')+'）');
  api.flowType='sell';
  const el=D.document.getElementById('f_smart'); el.value='电钻 2盒 盒=4 180元';
  api.smartFillDraft();                       // 走真实入口（读输入框 → 拆句 → 入清单）
  ok(api.flowDraft.length===1,'A1c 一句话拆出 1 行入待结算清单（实际 '+api.flowDraft.length+'）');
  api.settleFlowDraft();                      // 结算全部 → 落账
  ok(api.flow.length===2 && api.flow[1].unitFactor===4,'A1d 卖出流水 unitFactor=4（未修：1，实际 '+(api.flow.length>1?api.flow[1].unitFactor:'无流水')+'）');
  ok(api.flow.length===2 && api.flow[1].unitName==='盒','A1e 卖出流水 unitName=盒');
  ok(P0() && P0().stock===32,'A1f 库存 40-8=32（未修：按 2 个扣成 38，实际 '+(P0()?P0().stock:'无商品')+'）');
  ok(api.stockLog.length===2 && api.stockLog.every(s=>s.unitFactor===4),'A1g 台账因子同步为 4');
  ok(api.flowDraft.length===0,'A1h 结算后清单清空');
}

// ===== D1-B：进货速录——同一缺陷的买方向 =====
console.log('D1-B 进货速录：买方向换算落地');
{
  seed(null); api.flowType='buy';
  D.document.getElementById('f_buyfast').value='电钻 2盒 盒=4 380';
  api.buyFastFillDraft();
  ok(api.flowDraft.length===1,'B1 速录拆出 1 行');
  api.settleFlowDraft();
  ok(P0() && P0().conv['盒']===4,'B2 进货新建商品 conv[盒]=4（未修：1，实际 '+(P0()?P0().conv['盒']:'无商品')+'）');
  ok(P0() && P0().stock===8,'B3 入库 8 个而非 2 个（未修：2，实际 '+(P0()?P0().stock:'无商品')+'）');
  ok(api.flow.length===1 && api.flow[0].type==='buy' && api.flow[0].unitFactor===4,'B4 流水为进货且 unitFactor=4');
}

// ===== D1-C：已存在商品缺该包装单位——补录 + 按换算扣库存 =====
console.log('D1-C 已存在商品：句内换算补录缺失单位');
{
  seed({conv:{},stock:10});
  api.smartFillDraftCore('电钻 2盒 盒=4 180元',null);
  api.settleFlowDraft();
  ok(P0().conv['盒']===4,'C1 已有商品补学 盒=4（未修：丢换算，实际 '+(P0().conv['盒']===undefined?'未学到':P0().conv['盒'])+'）');
  ok(api.flow[0].unitFactor===4 && api.flow[0].unitName==='盒','C2 流水按盒记账 unitFactor=4（未修：1 且无名）');
  ok(P0().stock===2,'C3 库存 10-8=2（未修：按 2 个扣成 8，实际 '+P0().stock+'）');
}
// C4：已有商品已有 盒=4，句内重复 盒=4 → 不被改坏（档案值优先）
{
  seed({conv:{盒:4},stock:10});
  api.smartFillDraftCore('电钻 2盒 盒=4 180元',null);
  api.settleFlowDraft();
  ok(P0().conv['盒']===4,'C4 已有换算不被覆盖');
  ok(api.flow[0].unitFactor===4 && P0().stock===2,'C5 老口径照旧：factor=4、库存扣 8');
}

// ===== D1-D：无换算句子——老行为必须原样保留 =====
console.log('D1-D 无换算句：老行为回归锁');
{
  seed(null); api.flowType='buy';
  api.smartFillDraftCore('电钻 2盒 180元',null);   // 新商品、只说盒、没说盒=几（进货方向，库存可观测）
  api.settleFlowDraft();
  ok(P0().conv['盒']===1,'D1 新商品无换算：conv[盒]=1（与修复前一致）');
  ok(P0().stock===2 && api.flow[0].unitFactor===1,'D2 无换算：因子 1、入库 2 个（与修复前一致）');
}
{
  seed({conv:{},stock:10});
  api.smartFillDraftCore('电钻 2盒 180元',null);   // 已有商品、单位不在 conv、句内也无换算
  api.settleFlowDraft();
  ok(P0().conv['盒']===undefined,'D3 已有商品不学的单位仍不学');
  ok(api.flow[0].unitFactor===1 && api.flow[0].unitName==='' && P0().stock===8,'D4 按基准个记账：无名、因子 1、库存 10-2=8（与修复前一致）');
}

// ===== D1-E：「件」换算（jian 通道）=====
console.log('D1-E 件换算');
{
  seed(null); api.flowType='buy';
  api.smartFillDraftCore('螺丝 3件 件=50 10元',null);
  api.settleFlowDraft();
  ok(P0().conv['件']===50,'E1 新建商品 conv[件]=50（未修：1，实际 '+(P0()?P0().conv['件']:'无商品')+'）');
  ok(P0().stock===150,'E2 入库 3×50=150（未修：3，实际 '+(P0()?P0().stock:'无商品')+'）');
  ok(api.flow[0].unitFactor===50,'E3 流水 unitFactor=50（未修：1）');
}

// ===== D1-F：整单模板往返——换算不能在半路丢 =====
console.log('D1-F 整单模板存取往返');
{
  seed(null); api.flowType='buy';
  api.smartFillDraftCore('电钻 2盒 盒=4 180元',null);       // 清单 1 行（带换算，进货方向）
  D.document.getElementById('f_tplname').value='老王常备单';
  api.saveFlowDraftAsTpl();                                  // 存模板
  const tpls=api.load('flowTpl',[]);
  ok(tpls.length===1 && tpls[0].lines.length===1,'F1 模板存下 1 行');
  api.flowDraft=[]; api.products=[];                          // 清场：商品也没建档
  api.loadFlowTpl(tpls[0].id);                               // 整单带入
  ok(api.flowDraft.length===1,'F2 模板带入 1 行');
  api.settleFlowDraft();
  ok(P0().conv['盒']===4,'F3 模板往返后换算仍落地 conv[盒]=4（未修：模板丢换算→1，实际 '+(P0()?P0().conv['盒']:'无商品')+'）');
  ok(P0().stock===8 && api.flow[0].unitFactor===4,'F4 入库 8、因子 4（未修：入库 2、因子 1）');
}

// ===== D1-G：预览路径锚点——smartApplyFlow 的既有正确行为不许被修挂 =====
console.log('D1-G 预览路径锚点');
{
  seed(null);
  const r=api.smartApplyFlow({kind:'flow',name:'电钻',type:'buy',qty:2,price:180,unit:'盒',convText:'盒=4',settle:'cash',date:'2026-10-15',party:'',partyType:'其他',note:''});
  ok(r===true,'G1 预览路径入账成功');
  ok(P0().conv['盒']===4,'G2 预览路径 conv[盒]=4（既有行为）');
  ok(P0().stock===8 && api.flow[0].unitFactor===4,'G3 预览路径入库 8、因子 4（既有行为）');
}

// ===== D2：整单模板行操作（此前零覆盖）=====
console.log('D2 整单模板行操作');
function fakeRow(checked){
  const row={chk:{checked:!!checked},removed:false};
  row.closest=()=>({remove:()=>{row.removed=true;}});
  return row;
}
const fakeTb={rows:[],appendChild(tr){this.rows.push(tr);},querySelectorAll(sel){return sel==='.ot-chk'?this.rows.map(r=>r.chk):[];}};
const origGet=D.document.getElementById.bind(D.document);
D.document.getElementById=id=>id==='ot_tbody'?fakeTb:origGet(id);
{
  fakeTb.rows=[];
  api.otAddRow();
  ok(fakeTb.rows.length===1,'H1 添加一行：tbody 多出一行');
  const tr=fakeTb.rows[0];
  ok(/ot-chk/.test(tr._html) && /checked/.test(tr._html),'H2 新行复选框默认勾选');
  ok(/ot-name/.test(tr._html) && /ot-qty/.test(tr._html) && /ot-del/.test(tr._html),'H3 新行含品名/数量/删除按钮');
}
{
  let removed=0;
  api.otDelRow({closest:()=>({remove:()=>{removed++;}})});
  ok(removed===1,'H4 删除此行：移除对应 tr');
  let threw=false; try{ api.otDelRow({closest:()=>null}); }catch(e){ threw=true; }
  ok(!threw,'H5 无 tr 祖先时不抛错');
}
{
  fakeTb.rows=[fakeRow(true),fakeRow(false),fakeRow(false)];
  api.otToggleAll();
  ok(fakeTb.rows.every(r=>r.chk.checked),'H6 有未勾选 → 全选');
  fakeTb.rows=[fakeRow(true),fakeRow(true)];
  api.otToggleAll();
  ok(fakeTb.rows.every(r=>!r.chk.checked),'H7 全已勾选 → 全不选');
  fakeTb.rows=[];
  let threw=false; try{ api.otToggleAll(); }catch(e){ threw=true; }
  ok(!threw,'H8 空表点全选不抛错');
}
D.document.getElementById=origGet;

// ===== D3：lineFromSmartItem 直查（老口径锁定 + 新字段）=====
console.log('D3 lineFromSmartItem 直查');
{
  seed({conv:{盒:4},stock:10});
  const l=api.lineFromSmartItem({kind:'flow',name:'电钻',qty:2,price:180,unit:'盒',convText:'盒=4'},'cash','2026-10-15','');
  ok(l && l.ufactor===4 && l.uname==='盒','I1 已有商品带换算：因子 4、单位盒（老口径）');
  ok(l && l.convText==='盒=4','I2 行上携带 convText（修复后；未修为 undefined）');
}
{
  seed({conv:{},stock:10});
  const l=api.lineFromSmartItem({kind:'flow',name:'电钻',qty:2,price:180,unit:'盒',convText:''},'cash','2026-10-15','');
  ok(l && l.ufactor===1 && l.uname==='','I3 已有商品无该单位：按基准、不挂单位（老口径）');
  ok(l && l.convText==='','I4 无换算句：convText 为空串');
}
{
  seed({conv:{},stock:10});
  ok(api.lineFromSmartItem({kind:'flow',name:'电钻',qty:0,price:180,unit:'盒'},'cash','2026-10-15','')===null,'I5 数量为 0 → 不成行');
  ok(api.lineFromSmartItem({kind:'flow',name:'',qty:2,price:180,unit:'盒'},'cash','2026-10-15','')===null,'I6 无品名 → 不成行');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
