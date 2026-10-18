/* 简存·单店进销存工作台 · 离线壳缓存（PWA）
 * 设计原则：导航请求「网络优先」，保证在线永远是最新版、绝不卡旧版；
 * 仅在断网时回退到已缓存的壳，实现「断网也能秒开」。
 * 同源静态资源（图标等）走缓存优先，没命中再网络。
 */
const CACHE = 'jiancun-shell-v1.15.32';
// 页面文件名随部署方式不同：deploy 目录里是 index.html，仓库根目录（GitHub Pages）里是 wujin-workbench.html。
// 两个都列上，逐个缓存（某个不存在不影响其它），离线兜底优先产品页、再退 index.html。
const SHELL = ['wujin-workbench.html', 'index.html', 'icon.svg', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个 add：c.addAll 只要有一个 404 就整体失败，壳会完全没缓存
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    (function () {
      return caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
            return caches.delete(k);
          })
        );
      }).then(function () { return self.clients.claim(); });
    })()
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (!url || url.origin !== self.location.origin) return; // 只管同源

  if (req.mode === 'navigate') {
    // 导航：网络优先，失败用缓存（离线兜底）
    e.respondWith(
      (function () {
        return fetch(req).then(function (fresh) {
          caches.open(CACHE).then(function (c) {
            c.put(req, fresh.clone()).catch(function () {});
          });
          return fresh;
        }).catch(function () {
          return caches.match(req).then(function (cached) {
            if (cached) return cached;
            return caches.match('wujin-workbench.html').then(function (shell) {
              if (shell) return shell;
              return caches.match('index.html').then(function (shell2) {
                if (shell2) return shell2;
                return new Response('离线且本地无缓存，请联网后重试', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
              });
            });
          });
        });
      })()
    );
    return;
  }

  // 其它同源请求：只对少数静态资产走「缓存优先」，其余直接走网络、**不写入缓存**。
  // ⚠️ 不能无差别缓存：页面「检查更新」用 fetch('index.html?_t='+时间戳) 探活，唯一查询串使缓存永不命中，
  // 于是每次检查都往当前缓存写入一份数百 KB 的副本；activate 只删「旧缓存名」，管不到同名缓存内的新条目 →
  // 副本永不清理，长期累积撑爆浏览器配额（且毫无用处）。
  var CACHEABLE = ['icon.svg', 'manifest.json', 'icon-192.png', 'icon-512.png', 'sw.js'];
  var cacheable = false;
  try { cacheable = CACHEABLE.indexOf(decodeURIComponent(url.pathname).replace(/^\//, '')) >= 0; } catch (err) {}
  if (!cacheable) {
    e.respondWith(fetch(req).catch(function () { return new Response('', { status: 504 }); }));
    return;
  }
  e.respondWith(
    (function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (fresh) {
          caches.open(CACHE).then(function (c) {
            c.put(req, fresh.clone()).catch(function () {});
          });
          return fresh;
        }).catch(function () {
          return new Response('', { status: 504 });
        });
      });
    })()
  );
});
