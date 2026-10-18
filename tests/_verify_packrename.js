// 专项：包装预设「改名 / 删除」级联到商品换算表时的键冲突与残留
// 背景：renamePack 只校验目标名是否与**预设**重名（cfg.packPresets），却不管目标名是否已被
// 某些商品的 conv 占用。而 conv 里完全可能存在预设之外的键：①「件」走独立块、明确不入预设；
// ② 导入备份 / 云端合并带来的键（migrateMetaPresets 只跑一次且导入不重建预设，见 2042 行）。
// 于是「把 盒 改名为 箱/件」会直接用盒的系数覆盖掉目标键原有系数并删掉盒——换算被静默改写，
// 之后所有按包装单位折算的库存/对账全错。delPack 同样只看 conv[v]>0，系数为 0 的键会残留。
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
    setAttribute(){},getAttribute(){return null;},removeAttribute(){},focus(){},scrollIntoView(){},closest(){return elStub();},
    querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[{textContent:'',text:'',value:''}],options:[{textContent:'',text:'',value:''}],selectedIndex:0,click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});},toDataURL:()=>'data:image/jpeg;base64,AAAA'};
  return self;
}
function makeDevice(name){
  const elements={};
  const getEl=id=>{if(!elements[id])elements[id]=elStub();return elements[id];};
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{classList:makeClassList(),appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,
    alert:(m)=>{ctx.__lastAlert=m;},confirm:()=>true,prompt:()=>ctx.__promptRet||'',URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;this.height=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result=ctx.__frResult;if(this.onload)this.onload({target:this});};this.readAsDataURL=()=>{this.result=ctx.__frResult;if(this.onload)this.onload({target:this});};},
    __frResult:'data:image/png;base64,AAAA',__lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  ctx.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),ok:true});
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  get parties(){return parties}, set parties(v){parties=v},
  get flow(){return flow}, set flow(v){flow=v},
  get ar(){return ar}, set ar(v){ar=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  migrateMetaPresets, renamePack, delPack, addPackSetting,
  renderPackMgr, renderAll, save
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.openModal=function(title,text,fn,okText,inputDefault,bodyHtml){ctx.__modal={title,text,fn,okText,inputDefault,bodyHtml};};
  ctx.__confirm=function(){ if(ctx.__modal&&ctx.__modal.fn) ctx.__modal.fn(); ctx.__modal=null; };
  return ctx;
}

const D=makeDevice('packrename');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

// 种子：P0 同时有「盒=12」与预设之外的「箱=24」（模拟导入/合并带入的键）；
// P1 只有「盒=12」；P2 有「件=40」（件走独立块，永不在预设里）。
function seed(){
  api.products=[
    {id:'P0',name:'螺丝',cat:'',spec:'',unit:'个',conv:{'盒':12,'箱':24},stock:0,safe:0,cost:1,price:2,cat2:'',_t:1},
    {id:'P1',name:'扳手',cat:'',spec:'',unit:'个',conv:{'盒':12},       stock:0,safe:0,cost:1,price:2,_t:1},
    {id:'P2',name:'电钻',cat:'',spec:'',unit:'个',conv:{'件':40},       stock:0,safe:0,cost:1,price:2,_t:1}
  ];
  api.cfg=Object.assign({},api.cfg,{packPresets:['盒','袋'],catPresets:[],specPresets:[],locPresets:['1库']});
  D.localStorage.setItem('wb_wujin_mig_meta_presets','1'); // 迁移已跑过（模拟老设备/已导入过）
  api.save('products',api.products); api.save('cfg',api.cfg);
}
const getEl=id=>D.document.getElementById(id);
const idxOf=n=>api.cfg.packPresets.indexOf(n);
const P=id=>api.products.find(p=>p.id===id);

console.log('包装预设改名/删除 · 商品换算表键冲突专项\n');

// 0. 种子自校验
seed();
ok(P('P0').conv['盒']===12&&P('P0').conv['箱']===24&&P('P2').conv['件']===40&&!api.cfg.packPresets.includes('箱')&&!api.cfg.packPresets.includes('件'),
   '种子自校验：P0 盒12+箱24、P2 件40，且「箱」「件」均不在预设中');

// A. 改名为「预设之外但已被商品 conv 占用的键」→ 不得覆盖目标系数
console.log('\nA. 改名目标键冲突（历史缺陷：直接用源系数覆盖目标键）');
seed();
getEl('pack_'+idxOf('盒')).value='箱';
api.renamePack(idxOf('盒'));
ok(P('P0').conv['箱']===24&&P('P0').conv['盒']===12,
   'A1 盒→箱：目标键「箱」原系数 24 不被覆盖、源键「盒」不丢失（实际 箱='+P('P0').conv['箱']+' 盒='+P('P0').conv['盒']+'）');
ok(P('P1').conv['盒']===12,
   'A2 冲突时全有或全无：未被冲突影响的 P1 也不得被半途改名（实际 盒='+P('P1').conv['盒']+'）');

// B. 改名为「件」（件走独立块、永不在预设）→ 不得破坏件换算
console.log('\nB. 改名目标为「件」');
seed();
getEl('pack_'+idxOf('盒')).value='件';
api.renamePack(idxOf('盒'));
ok(P('P2').conv['件']===40,
   'B1 盒→件：「件」换算 40 不被覆盖（实际 件='+P('P2').conv['件']+'）');
ok(P('P0').conv['盒']===12,
   'B2 盒→件：源键「盒」不丢失（实际 盒='+P('P0').conv['盒']+'）');

// C. 删除包装：系数为 0 的键不得残留（delPack 只认 >0）
console.log('\nC. 删除包装的残留');
seed();
P('P1').conv['袋']=0;                       // 导入/合并可能带入 0 系数键
api.save('products',api.products);
api.delPack(idxOf('袋'));
ok(!('袋' in P('P1').conv)&&!api.cfg.packPresets.includes('袋'),
   'C1 删除包装「袋」：系数为 0 的残留键一并清除（实际 conv='+JSON.stringify(P('P1').conv)+'）');
seed();
api.delPack(idxOf('袋'));
ok(!api.cfg.packPresets.includes('袋'),
   'C2 回归锁：删除未被使用的包装 → 预设移除（正常路径不变）');

// D. 回归锁：正常改名（无冲突）必须保留系数并贯穿
console.log('\nD. 回归锁：正常改名/删除行为不变');
seed();
const t0=P('P0')._t;
getEl('pack_'+idxOf('盒')).value='盒装';
api.renamePack(idxOf('盒'));
ok(P('P0').conv['盒装']===12&&P('P0').conv['盒']===undefined&&P('P1').conv['盒装']===12,
   'D1 无冲突改名：键改名且系数保留（12）');
ok(P('P0')._t>t0,
   'D2 改名后商品打时间戳，云端同步能带过去');
ok(api.cfg.packPresets.includes('盒装')&&!api.cfg.packPresets.includes('盒'),
   'D3 预设同步更新');
seed();
getEl('pack_'+idxOf('盒')).value='袋';
api.renamePack(idxOf('盒'));
ok(api.cfg.packPresets.includes('盒')&&/已存在同名包装/.test(String(D.__lastAlert||'')),
   'D4 回归锁：改名为已存在的预设名 → 拒绝并提示（实际提示：'+String(D.__lastAlert||'')+'）');

console.log('\n结果: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
