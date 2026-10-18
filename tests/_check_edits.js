// 逐点核查第 2/3 轮数值加固编辑是否真实落盘（并行编辑曾互相覆盖，必须逐个验）
const fs = require('fs');
const html = fs.readFileSync('wujin-workbench.html', 'utf8');
const sites = [
  ['helper numOr0', "const numOr0=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};"],
  ['readConvEditor 系数上限', "if(n && f>0 && f<=MAXNUM) conv[n]=f;"],
  ['smartExtractConv 系数上限', "if(fac>0&&fac<=MAXNUM)"],
  ['smartParseConvText 系数上限', "if(f>0&&f<=MAXNUM)"],
  ['单位预览 f', "const f=Math.max(1,clampNum(sel.value||1,1));"],
  ['单位预览 q', "const q=clampNum($('f_qty').value,0);"],
  ['addProduct cost/wholesale/retail', "const cost=clampNum($('p_cost').value,0),wholesale=clampNum($('p_wholesale').value,0),retail=clampNum($('p_retail').value,0);"],
  ['addProduct jian', "const jian=numOr0($('p_jian').value); if(jian>0&&jian<=MAXNUM) conv['件']=jian;"],
  ['addProduct stock/safe', "const stock=clampNum($('p_stock').value,0),safe=clampNum($('p_safe').value,0);"],
  ['adj f', "const f=Math.max(1,clampNum($('adj_unit').value,1));"],
  ['adj q', "const q=clampNum($('adj_qty').value,0);"],
  ['ed_jian', "const _jian=numOr0($('ed_jian').value); if(_jian>0&&_jian<=MAXNUM)_conv['件']=_jian;"],
  ['商品编辑 stock/safe', "p.stock=Math.floor(clampNum($('ed_stock').value,0));"],
  ['商品编辑 cost/wholesale/retail', "p.cost=clampNum($('ed_cost').value,0);p.wholesale=clampNum($('ed_wholesale').value,0);p.retail=clampNum($('ed_retail').value,0);"],
  ['addCash', "const amt=clampNum($('c_amt').value,0);"],
  ['saveCashEdit', "const amt=clampNum($('ec_amt').value,0);"],
  ['addFlow np safe', "safe:isBrandNew?clampNum($('f_newsafe').value,0):0"],
  ['addFlow np retail/price', "retail:clampNum($('f_price').value,0),price:clampNum($('f_price').value,0)"],
  ['addFlow qty', "const qty=Math.floor(clampNum($('f_qty').value,0));"],
  ['addFlow price', "const price=clampNum($('f_price').value,0);"],
  ['addFlow need', "const need=qty*(Math.max(1,clampNum($('f_unit').value,1)));"],
  ['ufactor', "const ufactor=Math.max(1,clampNum($('f_unit').value,1));"],
  ['readFlowLine newSafe', "newSafe:isBrandNew?clampNum($('f_newsafe').value,0):0"],
  ['updDraftLine', "l[field]=(field==='qty')?Math.floor(clampNum(val,0)):clampNum(val,0);"],
  ['ensureDraftProduct safe', "safe:clampNum(line.newSafe,0),"],
  ['ensureDraftProduct retail/price', "retail:clampNum(line.price,0),price:clampNum(line.price,0),_t:Date.now()};"],
  ['ocrRowsToItems qty', "const qty=Math.floor(clampNum(r.qty,0));"],
  ['ocrRowsToItems price', "const price=clampNum(r.price,0);"],
  ['smartApplyProduct jian', "const j=numOr0(it.jian); if(j>0&&j<=MAXNUM)conv['件']=j;"],
  ['smartApplyProduct stock', "const stock=Math.floor(clampNum(it.stock,0));"],
  ['smartApplyProduct cost/retail', "const cost=clampNum(it.cost,0), retail=clampNum(it.retail,0);"],
  ['smartApplyProduct ex.stock', "ex.stock=Math.max(0,Math.round(numOr0(ex.stock)+stock));"],
  ['smartApplyFlow', "const qty=Math.floor(clampNum(it.qty,0)), price=clampNum(it.price,0);"],
  ['smartApplyCash', "const amt=clampNum(it.amount,0); if(!amt)return false;"],
  ['doCollect', "amt=clampNum(amt,0);"],
  ['slEditPrev', "const newQ=clampNum($('sl_qty').value,0);"],
  ['editStockLog q', "const q=clampNum($('sl_qty').value,0);"],
  ['editStockLog ufactor', "const ufactor=Math.max(1,clampNum(usel.value,1));"],
  ['editStockLog price', "clampNum(pv,0)"],
  ['submitRestock', "const qty=clampNum(q?q.value:0,0),price=clampNum(pr?pr.value:0,0);"],
  ['saveFlowEdit legacy uf', "const _uf=Math.min(MAXNUM,Number.isFinite(Number(f.unitFactor))?Number(f.unitFactor):1);"],
  ['coerceNums/parseImportData numOr0', "r[k]=numOr0(r[k]);"],
];
// 注：'addFlow np safe' 原期望 2 处，但草稿化改造后 readFlowLine 该字段已改名 newSafe（下方有独立检查项且通过），
// 两条路径的 clampNum 限幅保护都在，故此处期望降为 1（2026-10-14 核对：非保护丢失，属哨兵过期）。
const expectCount = { 'adj f': 2, 'adj q': 2, 'ufactor': 2, 'addFlow np safe': 1, 'coerceNums/parseImportData numOr0': 2 };
let miss = 0;
for (const [name, pat] of sites) {
  const c = html.split(pat).length - 1;
  const want = expectCount[name] || 1;
  if (c < want) { miss++; console.log('缺失×' + (want - c) + '  ' + name + '   >> ' + pat.slice(0, 70)); }
  else console.log('OK ×' + c + '  ' + name);
}
console.log(miss ? '\n共 ' + miss + ' 处编辑丢失，需补' : '\n全部编辑均已落盘');
