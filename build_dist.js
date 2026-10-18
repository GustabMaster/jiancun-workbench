// 构建脚本（单文件进销存工作台）
// 用法：
//   node build_dist.js          构建干净版 dist/index.html（DEMO_SEED=false，首屏不装示例）
//   node build_dist.js --demo   构建演示版 dist/index.html（DEMO_SEED=true，首屏自动装载示例）
// 说明：源码本身保留 seed() 演示数据逻辑，仅通过 DEMO_SEED 开关控制是否首屏自动装载；
//       干净版与演示版均从同一份源码构建，不剥离任何代码，保证数据格式一致。
const fs=require('fs');
// 自适应源文件名：工作区用 wujin-workbench.html，发行/演示包内用 简存·单店进销存工作台.html
const SRC = fs.existsSync('wujin-workbench.html') ? 'wujin-workbench.html'
          : (fs.existsSync('简存·单店进销存工作台.html') ? '简存·单店进销存工作台.html' : 'wujin-workbench.html');
const OUT='dist/index.html';
const demo=process.argv.includes('--demo');
let s=fs.readFileSync(SRC,'utf8');

if(demo){
  // 演示版：把 DEMO_SEED=false 翻成 true，使首屏自动装载示例
  if(!/DEMO_SEED=false/.test(s)){
    console.error('⚠️ 未在源码中找到 DEMO_SEED=false，演示版开关注入失败');
    process.exit(2);
  }
  s=s.replace(/DEMO_SEED=false/, 'DEMO_SEED=true');
}

fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync(OUT,s,'utf8');

// 校验
const m=s.match(/DEMO_SEED=(true|false)/);
const val=m?m[1]:'?';
const expect=demo?'true':'false';
const ok=(val===expect);
const seedKept=/function seed\(/.test(s);
console.log('dist/index.html 写出完成（'+(demo?'演示版':'干净版')+'）');
console.log('DEMO_SEED = '+val+'（期望 '+expect+'）'+(ok?' ✓':' ⚠️'));
console.log('seed() 函数保留: '+(seedKept?'是（演示数据逻辑随包携带，干净版不自动装载）':'否 ⚠️'));
console.log('字节数: '+s.length);
process.exit(ok&&seedKept?0:1);
