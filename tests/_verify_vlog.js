// 版本更新说明面板：分组折叠 + 当前版本标记 + 30/31 已合并进 40
const fs=require('fs');const vm=require('vm');
const SRC=process.argv[2]||'wujin-workbench.html';
const html=fs.readFileSync(SRC,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];

function elStub(t){
  const s={tag:t||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,
    set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this._html;},
    classList:(()=>{const c=new Set();return{add:x=>c.add(x),remove:x=>c.delete(x),toggle:(x,f)=>{if(f)c.add(x);else c.delete(x);},contains:x=>c.has(x)};})(),
    addEventListener(){},appendChild(){},removeChild(){},insertBefore(){},replaceChild(){},remove(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub();},
    querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return{drawImage(){}};},toBlob(cb){cb({});}};
  return s;
}
const els={};
const doc={getElementById:id=>{if(!els[id])els[id]=elStub();return els[id];},createElement:t=>elStub(t),
  querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},body:{appendChild(){},addEventListener(){}}};
const ls={};
const ctx={console,setTimeout:f=>f?setTimeout(f,0):0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
  document:doc,localStorage:{getItem:k=>k in ls?ls[k]:null,setItem:(k,v)=>{ls[k]=String(v);},removeItem:k=>{delete ls[k];}},
  alert(){},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
  WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
  Image:function(){this.width=0;this.height=0;},FileReader:function(){}};
ctx.globalThis=ctx;ctx.window=ctx;
ctx.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),ok:true});
vm.createContext(ctx);
const shim=';globalThis.__api={renderVersionLog,toggleVlog,toggleVlogAll,get VERSION_LOG(){return VERSION_LOG},get APP_VERSION(){return APP_VERSION}};';
vm.runInContext(script+shim,ctx,{filename:'vlog'});
const api=ctx.__api;

let pass=0,fail=0;
const ok=(c,m)=>{ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} };

console.log('版本更新说明面板 · 显示优化专项\n');

api.renderVersionLog();
const snap=els.versionLog.innerHTML;
const n=(re)=>(snap.match(re)||[]).length;

console.log('A. 分组折叠结构');
const groupCount=n(/id="vs_[0-9]+"/g);
ok(groupCount>0 && groupCount<api.VERSION_LOG.length,'51 条版本已归并为 '+groupCount+' 组（少于总条数，不再平铺）');
ok(n(/vlog-series open/g)===1,'默认只展开 1 组（当前版本所在组）');
ok(snap.indexOf('展开全部')>=0 && snap.indexOf('只看当前版本')>=0,'提供「展开全部 / 只看当前版本」快捷按钮');
ok(snap.indexOf('已按大版本归为 '+groupCount+' 组')>=0,'显示分组统计提示');

console.log('B. 当前版本标记');
// 按徽标元素计数（不能数文字：更新说明正文里也可能提到这几个字）
ok(n(/class="vlog-cur"/g)===1,'当前版本有且仅有 1 个「正在使用」徽标');
ok(snap.indexOf('v'+api.APP_VERSION)>=0,'面板标明正在使用的版本号 v'+api.APP_VERSION);
const curIdx=snap.indexOf('正在使用');
const nearCur=snap.slice(Math.max(0,curIdx-260),curIdx);
ok(nearCur.indexOf('v'+api.APP_VERSION)>=0,'「正在使用」标记紧邻当前版本 v'+api.APP_VERSION);

console.log('C. 30 / 31 已合并进 40');
// 判定「已无独立条目」要看数据里是否还有该版本，而非正文是否提到（说明文字会主动提及）
ok(!api.VERSION_LOG.some(r=>r.v==='1.13.30'),'版本列表中已无 1.13.30 独立条目');
ok(!api.VERSION_LOG.some(r=>r.v==='1.13.31'),'版本列表中已无 1.13.31 独立条目');
ok(n(/vlog-v">v1\.13\.3[01]</g)===0,'更新说明中不再渲染 1.13.30 / 1.13.31 的条目卡片');
const i140=snap.indexOf('v1.14.0');
const seg140=snap.slice(i140, i140+2600);
ok(seg140.indexOf('术语统一')>=0,'1.14.0 条目继承了 1.13.30 的「术语统一」内容');
ok(seg140.indexOf('规格随商品名推荐')>=0,'1.14.0 条目继承了 1.13.31 的「规格跟名称走」内容');
ok(seg140.indexOf('增量逻辑')>=0,'1.14.0 条目继承了 1.13.30 的「库存增量」修复');
ok(seg140.indexOf('自动生成入库明细')>=0,'1.14.0 条目继承了 1.13.31 的「初始入库台账」修复');

console.log('C2. 文案规范（面向使用者的客观表述）');
// 更新说明是给用户看的：不使用「你 / 您」这类代称，改用客观表述
const withYou=api.VERSION_LOG.filter(r=>/你|您/.test((r.desc||'')+(r.tag||'')));
ok(withYou.length===0,'全部 '+api.VERSION_LOG.length+' 条更新说明均不含「你 / 您」代称'+(withYou.length?('（命中：'+withYou.map(r=>r.v).join('、')+'）'):''));
const avg=Math.round(api.VERSION_LOG.reduce((s,r)=>s+(r.desc||'').length,0)/api.VERSION_LOG.length);
ok(avg<=110,'每条平均 '+avg+' 字，控制在 110 字以内（精简易读）');

console.log('D. 分组内排序（新→旧）');
// 当前大版本组从 APP_VERSION 动态推导，避免每次升版都要改测试
const _curMajor='v'+api.APP_VERSION.split('.').slice(0,2).join('.')+'.x';
const seg=snap.slice(snap.indexOf(_curMajor), snap.indexOf(_curMajor)+1600);
const vs=(seg.match(/vlog-v">v[0-9.]+/g)||[]).map(x=>x.split('>')[1]);
ok(vs.length>=2 && vs[0]==='v'+api.APP_VERSION,_curMajor+' 组内最新版本 v'+api.APP_VERSION+' 排在最前（实际：'+vs.slice(0,3).join(' / ')+'）');

console.log('E. 大版本倒序（新大版本在前）');
const heads=(snap.match(/vlog-series-v">v[0-9.]+x/g)||[]).map(x=>x.split('>')[1]);
ok(heads[0]===_curMajor,'首个分组是 '+_curMajor+'（实际：'+heads[0]+'）');
const i9=heads.indexOf('v1.9.x'), i10=heads.indexOf('v1.10.x');
ok(i9>=0 && i10>=0 && i10<i9,'v1.10.x 排在 v1.9.x 之前（按数字而非字符串排序）');

console.log('F. 折叠交互');
// 用渲染快照还原各组初始展开态（innerHTML 在桩里只是字符串，不生成子元素）
const openInit=new Set();
let mi,re1=/id="vs_([0-9]+)"[^>]*class="vlog-series([^"]*)"/g, re2=/class="vlog-series([^"]*)" id="vs_([0-9]+)"/g;
while((mi=re1.exec(snap))){ if(mi[2].indexOf('open')>=0) openInit.add(+mi[1]); }
while((mi=re2.exec(snap))){ if(mi[1].indexOf('open')>=0) openInit.add(+mi[2]); }
for(let i=0;i<groupCount;i++){ const e=doc.getElementById('vs_'+i); e.classList.toggle('open', openInit.has(i)); }
const realOpen=()=>{ let c=0; for(let i=0;i<groupCount;i++){ if(els['vs_'+i]&&els['vs_'+i].classList.contains('open')) c++; } return c; };
ok(realOpen()===1,'初始仅 1 组展开');
api.toggleVlog(1); ok(realOpen()===2,'点击第 2 组标题 → 展开（2 组）');
api.toggleVlog(1); ok(realOpen()===1,'再点一次 → 收起（回到 1 组）');
api.toggleVlogAll(true); ok(realOpen()===groupCount,'「展开全部」→ 全部 '+groupCount+' 组展开');
api.toggleVlogAll(false); ok(realOpen()===1,'「只看当前版本」→ 只剩当前版本组');

console.log('\n==== 版本面板专项 结果：'+pass+' PASS / '+fail+' FAIL ====');
process.exit(fail?1:0);
