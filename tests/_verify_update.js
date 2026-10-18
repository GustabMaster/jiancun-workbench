// 专项：更新链（checkUpdate/installApp/updateInstallBtn/renderVersionLog 联动 + verCmp 版本比较）。
// 背景：「设置 → 版本更新」里的「下载最新版本」与「安装到桌面」是用户唯二能自己动手升级的入口，此前零覆盖。
//   C（P3，误报+静默降级）：checkUpdate 用 latest!==cur 裸字符串比较。线上部署回滚到旧版，或版本号数字位不同
//     （1.15.3 vs 1.15.27、1.9.0 vs 1.15.27）时，提示「发现新版本 x」并重载到旧构建。同文件的版本日志排序
//     明明已按数字比较（注释还特意写「1.14 > 1.9 > 1.10 不能按字符串比」），唯独更新判断漏了。
// 修：新增 verCmp 数字比较助手（版本日志三处排序一并收敛到它），checkUpdate 按「线上更新/相同/更旧」
//     三分支处理，更旧时明确提示且不自动重载（不静默降级）。
// 假阳性备案（项目铁律：排查先算假阳性）：初读疑「安装按钮标准流程不显示」——beforeinstallprompt 早于面板
//   懒渲染触发、updateInstallBtn 找不到按钮。核实后为假阳性：该按钮在静态 HTML 里（页面加载即在 DOM），
//   事件处理器直接就能显示它；mock 台若按「面板未渲染=不存在」建模会凭空造出缺陷。B 组改为锁定真实路径。
const fs=require('fs');const vm=require('vm');
const SRC=process.argv[2]||'wujin-workbench.html';
const html=fs.readFileSync(SRC,'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
// 与被检源码同版本基准推导测试版本号——升版不换测试（写死版本号会被下一次发版打挂）
const CUR=(html.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)||[])[1]||'0.0.0';
const _seg=CUR.split('.').map(x=>Number(x)||0);
const NEWER=_seg[0]+'.'+_seg[1]+'.'+(_seg[2]+1);                                   // 线上更新一档
const OLDER=_seg[2]>0?(_seg[0]+'.'+_seg[1]+'.'+(_seg[2]-1)):(_seg[0]+'.'+Math.max(0,_seg[1]-1)+'.9'); // 线上回退一档
const OLDMINOR=_seg[0]+'.'+Math.max(0,_seg[1]-1)+'.0';                             // 线上整个次位更旧
const TRAP=_seg[0]+'.'+_seg[1]+'.3';   // 末段单位数：数字上小于双位末段，字符串下反而「更大」——字符串比较的陷阱形态

function makeClassList(){const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),toggle:(c,f)=>{if(f===undefined){s.has(c)?s.delete(c):s.add(c);}else{f?s.add(c):s.delete(c);}},contains:c=>s.has(c)};}
function elStub(tag,onHtml){
  const self={tag:tag||'',value:'',textContent:'',_html:'',children:[],className:'',checked:false,indeterminate:false,disabled:false,
    set innerHTML(v){this._html=v;this.children=[];if(onHtml)onHtml(v);},
    get innerHTML(){return this._html;},
    classList:makeClassList(),addEventListener(){},appendChild(c){this.children.push(c);},removeChild(){},insertBefore(){},replaceChild(){},remove(){},
    setAttribute(){},getAttribute(){return null;},focus(){},scrollIntoView(){},closest(){return elStub();},
    querySelector(){return elStub();},querySelectorAll(){return[];},selectedOptions:[],options:[],click(){},style:{},
    width:0,height:0,getContext(){return {drawImage(){}};},toBlob(cb){cb({type:'image/jpeg'});}};
  return self;
}
// 懒渲染面板按钮（renderVersionLog 输出里才有）；安装按钮是静态 HTML，页面加载即在 DOM
const PANEL_IDS=['btnUpdate'];
const STATIC_IDS={btnInstallApp:'none'};   // 静态元素 id → 初始 display（与静态 HTML 内联一致）
function makeDevice(name){
  const elements={};
  Object.keys(STATIC_IDS).forEach(id=>{const el=elStub('button');el.style.display=STATIC_IDS[id];elements[id]=el;});
  const onHtml=v=>{ // innerHTML 赋值时把片段里的 id 注册成真实存在的元素，并按片段预设 display:none
    let m;const re=/<[a-zA-Z][^>]*\bid="([^"]+)"[^>]*>/g;
    while((m=re.exec(v))){ const id=m[1];
      if(PANEL_IDS.indexOf(id)>=0 && !elements[id]){ const el=elStub('button'); if(/display:\s*none/.test(m[0]))el.style.display='none'; elements[id]=el; }
    }
  };
  const getEl=id=>{ if(id in elements)return elements[id]; if(PANEL_IDS.indexOf(id)>=0)return null; elements[id]=elStub('div',onHtml); return elements[id]; };
  const doc={getElementById:getEl,createElement:(t)=>elStub(t),querySelector:()=>elStub(),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{appendChild(){},addEventListener(){},removeEventListener(){}}};
  const localStore={};
  const localStorage={getItem:k=>k in localStore?localStore[k]:null,setItem:(k,v)=>{localStore[k]=String(v)},removeItem:k=>{delete localStore[k]}};
  const D={ __toasts:[],__timers:[],__reloads:[],__fetches:[],__deletedCaches:[],__promptCalled:false,
    __fetchBody:'',__fetchOk:true,__cacheKeys:['jiancun-shell-v1.15.27','other-cache'] };
  D.document=doc;
  D.localStorage=localStorage;
  const ctx={console,
    setTimeout:(f,ms)=>{D.__timers.push({f:f,ms:ms});return D.__timers.length;},clearTimeout:()=>{},
    setInterval:()=>1,clearInterval:()=>{},
    document:doc,localStorage,alert:(m)=>{D.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,Blob,
    WebSocket:function(){return{readyState:1,send(){},close(){},set onopen(f){},set onmessage(f){},set onclose(f){}};},
    Image:function(){const self=this;this.width=0;Object.defineProperty(this,'src',{set(v){this._src=v;if(self.onload)setTimeout(()=>self.onload(),0);},get(){return this._src;}});},
    FileReader:function(){this.readAsText=()=>{this.result='';if(this.onload)this.onload();};this.readAsDataURL=()=>{this.result='';if(this.onload)this.onload();};},
    btoa:s=>Buffer.from(String(s),'binary').toString('base64'),
    fetch:(url,opts)=>{D.__fetches.push({url:String(url),cache:opts&&opts.cache});
      if(D.__fetchOk)return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(D.__fetchBody)});
      return Promise.reject(new Error('offline'));},
    confirm:()=>true,
    location:{protocol:'https:',href:'https://demo.example/index.html',reload:function(f){D.__reloads.push(f===true);}},
    caches:{keys:()=>Promise.resolve(D.__cacheKeys.slice()),delete:k=>{D.__deletedCaches.push(k);return Promise.resolve(true);}},
    navigator:{serviceWorker:{register:()=>Promise.resolve({update:()=>Promise.resolve()}),getRegistration:()=>Promise.resolve({update:()=>Promise.resolve()})}},
    __lastAlert:''};
  ctx.globalThis=ctx;ctx.window=ctx;
  D.location=ctx.location;
  vm.createContext(ctx);
  const shim=`
;globalThis.__api={
  checkUpdate, installApp, updateInstallBtn, renderVersionLog,
  verCmp: (typeof verCmp!=='undefined'?verCmp:null),
  save, load, renderAll
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  ctx.toast=function(m,k){D.__toasts.push({m:String(m),k:k});};
  ctx.renderAll=function(){};
  return {ctx:ctx,__api:ctx.__api,D:D,document:doc,
    set deferredPrompt(v){ctx._deferredPrompt=v;}, get deferredPrompt(){return ctx._deferredPrompt;}};
}

const M=makeDevice('update');
const api=M.__api;const D=M.D;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }
const tick=()=>new Promise(r=>setTimeout(r,20));
const lastToast=()=>D.__toasts.length?D.__toasts[D.__toasts.length-1]:null;
function flushTimers(){const t=D.__timers.slice();D.__timers.length=0;t.forEach(x=>{try{x.f();}catch(e){}});}
function pageWith(v){ return '<html><body><script>var APP_VERSION=\''+v+'\';<\/script></body></html>'; }
async function runCheck(body,ok2){
  D.__fetchBody=(body===undefined?'<html>none</html>':body); D.__fetchOk=(ok2!==false);
  D.__reloads.length=0;D.__deletedCaches.length=0;D.__toasts.length=0;D.__timers.length=0;D.__fetches.length=0;
  api.checkUpdate(); await tick();
}

(async function main(){
console.log('更新链 · 检查更新 / 一键安装 / 面板联动专项\n');

// ===== A6：面板未渲染时刷新按钮状态不能抛错（既有路径，最先跑：此刻按钮不存在）=====
console.log('A6 updateInstallBtn 边界');
ok((function(){try{api.updateInstallBtn();return true;}catch(e){return false;}})(),'A6 面板未渲染时刷新安装按钮状态不抛错');

// ===== C 组：checkUpdate 版本比较（C1/C2/C6/C7/C8 锁既有，C3/C4/C5 为核心缺陷）=====
console.log('C checkUpdate 版本比较');
{
  await runCheck(pageWith(NEWER));
  const t=lastToast();
  ok(!!t && t.m.indexOf('发现新版本 '+NEWER)>=0,'C1a 线上更新 → 提示发现新版本');
  ok(D.__timers.length===1,'C1b 安排重载应用新版本');
  flushTimers();
  ok(D.__reloads.length===1,'C1b2 重载回调可执行');
  ok(D.__deletedCaches.indexOf('jiancun-shell-v1.15.27')>=0,'C1c 清理离线壳缓存');
  ok(D.__deletedCaches.indexOf('other-cache')<0,'C1d 不误删无关缓存');
  ok(D.__fetches.length===1 && /^index\.html\?_t=\d+$/.test(D.__fetches[0].url) && D.__fetches[0].cache==='no-store','C1e 拉取带时间戳且不写缓存（v1.15.13 锁定）');
}
{
  await runCheck(pageWith(CUR));
  const t=lastToast();
  ok(!!t && t.m.indexOf('当前已是最新版本')>=0,'C2a 线上相同 → 提示已是最新');
  ok(D.__timers.length===0,'C2b 不安排重载');
}
{
  await runCheck(pageWith(OLDER));   // 线上回滚到旧版：绝不能再提示「发现新版本」并重载
  const t=lastToast();
  ok(!!t && t.m.indexOf('发现新版本')<0,'C3a 线上更旧 → 不得误报发现新版本（未修：误报并降级，实际 '+(t?t.m:'无提示')+'）');
  ok(D.__timers.length===0,'C3b 线上更旧 → 不安排重载（未修：重载到旧构建）');
  ok(!!t && t.m.indexOf('旧')>=0 && t.m.indexOf(OLDER)>=0,'C3c 提示说清线上更旧并带版本号');
}
{
  await runCheck(pageWith(TRAP));   // 字符串比较陷阱：数字上末段 3 < 双位末段，线上其实更旧
  const t=lastToast();
  ok(!!t && t.m.indexOf('发现新版本')<0,'C4a 末段单位数（'+TRAP+'）线上更旧（数字位陷阱）→ 不误报（未修：误报，实际 '+(t?t.m:'无提示')+'）');
  ok(D.__timers.length===0,'C4b 不安排重载');
}
{
  await runCheck(pageWith(OLDMINOR));    // 1.14 < 1.15，字符串下 "1.14" 却小于 "1.15"——两类陷阱都要防
  const t=lastToast();
  ok(!!t && t.m.indexOf('发现新版本')<0,'C5a 次位更旧（'+OLDMINOR+'）→ 不误报（未修：误报，实际 '+(t?t.m:'无提示')+'）');
  ok(D.__timers.length===0,'C5b 不安排重载');
}
{
  await runCheck('<html>没有版本号</html>');
  const t=lastToast();
  ok(!!t && t.m.indexOf('已刷新页面')>=0,'C6a 拉到的页面无版本号 → 刷新兜底');
  ok(D.__timers.length===1,'C6b 安排重载');
}
{
  await runCheck(undefined,false);     // 断网
  const t=lastToast();
  ok(!!t && t.m.indexOf('联网后即为最新')>=0,'C7a fetch 失败 → 提示联网后最新');
  ok(D.__timers.length===1,'C7b 安排重载');
}
{
  D.location.protocol='http:';
  await runCheck(pageWith(NEWER));
  const t=lastToast();
  ok(!!t && t.m.indexOf('云端链接')>=0,'C8a 非 https → 引导去云端链接');
  ok(D.__timers.length===1,'C8b 安排重载');
  ok(D.__fetches.length===0,'C8c 非 https 不发起拉取');
  D.location.protocol='https:';
}
console.log('C9 verCmp 版本比较助手（新助手直查；未修代码无此函数）');
{
  const vc=api.verCmp;
  ok(!!vc,'C9a verCmp 存在（未修：undefined）');
  if(vc){
    ok(vc('1.15.28','1.15.27')>0,'C9b 1.15.28 新于 1.15.27');
    ok(vc('1.15.27','1.15.28')<0,'C9c 1.15.27 旧于 1.15.28');
    ok(vc('1.15.27','1.15.27')===0,'C9d 相同为 0');
    ok(vc('1.15.9','1.15.10')<0,'C9e 数字位比较：9 旧于 10（字符串下会反）');
    ok(vc('1.14.0','1.9.0')>0,'C9f 次位比较：1.14 新于 1.9（字符串下会反）');
    ok(vc('1.15','1.15.0')===0,'C9g 缺段按 0 补：1.15 等于 1.15.0');
    ok(vc('','1.0.0')<0 && vc('abc','1.0.0')<0,'C9h 坏数据按 0 处理不NaN');
  }
}

// ===== B 组：安装按钮状态刷新（真实路径锁定；初读疑云已按假阳性备案）=====
console.log('B 安装按钮状态刷新');
{
  const b=D.document.getElementById('btnInstallApp');
  ok(!!b && b.style.display==='none','B1a 静态安装按钮初始隐藏（HTML 内联 display:none）');
  M.deferredPrompt={prompt:function(){D.__promptCalled=true;},userChoice:Promise.resolve({outcome:'accepted'})};
  api.updateInstallBtn();                       // beforeinstallprompt 处理器：按钮本就在静态 DOM，直接显示
  ok(!!b && b.style.display!=='none','B1b 安装条件到达 → 按钮显示（真实路径：静态 DOM 无需等面板渲染）');
  ok(!!b && b.textContent.indexOf('安装到桌面')>=0,'B1c 按钮文案正确');
  M.deferredPrompt=null;
  api.updateInstallBtn();                       // 模拟 appinstalled
  ok(!!b && b.style.display==='none','B2 无安装条件 → 按钮隐藏');
}

// ===== A 组：installApp 安装流程 =====
console.log('A installApp 安装流程');
{
  M.deferredPrompt=null;D.__promptCalled=false;D.__toasts.length=0;
  api.installApp();
  ok(!D.__promptCalled,'A1a 无安装条件 → 不弹原生框');
  ok(!!lastToast() && lastToast().m.indexOf('添加到主屏幕')>=0,'A1b 引导用浏览器菜单安装');
}
{
  let prompted=false;
  M.deferredPrompt={prompt:function(){prompted=true;},userChoice:Promise.resolve({outcome:'accepted'})};
  D.__toasts.length=0;
  api.renderVersionLog();
  api.installApp();
  ok(prompted,'A2a 有安装条件 → 调原生安装框');
  await tick();
  ok(M.deferredPrompt===null,'A2b 流程结束清空待安装事件');
  ok(!!lastToast() && lastToast().m.indexOf('已开始安装')>=0,'A2c 用户接受 → 提示已开始安装');
  ok(D.document.getElementById('btnInstallApp').style.display==='none','A2d 流程结束按钮隐藏');
}
{
  M.deferredPrompt={prompt:function(){},userChoice:Promise.resolve({outcome:'dismissed'})};
  D.__toasts.length=0;
  api.installApp();
  await tick();
  ok(M.deferredPrompt===null,'A3a 用户取消 → 也清空待安装事件');
  ok(!lastToast() || lastToast().m.indexOf('已开始安装')<0,'A3b 用户取消 → 不提示已开始安装');
}
{
  M.deferredPrompt={prompt:function(){throw new Error('x');},userChoice:Promise.resolve({outcome:'accepted'})};
  D.__toasts.length=0;
  api.installApp();
  ok(!!lastToast() && lastToast().m.indexOf('安装启动失败')>=0,'A4 原生框启动抛错 → 兜底提示');
}

// ===== C10：面板已渲染时 checkUpdate 的按钮状态复原 =====
console.log('C10 按钮状态复原');
{
  api.renderVersionLog();
  const b=D.document.getElementById('btnUpdate');
  await runCheck(pageWith(CUR));
  ok(!!b && b.disabled===false,'C10a 检查结束按钮恢复可用');
  ok(!!b && b.textContent==='下载最新版本','C10b 按钮文案复原');
}

// ===== D 组：renderVersionLog 面板结构锁定 =====
console.log('D renderVersionLog 面板结构');
{
  api.renderVersionLog();
  const box=D.document.getElementById('versionLog');
  const h=box?box.innerHTML:'';
  ok(/id="btnUpdate"[^>]*onclick="checkUpdate\(\)"/.test(h),'D1a 面板含检查更新按钮且绑定正确');
  ok(h.indexOf('点一下就从线上拉取')>=0,'D1b 面板含更新按钮说明文字');
  ok(h.indexOf('v'+CUR)>=0,'D1c 面板列出当前版本');
  let threw=false;try{api.renderVersionLog();}catch(e){threw=true;}
  ok(!threw,'D2 重复渲染不抛错');
}

console.log('\n合计: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
