// ocr-proxy.js — 简存工作台 · 本地识别中转代理
// 作用：解决百度 OCR 接口不允许网页直连（浏览器跨域 → failed to fetch）的问题。
// 用法：保持此窗口打开；关闭窗口即停用拍照识别。
// 工作台「引擎设置 → 中转代理」填： http://localhost:8088/?url=%s
const http = require('http'), https = require('https'), url = require('url');
const PORT = process.env.PORT || 8088;
const ALLOW_HOST = 'aip.baidubce.com'; // 仅允许转发到百度 OCR，避免被当成开放代理滥用

const server = http.createServer((req, res) => {
  // 放开跨域，让网页（无论部署在哪、或本地打开）都能调本机代理
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const target = url.parse(req.url, true).query.url;
  if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain;charset=utf-8' }); res.end('missing url'); return; }
  let t;
  try { t = new URL(target); } catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain;charset=utf-8' }); res.end('bad url'); return; }
  if (t.hostname !== ALLOW_HOST) { res.writeHead(403, { 'Content-Type': 'text/plain;charset=utf-8' }); res.end('only baidu allowed'); return; }

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const options = {
      method: req.method,
      hostname: t.hostname,
      port: t.port || 443,
      path: t.pathname + t.search,
      headers: { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded', 'Content-Length': body.length }
    };
    const p = https.request(options, resp => {
      res.writeHead(resp.statusCode, { 'Content-Type': resp.headers['content-type'] || 'application/json;charset=utf-8' });
      resp.pipe(res);
    });
    p.on('error', e => { console.error('proxy error', e.message); res.writeHead(502, { 'Content-Type': 'text/plain;charset=utf-8' }); res.end('proxy failed: ' + e.message); });
    if (body.length) p.write(body);
    p.end();
  });
});
server.listen(PORT, () => console.log('Jiancun OCR proxy started -> http://localhost:' + PORT + '  (local only; close this window when done)'));
