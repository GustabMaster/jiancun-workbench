// 专项：快捷录入八件套（默认带出上次 / 连续记账待结算清单 / 一句话录单 / 整单模板 /
//       进货速录 / 历史克隆 / 商品即录即建 / 最近成交价记忆）
// 复用 _verify_bulk.js 的无头桩架（mock document/localStorage + __api shim）
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
  alert:(m)=>{ctx.__lastAlert=m;},
  confirm:(m)=>{ctx.__lastConfirm=m; return ctx.__confirmRet!==false;},
  URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
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
  get flowDraft(){return flowDraft}, set flowDraft(v){flowDraft=v},
  get settle(){return settle}, set settle(v){settle=v},
  get flowType(){return flowType},
  load, save, toast,
  setFlowType, setSettle, renderAll,
  addFlow, addFlowToDraft, settleFlowDraft, readFlowLine, ensureDraftProduct,
  updDraftLine, delDraftLine, clearFlowDraft, draftTotal, renderFlowDraft,
  smartFillDraft, buyFastFillDraft, cloneFlowToDraft,
  smartFillDraftCore, smartFillDraftHome,
  saveFlowDraftAsTpl, loadFlowTpl, delFlowTpl, renderFlowTpls, tplLineToDraft,
  saveFlowLast, restoreFlowLast, lastFlowPrice, lastFlowPriceFor, refreshLastPriceHint,
  loadFlowProductHints, commitFlow,
  clearAll, runModal,
  get flowFilter(){return flowFilter}, set flowFilter(v){flowFilter=v},
  getFlowList, resetFlowView, renderFlow, fillFlowFilter,
  getStockList, getProductMap,
  restoreLocal, addProduct
};`;
vm.runInContext(script+shim,ctx,{filename:'wujin-quick'});

const D=ctx, api=D.__api;
const $=id=>D.document.getElementById(id);
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const TODAY=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();

/* ---------- 造数据 ---------- */
function seed(){
  api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:10,price:13,cat:'',spec:'',safe:0,retail:13,wholesale:11},
                {id:'p2',name:'螺母',unit:'个',conv:{},stock:50,cost:8,price:10,cat:'',spec:'',safe:0,retail:10,wholesale:9}];
  api.parties=[{id:'pa1',name:'张三',type:'客户'},{id:'pa2',name:'李四',type:'供应商'}];
  api.flow=[];api.cash=[];api.ar=[];api.stockLog=[];api.delLog=[];
  api.flowDraft=[];
  $('f_unit').innerHTML='<option value="1">基准单位（个）</option>';$('f_unit').value='1';
  $('f_spec').innerHTML='<option value="">（未设置）</option>';$('f_spec').value='';$('f_spec').disabled=true;
  $('f_pid').value='';$('f_product').value='';
  ['f_qty','f_price','f_note','f_smart','f_smart_home','f_buyfast','f_tplname','f_newname','f_newunit','f_newspec','f_newsafe','f_newpname'].forEach(i=>{$(i).value='';});
  $('f_party').value='';$('f_date').value=TODAY;
  D.localStorage.removeItem('wb_wujin_flowTpl');D.localStorage.removeItem('wb_wujin_flowLast');
}
// 以「已选商品」状态填一行表单
function fillForm(pid,name,qty,price,partyId){
  $('f_pid').value=pid;$('f_product').value=name;$('f_spec').value='';$('f_spec').disabled=false;
  $('f_qty').value=qty;$('f_price').value=price;$('f_party').value=partyId||'';
  $('f_date').value=TODAY;$('f_note').value='';$('f_unit').value='1';
}

console.log('快捷录入八件套 · 专项\n');

/* ========== 1. 默认带出上次（D6） ========== */
console.log('一、默认带出上次');
seed();
api.saveFlowLast('pa1','credit',TODAY);
$('f_party').value='';api.setSettle('cash');$('f_date').value=TODAY;
api.restoreFlowLast();
ok($('f_party').value==='pa1','恢复上次的往来单位（张三）');
ok(D.document.getElementById('set_credit').classList.contains('on'),'恢复上次的结算方式（赊账）');
// 日期：只带同一天的，隔天的日期不带（避免记错日期）
seed();
api.saveFlowLast('pa1','cash','2020-01-01');
$('f_party').value='';$('f_date').value=TODAY;
api.restoreFlowLast();
ok($('f_party').value==='pa1','非当日日期也恢复往来单位');
ok($('f_date').value===TODAY,'隔天的日期不被带出（仍为今天）');

/* ========== 2. 连续记账（A2：待结算清单） ========== */
console.log('\n二、连续记账（待结算清单）');
seed();
api.setFlowType('sell');api.setSettle('cash');
fillForm('p1','电钻',5,13,'pa1');
api.addFlowToDraft();
ok(api.flowDraft.length===1,'第一件加入清单（1 行）');
ok($('f_party').value==='pa1','加入清单后客户仍保留，不用重选');
ok($('f_qty').value===''&&$('f_product').value==='','加入清单后商品/数量/单价已清空，可直接录下一件');
fillForm('p2','螺母',3,10,'pa1');
api.addFlowToDraft();
ok(api.flowDraft.length===2,'第二件加入清单（2 行）');
ok(api.draftTotal()===95,'清单合计 = 5×13 + 3×10 = ¥95');
// 行内改数量
api.updDraftLine(0,'qty',6);
ok(api.draftTotal()===108,'行内把数量 5 改成 6，合计变 ¥108');
api.updDraftLine(0,'qty',5);
// 删一行
api.addFlowToDraft.call(null);
fillForm('p2','螺母',1,10,'pa1');api.addFlowToDraft();
ok(api.flowDraft.length===3,'第三行入清单');
api.delDraftLine(2);
ok(api.flowDraft.length===2,'删掉第三行，剩 2 行');
// 结算全部：落买卖 + 现金 + 出入库台账，库存联动
const cashBefore=api.cash.length, slBefore=api.stockLog.length;
api.settleFlowDraft();
ok(api.flow.length===2,'结算全部：生成 2 条买卖记录');
ok(api.cash.length===cashBefore+2,'现结：生成 2 条现金收入（销售货款）');
ok(api.stockLog.length===slBefore+2,'生成 2 条出入库台账（销售出库）');
ok(api.products.find(p=>p.id==='p1').stock===95,'电钻库存 100 → 95（卖出5）');
ok(api.products.find(p=>p.id==='p2').stock===47,'螺母库存 50 → 47（卖出3）');
ok(api.flowDraft.length===0,'结算后清单自动清空');
ok(api.flow[0].party==='张三'&&api.flow[1].party==='张三','两行都挂在同一客户（张三）名下');
// 赊账路径
seed();api.setFlowType('sell');api.setSettle('credit');
fillForm('p1','电钻',2,13,'pa1');api.addFlowToDraft();
const arBefore=api.ar.length;
api.settleFlowDraft();
ok(api.ar.length===arBefore+1&&api.ar[0].kind==='receivable'&&api.ar[0].amount===26,'赊账结算：生成 1 条应收 ¥26');
// 空清单结算不报错
seed();api.settleFlowDraft();
ok(api.flow.length===0,'空清单点结算不产生记录');

/* ========== 3. 一句话录单（A3） ========== */
console.log('\n三、一句话录单（纯文本，语音由输入法转换）');
seed();api.setFlowType('sell');api.setSettle('cash');
$('f_smart').value='张三 螺母5个13元 电钻3个30元';
api.smartFillDraft();
ok(api.flowDraft.length===2,'一句话拆成 2 行入清单');
ok(api.flowDraft.every(l=>l.partyName==='张三'),'两行都识别出同一客户（张三）');
const l1=api.flowDraft.find(l=>l.pname==='螺母'), l2=api.flowDraft.find(l=>l.pname==='电钻');
ok(!!l1&&+l1.qty===5&&+l1.price===13&&l1.pid==='p2','「螺母5个13元」→ 螺母 ×5 @13，并匹配到已有商品');
ok(!!l2&&+l2.qty===3&&+l2.price===30&&l2.pid==='p1','「电钻3个30元」→ 电钻 ×3 @30，并匹配到已有商品');
ok($('f_smart').value==='','拆单后输入框自动清空');
api.settleFlowDraft();
ok(api.flow.length===2&&api.flow[0].qty===5,'一句话录的单可直接结算落账');
// 赊账词识别
seed();api.setFlowType('sell');api.setSettle('cash');
$('f_smart').value='李四 螺母2个10元 赊账';
api.smartFillDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].settle==='credit','句中出现「赊账」→ 该行按赊账结算');
// 没提结算方式时沿用表单当前选择
seed();api.setFlowType('sell');api.setSettle('credit');
$('f_smart').value='螺母2个10元';
api.smartFillDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].settle==='credit','句子里没提结算方式 → 沿用表单上的「赊账」');
// 空输入/看不懂不炸
seed();$('f_smart').value='';api.smartFillDraft();
ok(api.flowDraft.length===0,'空输入不产生清单行');
seed();$('f_smart').value='今天天气不错';api.smartFillDraft();
ok(api.flowDraft.length===0,'读不懂的句子不产生清单行');

/* ========== 3b. 首页一句话录单主入口（A3：放大到首页最显眼处） ========== */
console.log('\n三b、首页一句话录单主入口');
ok(/id="f_smart_home"/.test(html)&&/smartFillDraftHome\(\)/.test(html),'首页 DOM 含一句话录单输入框（id=f_smart_home，回车触发）');
seed();api.setFlowType('buy');api.setSettle('cash');   // 哪怕当前停在进货态
$('f_smart_home').value='张三 电钻2个13元';
api.smartFillDraftHome();
ok(api.flowDraft.length===1,'首页输入框回车 → 拆成 1 行入清单');
ok(api.flowDraft[0].type==='sell'&&api.flowType==='sell','首页入口按「卖出」拆单（客户来买，自动切到卖出态）');
ok(api.flowDraft[0].partyName==='张三'&&api.flowDraft[0].pname==='电钻','首页入口同样识别句内客户与商品');
ok($('f_smart_home').value==='','拆单后首页输入框清空');
// 赊账词在首页入口同样生效
seed();api.setFlowType('sell');
$('f_smart_home').value='李四 螺母2个10元 赊账';
api.smartFillDraftHome();
ok(api.flowDraft.length===1&&api.flowDraft[0].settle==='credit','首页入口句中出现「赊账」→ 按赊账入清单');
// 空输入不炸
seed();$('f_smart_home').value='';api.smartFillDraftHome();
ok(api.flowDraft.length===0,'首页入口空输入不产生清单行');
// 共用内核：买卖页版行为不变（回归）
seed();api.setFlowType('sell');api.setSettle('cash');
$('f_smart').value='张三 螺母5个13元';
const nCore=api.smartFillDraftCore('张三 螺母5个13元', null);
ok(nCore===1&&api.flowDraft.length===1,'共用内核 smartFillDraftCore 可直接复用（返回入清单行数）');

/* ========== 4. 整单模板（A1） ========== */
console.log('\n四、整单模板');
seed();api.setFlowType('sell');api.setSettle('cash');
fillForm('p1','电钻',5,13,'pa1');api.addFlowToDraft();
fillForm('p2','螺母',3,10,'pa1');api.addFlowToDraft();
$('f_tplname').value='老王的常备单';
api.saveFlowDraftAsTpl();
let tpls=api.load('flowTpl',[]);
ok(tpls.length===1&&tpls[0].lines.length===2,'当前清单存为模板（2 行）');
ok(tpls[0].lines.every(l=>l.partyId==='pa1'),'模板里记下了客户');
api.clearFlowDraft(false);
ok(api.flowDraft.length===0,'存模板后清单可清空');
api.loadFlowTpl(tpls[0].id);
ok(api.flowDraft.length===2&&api.draftTotal()===95,'点模板名 → 整单带入清单（合计 ¥95）');
// 同名覆盖
fillForm('p1','电钻',1,13,'pa1');api.addFlowToDraft();
$('f_tplname').value='老王的常备单';
api.saveFlowDraftAsTpl();
tpls=api.load('flowTpl',[]);
ok(tpls.length===1,'同名模板覆盖保存，不会堆重复');
// 删模板
api.delFlowTpl(tpls[0].id);
ok(api.load('flowTpl',[]).length===0,'删除模板');
// 模板行指向已删除商品时 → 结算时自动重建
seed();api.setFlowType('sell');
api.flowDraft=[{pid:null,pname:'电钻',spec:'',qty:4,price:13,ufactor:1,uname:'',note:'',type:'sell',partyId:'',partyName:'',partyType:'客户',settle:'cash',date:TODAY,isNew:true,newUnit:'',newSafe:0}];
$('f_date').value=TODAY;
api.settleFlowDraft();
ok(api.products.some(p=>p.name==='电钻')&&api.flow.length===1,'模板/清单里的新商品在结算时自动建档并落账');

/* ========== 5. 进货速录（B5） ========== */
console.log('\n五、进货速录（一行一件）');
seed();api.setFlowType('buy');api.setSettle('credit');
$('f_party').value='pa2';
$('f_buyfast').value='螺母 10个 8\n电钻 2台 300';
api.buyFastFillDraft();
ok(api.flowDraft.length===2,'两行文本 → 2 行进货清单');
ok(api.flowDraft.every(l=>l.type==='buy'),'都按「进货」入清单');
ok(api.flowDraft.every(l=>l.partyName==='李四'),'整批沿用表单上选的供应商（李四）');
const b1=api.flowDraft.find(l=>l.pname==='螺母'), b2=api.flowDraft.find(l=>l.pname==='电钻');
ok(!!b1&&+b1.qty===10&&+b1.price===8,'「螺母 10个 8」→ ×10 @8（没写「元」也认得出价格）');
ok(!!b2&&+b2.qty===2&&+b2.price===300&&b2.pid==='p1','「电钻 2台 300」→ ×2 @300');
// 落库存 + 应付
const stock1=api.products.find(p=>p.id==='p1').stock, arB=api.ar.length;
api.settleFlowDraft();
ok(api.products.find(p=>p.id==='p1').stock===stock1+2,'进货落库存：电钻 +2');
ok(api.ar.length===arB+2&&api.ar.every(a=>a.kind==='payable'),'赊账进货：生成 2 条应付');
// 读不懂的行跳过不炸
seed();api.setFlowType('buy');
$('f_buyfast').value='螺母 10个 8\n随便一句话没有数字';
api.buyFastFillDraft();
ok(api.flowDraft.length===1,'读不懂的行跳过，只收看懂的行');

/* ========== 6. 历史单据克隆（P1-2） ========== */
console.log('\n六、历史单据克隆');
seed();api.setFlowType('sell');api.setSettle('cash');
api.flow=[{id:'old1',type:'sell',pid:'p1',pname:'电钻',spec:'',qty:7,price:13,unitName:'个',unitFactor:1,partyId:'pa1',party:'张三',settle:'cash',date:'2026-01-01',note:'',linkCashId:'x',linkArIds:[]}];
api.cloneFlowToDraft('old1');
ok(api.flowDraft.length===1&&+api.flowDraft[0].qty===7&&+api.flowDraft[0].price===13,'克隆出与旧单相同的数量/单价');
ok(api.flowDraft[0].partyName==='张三','克隆保留客户');
ok(api.flowDraft[0].date===TODAY,'克隆按「今天」入账，不会把旧日期带过来');
api.updDraftLine(0,'qty',9);
api.settleFlowDraft();
ok(api.flow.length===2&&api.flow[1].qty===9,'改数量后结算，生成新单据（旧单不动）');

/* ========== 7. 商品即录即建（P1-4） ========== */
console.log('\n七、商品即录即建');
seed();api.setFlowType('sell');api.setSettle('cash');
$('f_pid').value='';$('f_product').value='__new__';
$('f_newname').value='全新货';$('f_newunit').value='箱';$('f_newsafe').value='5';$('f_newspec').value='';
$('f_qty').value=4;$('f_price').value=20;$('f_party').value='pa1';$('f_date').value=TODAY;
api.addFlowToDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].isNew===true,'新商品名先入清单（标记为新建）');
ok(api.products.length===2,'入清单阶段还没建商品（不留垃圾数据）');
api.settleFlowDraft();
const np=api.products.find(p=>p.name==='全新货');
ok(!!np&&np.unit==='个'&&np.conv&&np.conv['箱']===1&&np.safe===5&&np.retail===20,'结算时自动建档：单位「个」+ 包装「箱」+ 安全库存 5 + 零售价 20');
ok(api.flow.length===1&&api.flow[0].pid===np.id&&api.flow[0].qty===4,'新商品的买卖记录正常落账');

/* ========== 8. 最近成交价记忆（P1-3） ========== */
console.log('\n八、最近成交价记忆');
seed();api.setFlowType('sell');
api.flow=[{id:'h1',type:'sell',pid:'p1',partyId:'pa1',price:12,qty:1,date:'2026-01-01'},
          {id:'h2',type:'sell',pid:'p1',partyId:'pa2',price:15,qty:1,date:'2026-01-02'},
          {id:'h3',type:'sell',pid:'p1',partyId:'pa1',price:13,qty:1,date:'2026-01-03'},
          {id:'h4',type:'sell',pid:'p2',partyId:'pa1',price:9,qty:1,date:'2026-01-04'}];
ok(api.lastFlowPrice('p1','pa1')===13,'同往来取最后一次成交价（张三 → 13）');
ok(api.lastFlowPrice('p1','pa2')===15,'换往来取该往来的最后一次（李四 → 15）');
ok(api.lastFlowPrice('p1','')===13,'不限往来取最后一次（13）');
ok(api.lastFlowPrice('p9','pa1')===null,'没有历史的商品返回空');
// 端到端：选商品+客户 → 单价自动带出上次成交价
$('f_pid').value='p1';$('f_product').value='电钻';$('f_spec').value='';$('f_party').value='pa1';$('f_unit').value='1';
$('f_price').value='';
api.loadFlowProductHints();
ok(+$('f_price').value===13,'选中「电钻 + 张三」→ 单价自动带出上次成交价 13');
// 换客户 → 带出该客户的上次价
$('f_party').value='pa2';$('f_price').value='';
api.loadFlowProductHints();
ok(+$('f_price').value===15,'换成「李四」→ 单价自动带出 15');
// 无历史 → 仍按商品档案带回零售价（原行为不变）
api.flow=[]; // 清掉历史，专门验证「无成交历史」分支
$('f_pid').value='p2';$('f_product').value='螺母';$('f_spec').value='';$('f_party').value='';$('f_price').value='';
api.loadFlowProductHints();
ok(+$('f_price').value===10,'没有成交历史的商品 → 仍按档案带回零售价 10');

/* ========== 8b. 往来单位从句子里剥离（防止建出错名字的商品） ========== */
console.log('\n八b、句内往来单位识别');
seed();api.setFlowType('sell');api.setSettle('cash');
$('f_smart').value='张三的螺母5个13元';
api.smartFillDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].pname==='螺母'&&api.flowDraft[0].partyName==='张三','「张三的螺母5个13元」→ 商品名是「螺母」，往来是「张三」');
// 往来名是商品名前缀时不能误剥（李四 / 李四螺丝）
seed();api.products.push({id:'p3',name:'李四螺丝',unit:'个',conv:{},stock:9,cost:1,price:2,cat:'',spec:'',safe:0,retail:2});
api.setFlowType('sell');
$('f_smart').value='李四螺丝5个13元';
api.smartFillDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].pname==='李四螺丝'&&api.flowDraft[0].pid==='p3','商品名含往来名时不被误剥（李四螺丝仍是商品）');

/* ========== 9. 原「保存这笔买卖」路径回归 ========== */
console.log('\n九、原路径回归（直接保存这笔）');
seed();api.setFlowType('sell');api.setSettle('cash');
fillForm('p1','电钻',2,13,'pa1');
api.addFlow();
ok(api.flow.length===1&&api.cash.length===1,'addFlow 仍可一笔直接落账');
ok($('f_party').value==='pa1','addFlow 保存后客户保留（连续录同一客户不用重选）');
ok(api.load('flowLast',null)&&api.load('flowLast',null).partyId==='pa1','addFlow 落账后记住该客户，下次打开自动带出');

/* ========== 10. 全面自查修复的四个 bug 回归锁 ========== */
console.log('\n十、自查修复回归锁');
// ① 结算中途中止（库存不足弹窗点取消）→ 已落账的行必须离开清单，不能重复入账
seed();api.setFlowType('sell');api.setSettle('cash');
fillForm('p1','电钻',5,13,'pa1');api.addFlowToDraft();
api.flowDraft.push({pid:'p1',pname:'电钻',spec:'',qty:200,price:13,ufactor:1,uname:'个',note:'',type:'sell',partyId:'pa1',partyName:'张三',partyType:'客户',settle:'cash',date:TODAY,isNew:false,newUnit:'',newSafe:0});
fillForm('p2','螺母',3,10,'pa1');api.addFlowToDraft();
D.__confirmRet=false; // 模拟用户在「库存不足」确认框上点取消
api.settleFlowDraft();
ok(api.flow.length===1,'第一行已落账（1 条），中途止于库存不足行');
ok(api.flowDraft.length===2,'已落账的行被移出清单，剩余 2 行留在清单（不会重复入账）');
ok(api.products.find(p=>p.id==='p1').stock===95,'电钻只被扣一次（100-5=95），没有双倍扣库存');
D.__confirmRet=true;
api.settleFlowDraft();
ok(api.flow.length===3,'放行后重试，剩余 2 行补上（合计 3 条，无重复）');
ok(api.flowDraft.length===0,'全部结算后清单清空');
// ② 同一单里两行同一个新商品名 → 只建一个商品，不建重名
seed();api.setFlowType('sell');api.setSettle('cash');
api.flowDraft=[{pid:null,pname:'全新货',spec:'',qty:2,price:10,ufactor:1,uname:'',note:'',type:'sell',partyId:'pa1',partyName:'张三',partyType:'客户',settle:'cash',date:TODAY,isNew:true,newUnit:'',newSafe:0},
              {pid:null,pname:'全新货',spec:'',qty:3,price:10,ufactor:1,uname:'',note:'',type:'sell',partyId:'pa1',partyName:'张三',partyType:'客户',settle:'cash',date:TODAY,isNew:true,newUnit:'',newSafe:0}];
$('f_date').value=TODAY;
api.settleFlowDraft();
ok(api.products.filter(p=>p.name==='全新货').length===1,'同名新商品两行只建 1 个商品（第二行复用）');
ok(api.flow.length===2&&api.flow.every(f=>f.pid===api.products.find(p=>p.name==='全新货').id),'两行买卖都挂在同一商品 id 上');
// ③ 结算时记住的「上次客户」必须是解析后的真实 id，不能是 '__newp__'
seed();api.setFlowType('sell');api.setSettle('cash');
api.flowDraft=[{pid:'p2',pname:'螺母',spec:'',qty:1,price:10,ufactor:1,uname:'个',note:'',type:'sell',partyId:'__newp__',partyName:'新客户甲乙',partyType:'客户',settle:'cash',date:TODAY,isNew:false,newUnit:'',newSafe:0}];
$('f_date').value=TODAY;
api.settleFlowDraft();
const fl=api.load('flowLast',null);
ok(fl&&fl.partyId&&fl.partyId!=='__newp__'&&api.parties.some(x=>x.id===fl.partyId),'即录即建的新客户：记住的是真实单位 id（非 __newp__）');
ok(api.parties.some(x=>x.name==='新客户甲乙'),'新客户已正式建档');
// ④ 行上挂的商品/往来已被删 → 不写挂空 id 的记录
seed();api.setFlowType('sell');api.setSettle('cash');
api.flowDraft=[{pid:'p_gone',pname:'电钻',spec:'',qty:2,price:13,ufactor:1,uname:'个',note:'',type:'sell',partyId:'pa_gone',partyName:'老王',partyType:'客户',settle:'cash',date:TODAY,isNew:false,newUnit:'',newSafe:0}];
$('f_date').value=TODAY;
api.settleFlowDraft();
ok(api.products.filter(p=>p.name==='电钻').length===1,'商品被删后按名字重建，不产生第二个「电钻」');
ok(api.flow.length===1&&api.flow[0].pid===api.products.find(p=>p.name==='电钻').id,'流水挂在有效商品 id 上（无空挂）');
ok(api.flow[0].partyId===''&&api.flow[0].party==='老王','往来被删后只留名字文本，不挂失效 id');
// ⑤ 清空本地数据 → 模板/上次记录一并作废（不残留指向已删数据的模板）
seed();api.setFlowType('sell');api.setSettle('cash');
fillForm('p1','电钻',5,13,'pa1');api.addFlowToDraft();
$('f_tplname').value='老王的常备单';
api.saveFlowDraftAsTpl();
api.saveFlowLast('pa1','cash',TODAY);
ok(api.load('flowTpl',[]).length===1&&api.load('flowLast',null),'准备：已存 1 个模板 + 上次记录');
api.clearAll();   // 打开清空确认弹窗
api.runModal();   // 等价于点「确认清空」
ok(api.products.length===0&&api.parties.length===0&&api.flow.length===0,'七张表已清空');
ok(api.load('flowTpl',[]).length===0,'清空后模板一并删除（不残留指向已删数据的模板）');
ok(!api.load('flowLast',null),'清空后上次记录一并删除');
ok(api.flowDraft.length===0,'清空后待结算清单为空');
// ⑥ 退货单也走待结算清单 → 结算时走 commitRefund（回库 + 现金支出）
seed();api.setFlowType('refund');api.setSettle('cash');
fillForm('p1','电钻',2,13,'pa1');
api.addFlowToDraft();
ok(api.flowDraft.length===1&&api.flowDraft[0].type==='refund','退货单可加入待结算清单');
const st0=api.products.find(p=>p.id==='p1').stock, cash0=api.cash.length;
api.settleFlowDraft();
ok(api.products.find(p=>p.id==='p1').stock===st0+2,'退货结算：库存回库 +2');
ok(api.cash.length===cash0+1&&api.cash[cash0].type==='out','退货现结：记一笔现金支出（销售退货）');
ok(api.flow.length===1&&api.flow[0].refund===true,'生成带退货标记的买卖记录');
// ⑦ 模板数据被手改坏（lines 不是数组）→ 不炸，按 0 行处理
seed();api.setFlowType('sell');
D.localStorage.setItem('wb_wujin_flowTpl',JSON.stringify([{id:'tpl_bad',name:'坏模板',lines:'不是数组'}]));
let threw=false; try{ api.loadFlowTpl('tpl_bad'); }catch(e){ threw=true; }
ok(!threw&&api.flowDraft.length===0,'坏模板（lines 非数组）不崩溃，按 0 行带入');
api.renderFlowTpls();
ok(true,'坏模板渲染不崩溃');
D.localStorage.removeItem('wb_wujin_flowTpl');

// ⑧ 买卖页「按商品筛选」→ getFlowList 曾裸读 pmap（v1.13.31 引入的 ReferenceError，v1.15.1 修复）
seed();
api.flow=[{id:'fl1',type:'sell',pid:'p1',pname:'电钻',qty:2,price:13,unitFactor:1,date:TODAY,settle:'cash',partyId:'pa1',party:'张三'},
          {id:'fl2',type:'buy',pid:'p2',pname:'螺母',qty:5,price:8,unitFactor:1,date:TODAY,settle:'cash',partyId:'pa2',party:'李四'},
          {id:'fl3',type:'sell',pid:'',pname:'已删商品',qty:1,price:5,unitFactor:1,date:TODAY,settle:'cash',partyId:'pa1',party:'张三'}];
api.save('flow',api.flow); // 走 save  bump _rcV.flow，避免命中上一节残留的列表缓存
api.flowFilter.pid='';api.resetFlowView();
ok(api.getFlowList().length===3,'准备：无筛选时 3 条流水全在');
api.flowFilter.pid='电钻';
let threwF=false,lstF=null;
try{ lstF=api.getFlowList(); }catch(e){ threwF=true; }
ok(!threwF,'按商品名筛选不再抛 ReferenceError（pmap 裸读已修）');
ok(!threwF&&lstF.length===1&&lstF[0].id==='fl1','按商品名筛选：只剩「电钻」的卖出');
api.flowFilter.pid='已删商品';
threwF=false;try{ lstF=api.getFlowList(); }catch(e){ threwF=true; }
ok(!threwF&&lstF.length===1&&lstF[0].id==='fl3','商品已删的流水按 pname 兜底匹配');
api.flowFilter.pid='电钻';
let renderThrew=false; try{ api.renderFlow(); }catch(e){ renderThrew=true; }
ok(!renderThrew,'带商品筛选时 renderFlow 正常渲染不崩');
ok(api.getFlowList().length===1,'筛选结果走缓存，二次读取一致');
api.flowFilter.pid='';api.resetFlowView();
ok(api.getFlowList().length===3,'清筛选后恢复全部 3 条');

// ⑨ 全量数据变更（清空本地 / 恢复本地）必须 bump _rcV，否则各类渲染缓存显示幽灵数据（v1.15.1 修复）
seed();
vm.runInContext('stockFilter={q:"",cat:"",status:""}',D);
api.products=[{id:'p1',name:'电钻',unit:'个',conv:{},stock:100,cost:10,price:13,cat:'',spec:'',safe:0,retail:13,wholesale:11},
              {id:'p2',name:'螺母',unit:'个',conv:{},stock:50,cost:8,price:10,cat:'',spec:'',safe:0,retail:10,wholesale:9}];
api.flow=[{id:'fl1',type:'sell',pid:'p1',pname:'电钻',qty:2,price:13,unitFactor:1,date:TODAY,settle:'cash',partyId:'pa1',party:'张三'}];
api.save('products',api.products); api.save('flow',api.flow); // bump _rcV，避免命中旧缓存
ok(api.getStockList().length===2&&api.getFlowList().length===1,'准备：列表缓存装入 2 商品 + 1 流水');
api.clearAll(); api.runModal();
ok(api.getStockList().length===0,'清空本地后库存列表缓存失效（无幽灵商品）');
ok(api.getFlowList().length===0,'清空本地后买卖列表缓存失效（无幽灵流水）');
api.save('products',api.products); api.getStockList();   // 清空后发生一次普通保存
api.restoreLocal();                                       // 恢复 clearAll 时的快照
ok(api.getStockList().length===2,'恢复本地后缓存刷新为快照数据（2 个商品，不停在恢复前）');

console.log('\n==== 快捷录入专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
process.exit(fail?1:0);
