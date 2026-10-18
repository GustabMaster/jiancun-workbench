// 专项：智能识别的「现金方向/分类」词族（现金·付款·支付·货款）
// 背景：一句话录单/通用录入里，①「付款300」因 smartClassify 现金关键词组缺「付款/支付」
//   被错分成商品卡；②「现金支出300」「付现金300」「支付货款300」因 smartParseOne 把
//   「现金/货款」无条件算收入，支出被记成收入；③「收回欠款300」反向记成支出；
//   ④ guessCashCat 把「付款/偿还」一律归到「收回欠款」，付款变收款。
// 支出记成收入、付款记成收款 = 账实相反，属资金流向错误。
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
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
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
  smartClassify, smartParseOne, guessCashCat, parseSmart, smartApplyItems,
  save, renderAll, saveAllLocal, tomb
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('cashdir');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

console.log('智能录入 · 现金方向与分类专项\n');

// ---------- A. smartClassify 路由：付款类必须进现金分支，不得错分成商品 ----------
console.log('A. 路由：付款/支付类语句 → cash（历史缺陷：掉进 product 分支建出「付款」商品卡）');
ok(api.smartClassify('付款300')==='cash','「付款300」→ cash');
ok(api.smartClassify('付款给新星建材300')==='cash','「付款给新星建材300」→ cash');
ok(api.smartClassify('支付300')==='cash','「支付300」→ cash');
ok(api.smartClassify('还款300')==='cash','「还款300」→ cash');
ok(api.smartClassify('现金支出300')==='cash','回归锁：「现金支出300」→ cash');
ok(api.smartClassify('报销300')==='cash','回归锁：「报销300」→ cash');
ok(api.smartClassify('收入300')==='cash','回归锁：「收入300」→ cash');

// ---------- B. smartParseOne 方向：支出词压过「现金/货款」收入词 ----------
console.log('\nB. 方向：支出优先判定（历史缺陷：「现金/货款」无条件算收入）');
const p=s=>api.smartParseOne(s);
ok(p('现金支出300')&&p('现金支出300').type==='out','「现金支出300」→ 支出 out');
ok(p('付现金300')&&p('付现金300').type==='out','「付现金300」→ 支出 out');
ok(p('支付货款300')&&p('支付货款300').type==='out','「支付货款300」→ 支出 out');
ok(p('付货款300')&&p('付货款300').type==='out','「付货款300」→ 支出 out');
ok(p('收回欠款300')&&p('收回欠款300').type==='in','「收回欠款300」→ 收入 in（历史缺陷：记成支出）');
ok(p('还款300')&&p('还款300').type==='out','「还款300」→ 支出 out');
ok(p('收到现金300')&&p('收到现金300').type==='in','回归锁：「收到现金300」→ 收入 in');
ok(p('现金300')===null,'回归锁：「现金300」纯功能词无实质 → 丢弃（null，既有行为）');
ok(p('收入300')&&p('收入300').type==='in','回归锁：「收入300」→ 收入 in');
ok(p('收款300')&&p('收款300').type==='in','回归锁：「收款300」→ 收入 in');
ok(p('支出300')&&p('支出300').type==='out','回归锁：「支出300」→ 支出 out');
ok(p('报销300')&&p('报销300').type==='out','回归锁：「报销300」→ 支出 out');
ok(p('工资300')&&p('工资300').type==='out','回归锁：「工资300」→ 支出 out（默认口径不变）');
ok(p('收到货款500')&&p('收到货款500').type==='in'&&p('收到货款500').amount===500,'回归锁：「收到货款500」→ 收入 in / 金额500');

// ---------- C. guessCashCat 分类：付款≠收回欠款 ----------
console.log('\nC. 分类：付款/偿还 → 偿还欠款（历史缺陷：一律「收回欠款」，付款变收款）');
ok(api.guessCashCat('付款给新星建材300')==='偿还欠款','「付款给新星建材300」→ 偿还欠款');
ok(api.guessCashCat('付款300')==='偿还欠款','「付款300」→ 偿还欠款');
ok(api.guessCashCat('偿还欠款300')==='偿还欠款','「偿还欠款300」→ 偿还欠款');
ok(api.guessCashCat('付货款300')==='进货支出','「付货款300」→ 进货支出（历史缺陷：销售货款）');
ok(api.guessCashCat('收回欠款300')==='收回欠款','回归锁：「收回欠款300」→ 收回欠款');
ok(api.guessCashCat('收款300')==='收回欠款','回归锁：「收款300」→ 收回欠款');
ok(api.guessCashCat('收到货款500')==='销售货款','回归锁：「收到货款500」→ 销售货款');
ok(api.guessCashCat('进货采购500')==='进货支出','回归锁：「进货采购500」→ 进货支出');

// ---------- D. 端到端：parseSmart 多行 + smartApplyItems 落账 ----------
console.log('\nD. 端到端：多行混排 → 落账方向/分类');
api.products=[];api.flow=[];api.cash=[];api.parties=[];api.ar=[];api.stockLog=[];api.delLog=[];
const r1=api.parseSmart('现金支出300\n收到货款500','all');
const cs1=r1.filter(x=>x.kind==='cash');
ok(cs1.length===2&&cs1[0].type==='out'&&cs1[0].amount===300&&cs1[1].type==='in'&&cs1[1].amount===500,
   '「现金支出300 / 收到货款500」→ 支出300 + 收入500（历史缺陷：两笔都算收入）');
const r2=api.parseSmart('收 货款 500 现金','all');
const c2=r2.find(x=>x.kind==='cash');
ok(c2&&c2.type==='in'&&c2.amount===500,'回归锁：CA5 句式「收 货款 500 现金」→ 收入500');
const r3=api.parseSmart('收货款 500 现金','all');
const c3=r3.find(x=>x.kind==='cash');
ok(c3&&c3.type==='in'&&c3.amount===500,'回归锁：CB7 句式「收货款 500 现金」→ 收入500');

// 落账：解析结果一键应用后，现金账方向/类别正确
api.cash=[];
const it1=api.smartParseOne('现金支出300');
api.smartApplyItems([it1],'all');
ok(api.cash.length===1&&api.cash[0].type==='out'&&api.cash[0].amount===300,
   '落账：「现金支出300」→ 现金账 1 笔支出 ¥300（历史缺陷：记成收入）');
api.cash=[];
const it2=api.smartParseOne('付款300');
api.smartApplyItems([it2],'all');
ok(api.cash.length===1&&api.cash[0].type==='out'&&api.cash[0].cat==='偿还欠款',
   '落账：「付款300」→ 现金账 1 笔支出 · 偿还欠款（历史缺陷：建出商品卡、无现金）');
api.cash=[];
const it3=api.smartParseOne('付现金300');
api.smartApplyItems([it3],'all');
ok(api.cash.length===1&&api.cash[0].type==='out'&&api.cash[0].amount===300,
   '落账：「付现金300」→ 现金账 1 笔支出 ¥300（历史缺陷：纯功能词守卫整行丢弃）');
api.cash=[];

console.log('\n结果: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
