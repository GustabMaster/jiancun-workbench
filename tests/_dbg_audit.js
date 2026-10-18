// 静态审计：console 残留 + 内联事件函数齐全性
const fs = require('fs');
const html = fs.readFileSync('wujin-workbench.html', 'utf8');
const s = html.match(/<script>([\s\S]*)<\/script>/)[1];

const cons = (s.match(/console\.\w+/g) || []);
console.log('console.* 残留:', cons.length ? cons.join(',') : '无');

const inline = new Set();
const re = /on(?:click|change|input|keydown|keyup|submit|blur|focus|load|error|drop|dragover|dragleave|pointerdown|scroll)="([A-Za-z_$][\w$]*)\(/g;
let m;
while ((m = re.exec(html))) inline.add(m[1]);
const defined = new Set();
const re2 = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
while ((m = re2.exec(s))) defined.add(m[1]);
const missing = [...inline].filter(f => !defined.has(f));
console.log('内联事件函数:', inline.size, '个；未定义:', missing.length ? missing.join(',') : '无');

// 存储键一致性（幽灵键哨兵）：写入必须落到被 load()/getItem 读取的键，否则数据静默滞留
const { execSync } = require('child_process');
try {
  const out = execSync('node tests/_dbg_keys.js', { encoding: 'utf8' });
  console.log('存储键一致性:', out.trim().split('\n').pop());
} catch (e) {
  const lines = String((e && e.stdout) || '').split('\n').filter(l => /幽灵键/.test(l));
  console.log('存储键一致性: ✗ 发现幽灵键（写入但从不被读取）：\n' + lines.join('\n'));
}

// 汇总各回归套件的 PASS/FAIL（兼容两种输出格式）
const suites = ['tests/_bugscreen.js', 'tests/_verify56.js', 'tests/_verify_backup.js', 'tests/_verify_meta.js', 'tests/_verify_rework.js', 'tests/_verify_bulk.js', 'tests/_verify53.js', 'tests/_verify54.js', 'tests/_verify_vlog.js', 'tests/_verify_quick.js', 'tests/_verify_fuzz2.js', 'tests/_verify_struct.js', 'tests/_verify_sync.js', 'tests/_verify_ledger.js', 'tests/_verify_lastprice.js', 'tests/_verify_bulkstock.js', 'tests/_verify_clearadj.js', 'tests/_verify_cashdir.js', 'tests/_verify_packrename.js', 'tests/_verify_bizrefund.js', 'tests/_verify_import.js', 'tests/_verify_inline.js', 'tests/_verify_clearcount.js', 'tests/_verify_backuppush.js', 'tests/_verify_smartdraft.js', 'tests/_verify_update.js', 'tests/_verify_smartui.js', 'tests/_verify_smartmisc.js', 'tests/_verify_closure.js'];
let tp = 0, tf = 0;
for (const f of suites) {
  const out = execSync('node ' + f, { encoding: 'utf8' });
  const m1 = out.match(/(\d+)\s*PASS\s*\/\s*(\d+)\s*FAIL/);          // "519 PASS / 0 FAIL"
  const m2 = out.match(/PASS\s+(\d+)\s*\/\s*FAIL\s+(\d+)/);          // "PASS 29 / FAIL 0"
  let p = 0, fl = 0;
  if (m1) { p = Number(m1[1]); fl = Number(m1[2]); }
  else if (m2) { p = Number(m2[1]); fl = Number(m2[2]); }
  tp += p; tf += fl;
  console.log(f.padEnd(20), 'PASS=' + String(p).padStart(4), 'FAIL=' + fl);
}
console.log('合计: ' + tp + ' PASS / ' + tf + ' FAIL');
