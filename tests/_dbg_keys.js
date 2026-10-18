// 存储键一致性哨兵：找出「写入但从不被读取」的存储键（键名笔误/大小写不一致专用，零依赖）
// 用法：node _dbg_keys.js [文件，默认 wujin-workbench.html]
// 判据：save('k') / PREFIX+'k' 的 setItem 为「写」；load('k') / PREFIX+'k' 的 getItem 为「读」。
//       写了但从没人读 → 高危（数据静默丢失/幽灵键堆积）。
const fs=require('fs');
const file=process.argv[2]||'wujin-workbench.html';
const src=fs.readFileSync(file,'utf8');
// 去掉字符串以外的注释干扰可忽略；这里直接正则抓取三种写法
const writes=new Map(), reads=new Map(), cleans=new Map();
const bump=(m,k,line)=>{ if(!m.has(k))m.set(k,[]); m.get(k).push(line); };
src.split('\n').forEach((ln,i)=>{
  const no=i+1;
  let m;
  const reS=/(?<![\w.])save\(\s*'([A-Za-z0-9_]+)'/g;
  while((m=reS.exec(ln))) bump(writes,m[1],no);
  const reL=/(?<![\w.])load\(\s*'([A-Za-z0-9_]+)'/g;
  while((m=reL.exec(ln))) bump(reads,m[1],no);
  const reSeg=/(?:setItem|getItem|removeItem)\(\s*PREFIX\s*\+\s*'([A-Za-z0-9_]+)'/g;   // 直写 localStorage
  while((m=reSeg.exec(ln))){ const op=m[0].slice(0,m[0].indexOf('(')); if(op==='setItem')bump(writes,m[1],no); else if(op==='getItem')bump(reads,m[1],no); else bump(cleans,m[1],no); }
});
const wKeys=[...writes.keys()].sort();
const rKeys=new Set(reads.keys());
const cKeys=new Set(cleans.keys());
let bad=0;
console.log('已识别的存储键（写 → 读）：');
wKeys.forEach(k=>{ const w=writes.get(k); const r=reads.get(k); const ghost=!r&&!cKeys.has(k);
  if(ghost)bad++;
  console.log('  '+(ghost?'✗ 幽灵键 ':'✓ ')+("'"+k+"'").padEnd(12)+' 写@'+w.join(',')+(r?('  读@'+r.join(',')):(cKeys.has(k)?'  （仅清理）':'  ← 没有任何 load/getItem 读取')));
});
// 反向：只读不写（可能是外部注入或漏写，仅提示）
[...rKeys].filter(k=>!writes.has(k)).forEach(k=>console.log('  · 仅读未写 '+("'"+k+"'")+'  读@'+reads.get(k).join(',')));
console.log(bad? ('\n结论：发现 '+bad+' 个幽灵键（写入但永不被读取）——数据会静默停留在错误键上。')
              : '\n结论：全部写入键均有对应读取，键名一致。');
process.exit(bad?1:0);
