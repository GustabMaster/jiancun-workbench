// 专项：Excel/CSV 导入族 + OCR 图像预处理族（零覆盖区第 24 轮）
// 背景：
//  D1 removeTableLines 纵线检测读的是横线 pass 刚涂白的缓冲：横纵交叉处纵线连续段
//     被打断，maxRun 跌到 72% 阈值以下 → 有横线的表格纵线全部漏删（无横线的纯竖线
//     表格反而正常，故缺陷潜伏）。修法：检测一律读原图快照，与 despeckle 同构。
//  D2 xlsx 导入不解 XML 实体：parseSharedStrings/parseSheet 原样返回 &amp; &lt; &#39; 等，
//     商品名「螺丝 & 螺母」入库变成「螺丝 &amp; 螺母」，静默数据损坏。
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
  const ctx={console,setTimeout:(f)=>{return f?setTimeout(f,0):0;},clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},document:doc,localStorage,alert:(m)=>{ctx.__lastAlert=m;},URL,Math,JSON,Date,Map,Set,Promise,TextEncoder,TextDecoder,Blob,
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
  parseSharedStrings, parseSheet, colToIndex, unzip, xlsxToRows, xmlUnesc,
  removeTableLines, adaptiveBinarize, despeckle, csvToTextRows, tableToOtable
};`;
  vm.runInContext(script+shim,ctx,{filename:'wujin-'+name});
  return ctx;
}

const D=makeDevice('import');
const api=D.__api;
let pass=0,fail=0;
function ok(c,m){ if(c){pass++;console.log('  PASS '+m);} else {fail++;console.log('  FAIL '+m);} }

/* ---------- zip 构造器（method 0=stored / 8=deflate-raw） ---------- */
function zipEntry(name,data,method){
  const enc=new TextEncoder(); const nb=enc.encode(name);
  const h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0,true);
  h.setUint16(8,method,true); h.setUint16(10,0,true); h.setUint16(12,0,true);
  h.setUint32(14,0,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true);
  h.setUint16(26,nb.length,true); h.setUint16(28,0,true);
  return [new Uint8Array(h.buffer),nb,data];
}
async function deflateRaw(bytes){
  const cs=new CompressionStream('deflate-raw');
  const w=cs.writable.getWriter(); w.write(bytes); w.close();
  const r=cs.readable.getReader(); const chunks=[]; let total=0;
  while(true){ const {done,value}=await r.read(); if(done)break; chunks.push(value); total+=value.length; }
  const out=new Uint8Array(total); let o=0; for(const c of chunks){ out.set(c,o); o+=c.length; }
  return out;
}
function concat(parts){
  let total=0; parts.forEach(p=>total+=p.length);
  const out=new Uint8Array(total); let o=0; parts.forEach(p=>{out.set(p,o);o+=p.length;});
  return out;
}

/* ---------- 图像构造器 ---------- */
function mkImg(w,h,fill){
  const px=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++){ px[i*4]=px[i*4+1]=px[i*4+2]=fill; px[i*4+3]=255; }
  return px;
}
function setPx(px,w,x,y,v){ const i=(y*w+x)*4; px[i]=px[i+1]=px[i+2]=v; }
function getPx(px,w,x,y){ return px[(y*w+x)*4]; }
function hline(px,w,x0,x1,y,v){ for(let x=x0;x<=x1;x++) setPx(px,w,x,y,v); }
function vline(px,w,h,x,y0,y1,v){ for(let y=y0;y<=y1;y++) setPx(px,w,x,y,v); }

(async function main(){

console.log('导入族 + OCR 图像预处理族专项（第 24 轮）\n');

/* ============ A. xlsx XML 实体解码 ============ */
console.log('A. xlsx 实体解码');

// A1 parseSharedStrings 直接测
{
  const ss=api.parseSharedStrings('<sst><si><t>螺丝 &amp; 螺母</t></si><si><t>A&lt;B&gt;C &quot;D&quot; &#39;E&#39;</t></si><si><r><t>富</t></r><r><t>文本</t></r></si><si><t>plain</t></si><si><t>&#x4E2D;&#x6587;</t></si></sst>');
  ok(ss.length===5,'A0 解析出 5 个共享字符串（实际 '+ss.length+'）');
  ok(ss[0]==='螺丝 & 螺母','A1 &amp; 解码为 &（实际：'+ss[0]+'；历史缺陷：原样返回 &amp;）');
  ok(ss[1]==='A<B>C "D" \'E\'','A2 &lt;/&gt;/&quot;/&#39; 混合解码（实际：'+ss[1]+'）');
  ok(ss[2]==='富文本','A3 富文本多 run 拼接不受影响（实际：'+ss[2]+'）');
  ok(ss[3]==='plain','A4 无实体原文通过（实际：'+ss[3]+'）');
  ok(ss[4]==='中文','A5 &#x 十六进制数字实体解码（实际：'+ss[4]+'）');
}

// A1b xmlUnesc 直接测：命名/数字实体、null 兜底、越界码点原样返回
{
  ok(api.xmlUnesc('a&#38;b&#x26;c')==='a&b&c','A1b1 十进制与十六进制数字实体（实际：'+api.xmlUnesc('a&#38;b&#x26;c')+'）');
  ok(api.xmlUnesc(null)===''&&api.xmlUnesc(undefined)==='','A1b2 null/undefined 兜底为空串');
  ok(api.xmlUnesc('&#x110000;')==='&#x110000;','A1b3 越界码点原样返回不抛异常（实际：'+api.xmlUnesc('&#x110000;')+'）');
  ok(api.xmlUnesc('&unknown;')==='&unknown;','A1b4 未知实体原样返回');
}

// A2 parseSheet 直接测：inlineStr / t=str / 数字 三个分支；shared 分支不得二次解码
{
  const shared=['共享 & 名'];
  const xml='<sheetData><row r="1">'
    +'<c r="A1" t="s"><v>0</v></c>'
    +'<c r="B1" t="inlineStr"><is><t>行内 &lt;标签&gt;</t></is></c>'
    +'<c r="C1"><v>42</v></c>'
    +'<c r="D1" t="str"><v>公式 &amp; 结果</v></c>'
    +'</row></sheetData>';
  const rows=api.parseSheet(xml,shared);
  const byCol={}; (rows[0]||[]).forEach(c=>{byCol[c.col]=c.val;});
  ok(rows.length===1&&rows[0].length===4,'A6 一行 4 单元格（实际 '+(rows[0]||[]).length+'）');
  ok(byCol[0]==='共享 & 名','A7 shared 分支直通（已由 parseSharedStrings 解码，禁二次解码）（实际：'+byCol[0]+'）');
  ok(byCol[1]==='行内 <标签>','A8 inlineStr 分支解码实体（实际：'+byCol[1]+'；历史缺陷：行内 &lt;标签&gt;）');
  ok(byCol[2]==='42','A9 数字单元格不受影响（实际：'+byCol[2]+'）');
  ok(byCol[3]==='公式 & 结果','A10 t=str 公式结果分支解码实体（实际：'+byCol[3]+'）');
}

// A3 xlsxToRows 端到端（stored zip）：含「禁止二次解码」锁
{
  const enc=new TextEncoder();
  const ssXml='<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    +'<si><t>螺丝 &amp; 螺母</t></si>'
    +'<si><t>A&amp;amp;B</t></si>'   // 单元格真实文本就是「A&amp;B」，只应解码一次
    +'<si><t>普通名字</t></si>'
    +'</sst>';
  const sheetXml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    +'<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>3</v></c><c r="C1"><v>10</v></c><c r="D1"><v>30</v></c></row>'
    +'<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>5</v></c></row>'
    +'<row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3"><v>8</v></c></row>'
    +'</sheetData></worksheet>';
  const buf=concat([
    ...zipEntry('[Content_Types].xml','<Types/>',0),
    ...zipEntry('xl/sharedStrings.xml',enc.encode(ssXml),0),
    ...zipEntry('xl/worksheets/sheet1.xml',enc.encode(sheetXml),0)
  ]);
  const rows=await api.xlsxToRows(buf);
  ok(rows.length===3,'A11 读出 3 行（实际 '+rows.length+'）');
  ok(rows[0][0]==='螺丝 & 螺母','A12 端到端：名称实体解码（实际：'+rows[0][0]+'）');
  ok(rows[0][1]==='3'&&rows[0][3]==='30','A13 端到端：数量/金额列正确（实际：'+rows[0][1]+'/'+rows[0][3]+'）');
  ok(rows[1][0]==='A&amp;B','A14 禁二次解码：单元格文本「A&amp;B」只解一次（实际：'+rows[1][0]+'）');
  ok(rows[2][0]==='普通名字','A15 无实体名称回归（实际：'+rows[2][0]+'）');
  // 经 tableToOtable 落到待确认表
  const otr=api.tableToOtable(rows);
  ok(otr.length===3&&otr[0].name==='螺丝 & 螺母'&&otr[0].qty==='3'&&otr[0].amount==='30',
     'A16 解码后名称经 tableToOtable 无损落入待确认表（实际：'+(otr[0]&&otr[0].name)+'）');
}

// A4 xlsxToRows 端到端（deflate zip）：覆盖 unzip method 8 + inflateRaw 通道
{
  const enc=new TextEncoder();
  const ssXml='<sst><si><t>压缩 &amp; 通道</t></si></sst>';
  const sheetXml='<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>2</v></c></row></sheetData></worksheet>';
  const buf=concat([
    ...zipEntry('xl/sharedStrings.xml',await deflateRaw(enc.encode(ssXml)),8),
    ...zipEntry('xl/worksheets/sheet1.xml',await deflateRaw(enc.encode(sheetXml)),8)
  ]);
  const rows=await api.xlsxToRows(buf);
  ok(rows.length===1&&rows[0][0]==='压缩 & 通道','A17 deflate 压缩包解压+实体解码（实际：'+(rows[0]&&rows[0][0])+'）');
}

/* ============ B. removeTableLines 纵线 ============ */
console.log('\nB. removeTableLines 纵线涂白');

// B1 纯竖线表格（无横线）：纵线必须被整列涂白（回归锁）
{
  const w=60,h=40; const px=mkImg(w,h,255);
  vline(px,w,h,20,0,h-1,0);
  vline(px,w,h,45,0,h-1,0);
  api.removeTableLines(px,w,h);
  let colClean=true; for(let y=0;y<h;y++){ if(getPx(px,w,20,y)!==255||getPx(px,w,45,y)!==255) colClean=false; }
  ok(colClean,'B1 纯竖线表格：两条纵线均被整列涂白');
}

// B2 横竖线交叉表格：两个方向都必须删掉
{
  const w=60,h=40; const px=mkImg(w,h,255);
  hline(px,w,0,w-1,8,0); hline(px,w,0,w-1,32,0);
  vline(px,w,h,20,0,h-1,0); vline(px,w,h,45,0,h-1,0);
  api.removeTableLines(px,w,h);
  let rowsClean=true; for(let x=0;x<w;x++){ if(getPx(px,w,x,8)!==255||getPx(px,w,x,32)!==255) rowsClean=false; }
  let colsClean=true; for(let y=0;y<h;y++){ if(getPx(px,w,20,y)!==255||getPx(px,w,45,y)!==255) colsClean=false; }
  ok(rowsClean,'B2a 横线仍被整行涂白（回归锁）');
  ok(colsClean,'B2b 横竖交叉表格：纵线也被涂白（历史缺陷 D1：横线先涂白打断纵线连续段）');
}

// B3 阈值语义锁：≥72% 连续段才判定为线
{
  const w=60,h=50; const px=mkImg(w,h,255);
  vline(px,w,h,10,0,44,0);      // 45/50 = 90% > 72% → 应删
  vline(px,w,h,30,0,29,0);      // 30/50 = 60% < 72% → 应留（文字列）
  api.removeTableLines(px,w,h);
  let c1=true; for(let y=0;y<45;y++){ if(getPx(px,w,10,y)!==255) c1=false; }
  let c2=true; for(let y=0;y<30;y++){ if(getPx(px,w,30,y)!==0) c2=false; }
  ok(c1,'B3a 90% 连续纵线被删');
  ok(c2,'B3b 60% 连续段（疑似文字列）保留，不误伤');
}

// B4 横线阈值语义锁（回归）
{
  const w=80,h=20; const px=mkImg(w,h,255);
  hline(px,w,0,74,5,0);   // 75/80 = 93.75% > 72% → 删
  hline(px,w,0,40,15,0);  // 41/80 = 51% → 留
  api.removeTableLines(px,w,h);
  let r1=true; for(let x=0;x<75;x++){ if(getPx(px,w,x,5)!==255) r1=false; }
  let r2=true; for(let x=0;x<41;x++){ if(getPx(px,w,x,15)!==0) r2=false; }
  ok(r1&&r2,'B4 横线阈值语义：长横线删、短横线留');
}

/* ============ C. 家族回归锁 ============ */
console.log('\nC. 家族回归锁');

// C1 despeckle：孤立点删、成团点留
{
  const w=10,h=10; const px=mkImg(w,h,255);
  setPx(px,w,5,5,0);           // 孤立点
  setPx(px,w,2,2,0); setPx(px,w,2,3,0); setPx(px,w,3,2,0); // 2x2 缺角团
  api.despeckle(px,w,h);
  ok(getPx(px,w,5,5)===255,'C1a 孤立单点被去噪涂白');
  ok(getPx(px,w,2,2)===0&&getPx(px,w,3,2)===0&&getPx(px,w,2,3)===0,'C1b 相邻成团点保留');
}

// C2 adaptiveBinarize：暗块转黑、亮底转白、均匀浅灰不整片判黑
{
  const w=24,h=24; const px=mkImg(w,h,230);   // 均匀浅灰底
  for(let y=6;y<18;y++)for(let x=6;x<18;x++) setPx(px,w,x,y,20); // 暗块
  api.adaptiveBinarize(px,w,h);
  ok(getPx(px,w,12,12)===0,'C2a 暗块中心二值化为黑');
  ok(getPx(px,w,1,1)===255,'C2b 均匀浅灰底保持白（不整片判黑）');
  ok(getPx(px,w,23,23)===255,'C2c 右下角背景保持白');
}

// C3 colToIndex
{
  ok(api.colToIndex('A')===0&&api.colToIndex('Z')===25&&api.colToIndex('AA')===26&&api.colToIndex('AB')===27&&api.colToIndex('BA')===52,
     'C3 colToIndex：A=0 Z=25 AA=26 AB=27 BA=52');
}

// C4 csvToTextRows：引号内逗号/双引号转义、制表符定界
{
  const r1=api.csvToTextRows('名称,数量,备注\n"螺丝, 大",3,"他说""很好""');
  ok(r1.length===2&&r1[1][0]==='螺丝, 大'&&r1[1][2]==='他说"很好"','C4a 引号字段含逗号/双引号转义（实际：'+JSON.stringify(r1[1])+'）');
  const r2=api.csvToTextRows('甲\t乙\t丙\n1\t2\t3');
  ok(r2.length===2&&r2[1][1]==='2','C4b 制表符定界自动识别（实际：'+JSON.stringify(r2[1])+'）');
  const r3=api.csvToTextRows('\uFEFF只有一列\n第二行');
  ok(r3.length===2&&r3[0][0]==='只有一列','C4c BOM 头剥离（实际：'+JSON.stringify(r3[0])+'）');
}

// C5 unzip：未知压缩方式条目跳过而不影响后续条目
{
  const enc=new TextEncoder();
  const buf=concat([
    ...zipEntry('a.txt',enc.encode('AAA'),0),
    ...zipEntry('b.bin',enc.encode('BBB'),99),   // 未知方式 → 跳过
    ...zipEntry('c.txt',enc.encode('CCC'),0)
  ]);
  const files=await api.unzip(buf);
  ok(files['a.txt']==='AAA'&&files['c.txt']==='CCC'&&!('b.bin' in files),
     'C5 unzip：未知压缩方式条目跳过，前后条目无损（实际键：'+Object.keys(files).join(',')+'）');
}

console.log('\n结果: '+pass+' PASS / '+fail+' FAIL');
process.exit(fail?1:0);
})();
