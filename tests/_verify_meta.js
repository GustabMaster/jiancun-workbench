// 回归：分类/规格/包装 集中预设（仿库存位置）的可编辑化
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
  ctx.fetch=(url,opts)=>{const u=String(url);const m=u.match(/book=eq\.([^&]+)/);const book=m?decodeURIComponent(m[1]):'__default__';const method=(opts&&opts.method)||'GET';ctx.__fetchLog.push({method,storage:u.indexOf('/storage/v1/')>=0});
if(method==='GET'){const rec=cloudStore[book];const rows=rec?[{data:rec.data,updated_at:rec.updated_at||new Date().toISOString()}]:[];return Promise.resolve({json:()=>Promise.resolve(rows),ok:true});}if(method==='PUT'){const body=opts&&opts.body?JSON.parse(opts.body):{};const d=body.data||{};cloudStore[book]={data:d,updated_at:body.updated_at||new Date().toISOString()};return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}if(method==='DELETE'){delete cloudStore[book];return Promise.resolve({json:()=>Promise.resolve({}),ok:true});}return Promise.resolve({json:()=>Promise.resolve([]),ok:true});};
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  get cash(){return cash}, get flow(){return flow},
  get parties(){return parties}, get ar(){return ar},
  get stockLog(){return stockLog}, get delLog(){return delLog},
  migrateMetaPresets, catSelectHTML, specSelectHTML, packSelectHTML,
  onCatChange, onSpecChange, onPackChange,
  addCatSetting, renameCat, delCat,
  addSpecSetting, renameSpec, delSpec,
  addPackSetting, renamePack, delPack,
  renderCatMgr, renderSpecMgr, renderPackMgr,
  renderProductMeta, addProduct, save
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-meta'});
  ctx.openModal=function(){};
  return {api:ctx.__api,ctx,getEl};
}

let pass=0,fail=0,found=[];
function ok(c,msg){if(c){pass++;}else{fail++;found.push(msg);console.log('  FAIL '+msg);}}

const D=makeDevice('D');const api=D.api,ctx=D.ctx;

function seedProducts(){
  api.products=[
    {id:'P0',name:'螺丝',cat:'紧固件',spec:'M8',unit:'个',conv:{'件':40,盒:4},loc:'1库',_t:1,stock:0,safe:10,cost:1,wholesale:2,retail:3,price:3,note:''},
    {id:'P1',name:'扳手',cat:'工具',spec:'12寸',unit:'个',conv:{袋:50},loc:'2库',_t:1,stock:0,safe:5,cost:2,wholesale:3,retail:5,price:5,note:''},
    {id:'P2',name:'电钻',cat:'工具',spec:'',unit:'个',conv:{'件':1},loc:'3库',_t:1,stock:0,safe:2,cost:50,wholesale:60,retail:80,price:80,note:''}
  ];
}

console.log('\n=== M1. 存量迁移：分类/规格/包装收进集中预设（包装排除「件」）===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');   // 允许重跑迁移
  api.migrateMetaPresets();
  const c=api.cfg;
  ok(JSON.stringify(c.catPresets.slice().sort())===JSON.stringify(['工具','紧固件']),'M1a 分类预设=紧固件,工具 (得到 '+JSON.stringify(c.catPresets)+')');
  ok(JSON.stringify(c.specPresets.filter(Boolean).sort())===JSON.stringify(['12寸','M8']),'M1b 规格预设=12寸,M8 (得到 '+JSON.stringify(c.specPresets)+')');
  ok(JSON.stringify(c.packPresets.slice().sort())===JSON.stringify(['盒','袋']),'M1c 包装预设=袋,盒（排除「件」） (得到 '+JSON.stringify(c.packPresets)+')');
  ok(c.catPresets.includes('工具')&&!c.catPresets.includes(''),'M1d 无空分类');
}

console.log('\n=== M2. 下拉 HTML 生成（含预设选项 + 旧值兜底 + 新增）===');
{
  const ch=api.catSelectHTML('紧固件');
  ok(/value="紧固件"[^>]*selected/.test(ch),'M2a 分类下拉选中当前值');
  ok(/＋ 新增分类/.test(ch),'M2b 分类下拉含新增项');
  const sh=api.specSelectHTML('不存在规格');
  ok(/不存在规格（旧值）/.test(sh),'M2c 规格下拉旧值兜底');
  const ph=api.packSelectHTML('盒');
  ok(/value="盒"[^>]*selected/.test(ph)&&/＋ 新增包装/.test(ph),'M2d 包装下拉选中+新增');
  const pe=api.packSelectHTML('旧包装');
  ok(/旧包装（旧值）/.test(pe),'M2e 包装下拉旧值兜底（如跨设备改名）');
}

console.log('\n=== M3. 分类：新增 / 改名级联 / 删除级联 ===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');
  api.migrateMetaPresets();
  // 新增
  ctx.__promptRet='电动'; api.addCatSetting();
  ok(api.cfg.catPresets.includes('电动'),'M3a 新增分类写入预设');
  // 改名级联
  const i0=api.cfg.catPresets.indexOf('工具');
  D.getEl('cat_'+i0).value='五金工具';
  api.renameCat(i0);
  ok(api.cfg.catPresets[i0]==='五金工具','M3b 预设改名成功');
  ok(api.products.filter(p=>p.cat==='五金工具').length===2,'M3c 2 个商品分类同步改名');
  ok(api.products.every(p=>p.cat!=='工具'),'M3d 旧名已无残留');
  // 删除级联
  const i1=api.cfg.catPresets.indexOf('紧固件');
  api.delCat(i1);
  ok(!api.cfg.catPresets.includes('紧固件'),'M3e 预设删除成功');
  ok(api.products.find(p=>p.id==='P0').cat==='','M3f 使用该分类的商品分类清空');
  ok(api.products.find(p=>p.id==='P0')._t>1,'M3g 清空打了同步戳');
}

console.log('\n=== M4. 规格：新增 / 改名级联 / 删除级联 ===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');
  api.migrateMetaPresets();
  ctx.__promptRet='14寸'; api.addSpecSetting();
  ok(api.cfg.specPresets.includes('14寸'),'M4a 新增规格');
  const i0=api.cfg.specPresets.indexOf('M8');
  D.getEl('spec_'+i0).value='M10'; api.renameSpec(i0);
  ok(api.cfg.specPresets[i0]==='M10','M4b 规格改名');
  ok(api.products.find(p=>p.id==='P0').spec==='M10','M4c 商品规格同步');
  const i1=api.cfg.specPresets.indexOf('12寸');
  api.delSpec(i1);
  ok(api.products.find(p=>p.id==='P1').spec==='','M4d 删除规格后商品规格清空');
}

console.log('\n=== M5. 包装：新增 / 改名级联（保留系数）/ 删除级联 ===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');
  api.migrateMetaPresets();
  ctx.__promptRet='箱'; api.addPackSetting();
  ok(api.cfg.packPresets.includes('箱'),'M5a 新增包装');
  const i0=api.cfg.packPresets.indexOf('盒');
  D.getEl('pack_'+i0).value='盒装'; api.renamePack(i0);
  ok(api.cfg.packPresets[i0]==='盒装','M5b 包装改名');
  const p0=api.products.find(x=>x.id==='P0');
  ok(p0.conv['盒装']===4 && p0.conv['盒']===undefined,'M5c 商品 conv 键改名且系数保留(4)');
  const i1=api.cfg.packPresets.indexOf('袋');
  api.delPack(i1);
  ok(!('袋' in api.products.find(x=>x.id==='P1').conv),'M5d 删除包装后商品 conv 该键移除');
  // 「件」不被纳入包装预设，互不影响
  ok(!api.cfg.packPresets.includes('件'),'M5e 「件」不在包装预设中');
  ok(api.products.find(x=>x.id==='P0').conv['件']===40,'M5f 「件」换算独立保留');
}

console.log('\n=== M6. 新增商品表单读取路径（重构后仍能读到分类/规格）===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');
  api.migrateMetaPresets();
  D.getEl('p_name').value='测试件';
  D.getEl('p_cat').value='工具';
  D.getEl('p_spec').value='M8';
  api.addProduct();
  const np=api.products[api.products.length-1];
  ok(np.cat==='工具'&&np.spec==='M8','M6a 新增商品分类/规格正确读取');
  ok(np.name==='测试件','M6b 商品名正确');
}

console.log('\n=== M7. 设置面板 mgr 渲染不抛（懒加载路径）===');
{
  seedProducts();
  ctx.localStorage.removeItem('wb_wujin_mig_meta_presets');
  api.migrateMetaPresets();
  let threw=null;
  try{ api.renderCatMgr(); api.renderSpecMgr(); api.renderPackMgr(); api.renderProductMeta(); }catch(e){threw=e;}
  ok(!threw,'M7a 三个 mgr + renderProductMeta 不抛'+(threw?(' → '+threw.message):''));
}

console.log('\n=== 结果 ===');
console.log('PASS '+pass+' / FAIL '+fail);
if(fail)process.exit(1);
