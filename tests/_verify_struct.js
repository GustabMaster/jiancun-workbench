// 专项：结构守卫（第五轮）—— 存储里的「非数组 / 非对象」损坏值在启动期就被兜住，
// 不靠渲染期 try/catch，更不允许让内联脚本在求值阶段中断（那会导致整页白屏无提示）。
// 做法：每次用「预置损坏存储」的新上下文重新运行整份脚本，模拟真实冷启动。
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('wujin-workbench.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

function makeClassList() { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), toggle: (c, f) => { if (f === undefined) { s.has(c) ? s.delete(c) : s.add(c); } else { f ? s.add(c) : s.delete(c); } }, contains: c => s.has(c) }; }
function elStub(tag) {
  const self = {
    tag: tag || '', value: '', textContent: '', _html: '', children: [], className: '', checked: false, indeterminate: false,
    set innerHTML(v) { this._html = v; this.children = []; },
    get innerHTML() { return this.children.length ? this.children.map(c => c._html || '').join('') : this._html; },
    classList: makeClassList(), addEventListener() { }, appendChild(c) { this.children.push(c); }, removeChild() { }, insertBefore() { }, replaceChild() { }, remove() { },
    setAttribute() { }, getAttribute() { return null; }, focus() { }, scrollIntoView() { }, closest() { return elStub() },
    querySelector() { return elStub() }, querySelectorAll() { return [] }, selectedOptions: [], options: [], click() { }, style: {},
    width: 0, height: 0, getContext() { return { drawImage() { } } }, toBlob(cb) { cb({ type: 'image/jpeg' }); }
  };
  return self;
}

const SHIM = `
;globalThis.__api={
  get products(){return products}, set products(v){products=v},
  get cash(){return cash}, set cash(v){cash=v},
  get flow(){return flow}, set flow(v){flow=v},
  get ar(){return ar}, set ar(v){ar=v},
  get stockLog(){return stockLog}, set stockLog(v){stockLog=v},
  get usage(){return usage}, set usage(v){usage=v},
  get cfg(){return cfg}, set cfg(v){cfg=v},
  load, save, toast, renderAll, renderStock, renderParty, renderFlow, renderCash, applyCfg,
  catSelectHTML, specOptionsForName, locSelectHTML, packSelectHTML,
  restoreLocal, _asArr, autoHealthCheck
};`;

// 用预置存储冷启动一份全新上下文；抛错即代表「脚本求值阶段中断 → 整页白屏」
function boot(prefill) {
  const elements = {};
  const getEl = id => { if (!elements[id]) elements[id] = elStub(); return elements[id]; };
  const doc = {
    getElementById: getEl, createElement: t => elStub(t), querySelector: () => elStub(), querySelectorAll: () => [],
    addEventListener() { }, removeEventListener() { },
    body: { appendChild() { }, addEventListener() { }, removeEventListener() { }, classList: makeClassList() },
    documentElement: { style: { setProperty() { } } }, head: { appendChild() { } }
  };
  const localStore = Object.assign({}, prefill);
  const localStorage = { getItem: k => k in localStore ? localStore[k] : null, setItem: (k, v) => { localStore[k] = String(v); }, removeItem: k => { delete localStore[k]; } };
  const ctx = {
    console, setTimeout: f => { return f ? setTimeout(f, 0) : 0; }, clearTimeout: () => { }, setInterval: () => 0, clearInterval: () => { },
    document: doc, localStorage,
    alert: m => { ctx.__lastAlert = m; },
    confirm: () => true,
    URL, Math, JSON, Date, Map, Set, Promise, TextEncoder, Blob,
    WebSocket: function () { return { readyState: 1, send() { }, close() { }, set onopen(f) { }, set onmessage(f) { }, set onclose(f) { } }; },
    Image: function () { this.width = 0; this.height = 0; Object.defineProperty(this, 'src', { set(v) { this._src = v; }, get() { return this._src; } }); },
    FileReader: function () { this.readAsText = () => { this.result = ctx.__frResult; if (this.onload) this.onload(); }; },
    __frResult: '', __lastAlert: ''
  };
  ctx.globalThis = ctx; ctx.window = ctx;
  ctx.fetch = () => Promise.resolve({ json: () => Promise.resolve([]), ok: true });
  vm.createContext(ctx);
  vm.runInContext(script + SHIM, ctx, { filename: 'wujin-struct' });
  ctx.__elements = elements;
  return ctx;
}

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } }

console.log('\n结构守卫专项 · 第五轮\n');

/* ---- A. usage（商品/往来使用频次）被写成非对象 ---- */
console.log('A. 使用频次结构');
[['字符串', '"abc"'], ['null', 'null'], ['数组', '[]'], ['数字', '42']].forEach(([label, raw]) => {
  let ctx = null, threw = '';
  try { ctx = boot({ 'wb_wujin_usage': raw, 'wb_wujin_seeded': 'true' }); }
  catch (e) { threw = e.message; }
  const u = ctx && ctx.__api.usage;
  const good = !!ctx && u && typeof u === 'object' && !Array.isArray(u) && u.p && typeof u.p === 'object' && u.pa && typeof u.pa === 'object';
  let rend = true;
  if (ctx) { try { ctx.__api.renderStock(); ctx.__api.renderStock(); ctx.__api.renderParty(); ctx.__api.renderAll(); } catch (e) { rend = false; } }
  ok(!threw && good && rend, 'usage=' + label + '：冷启动不中断、结构归位、渲染不抛错' + (threw ? ('（' + threw + '）') : ''));
});

/* ---- B. 配置预设数组被写成非数组 ---- */
console.log('B. 配置预设结构');
['{"catPresets":"abc","specPresets":5,"packPresets":{"a":1},"locPresets":null}',
 '{"catPresets":["五金",7],"specPresets":["A"]}'].forEach((raw, i) => {
  let ctx = null, threw = '';
  // 预置迁移标记：真实老用户已迁移过，启动期不会再用 migrateMetaPresets 顺手重置预设（否则掩盖缺陷）
  try { ctx = boot({ 'wb_wujin_cfg': raw, 'wb_wujin_seeded': 'true', 'wb_wujin_mig_basic_v2': 'true', 'wb_wujin_mig_meta_presets': 'true' }); }
  catch (e) { threw = e.message; }
  const c = ctx && ctx.__api.cfg;
  const allArr = c && ['catPresets', 'specPresets', 'packPresets', 'locPresets'].every(k => Array.isArray(c[k]));
  const onlyStr = c && ['catPresets', 'specPresets', 'packPresets', 'locPresets'].every(k => c[k].every(v => typeof v === 'string'));
  let rend = true;
  if (ctx) { try { ctx.__api.catSelectHTML(''); ctx.__api.specOptionsForName('x', ''); ctx.__api.locSelectHTML(''); ctx.__api.packSelectHTML(''); ctx.__api.renderStock(); } catch (e) { rend = false; } }
  const label = i === 0 ? '预设写成非数组：归零为数组、下拉与渲染不抛错（既有保护，防回退）'
    : '预设数组混入非字符串：过滤为纯字符串数组（本轮新增）';
  ok(!threw && allArr && onlyStr && rend, 'cfg ' + label + (threw ? ('（' + threw + '）') : ''));
});

/* ---- C. 六张主表被写成非数组（冷启动白屏风险） ---- */
console.log('C. 主表结构');
[['products', '{}'], ['flow', '"oops"'], ['cash', '123'], ['stocklog', 'null'], ['ar', '{"a":1}'], ['parties', '"x"']].forEach(([key, raw]) => {
  let ctx = null, threw = '';
  try { ctx = boot({ ['wb_wujin_' + key]: raw, 'wb_wujin_seeded': 'true' }); }
  catch (e) { threw = e.message; }
  const arrs = ctx && ['products', 'cash', 'flow', 'ar', 'stockLog'].every(k => Array.isArray(ctx.__api[k]));
  let rend = true;
  if (ctx) { try { ctx.__api.renderAll(); } catch (e) { rend = false; } }
  ok(!threw && arrs && rend, '主表 ' + key + '=' + raw + '：冷启动不中断、归位为数组、渲染不抛错' + (threw ? ('（' + threw + '）') : ''));
});

/* ---- D. 恢复快照结构 ---- */
console.log('D. 快照恢复');
{
  // D1 坏快照：七张表全是坏值 → 不应崩，且恢复后为数组
  let ctx = null, threw = '';
  try {
    ctx = boot({
      'wb_wujin_seeded': 'true',
      'wb_wujin_trash': JSON.stringify({ ts: Date.now(), data: { products: 'abc', cash: {}, flow: 5, todos: null, parties: '"x"', ar: [], stockLog: 1 } })
    });
  } catch (e) { threw = e.message; }
  let r1 = true;
  if (ctx) { try { ctx.__api.restoreLocal(); } catch (e) { r1 = false; } }
  const arrs = ctx && ['products', 'cash', 'flow', 'stockLog'].every(k => Array.isArray(ctx.__api[k]));
  ok(!threw && r1 && arrs, '坏快照恢复：不抛错、各表归位为数组' + (threw ? ('（' + threw + '）') : ''));

  // D2 正常快照：恢复功能未被改坏
  const snap = { ts: Date.now(), data: { products: [{ id: 'p1', name: '货', unit: '个', conv: {}, stock: 3, _t: 1 }], cash: [{ id: 'c1', type: 'in', cat: '其他', amount: 9, _t: 1, date: '2026-10-01' }], flow: [], todos: [], parties: [], ar: [], stockLog: [] } };
  let ctx2 = null, threw2 = '';
  try { ctx2 = boot({ 'wb_wujin_seeded': 'true', 'wb_wujin_trash': JSON.stringify(snap) }); }
  catch (e) { threw2 = e.message; }
  let r2 = true;
  if (ctx2) { try { ctx2.__api.restoreLocal(); } catch (e) { r2 = false; } }
  ok(!threw2 && r2 && ctx2 && ctx2.__api.products.length === 1 && ctx2.__api.cash.length === 1, '正常快照恢复：商品 1 条 / 收支 1 条恢复正确');
}

console.log('\n==== 结构守卫专项 结果：' + pass + ' PASS / ' + fail + ' FAIL ====');
process.exit(fail ? 1 : 0);
