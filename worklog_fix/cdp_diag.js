const http = require('http');
const WebSocket = require('ws');

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: 9222, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch(e){ resolve({}); } });
    });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const created = await httpReq('PUT', '/json/new?url=about:blank');
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.on('message', m => { const msg = JSON.parse(m); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable'); await send('Page.enable');

  await send('Page.navigate', { url: 'http://172.28.10.2:8085' });
  await sleep(2500);

  await send('Runtime.evaluate', { expression: `(function(){var p=document.getElementById('loginPassword');var f=document.getElementById('loginForm');if(!p||!f)return'NO_FORM';p.value='admin123';var b=f.querySelector('button[type=submit]');if(b)b.click();else f.requestSubmit();return'TRIGGERED';})()`, returnByValue: true });
  await sleep(4000);

  const info = await send('Runtime.evaluate', {
    expression: `(async function(){
      var tok = localStorage.getItem('auth_token');
      var out = { hasToken: !!tok, tokLen: tok?tok.length:0, tokHead: tok?tok.slice(0,30):null };
      // 手动用这个 token 调 dashboard
      try {
        var r = await fetch('/api/dashboard', {headers:{Authorization:'Bearer '+tok}});
        out.manualStatus = r.status;
        out.manualBody = (await r.text()).slice(0,120);
      } catch(e){ out.manualErr = String(e); }
      // 看 apiFetch 是否带 token：拦截 Authorization 头
      out.apiFetchType = (typeof apiFetch);
      return out;
    })()`,
    returnByValue: true, awaitPromise: true
  });
  console.log('DIAG:', JSON.stringify(info.result.result.value, null, 1));

  // 再切到 dashboard 看 apiFetch 实际发出的请求头
  const hdr = await send('Runtime.evaluate', {
    expression: `(async function(){
      var tok = localStorage.getItem('auth_token');
      // 用 XHR 直接看 apiFetch 内部：重写 apiFetch 抓 headers
      var orig = apiFetch;
      window.__lastReq = null;
      window.apiFetch = function(url, opts){ opts=opts||{}; opts.headers=opts.headers||{}; window.__lastReq={url:url, hasAuth: !!(opts.headers && (opts.headers.Authorization||(opts.headers.authorization)))}; return orig(url, opts); };
      return 'patched';
    })()`,
    returnByValue: true
  });
  await send('Runtime.evaluate', { expression: "if(typeof switchTab==='function') switchTab('tab-dashboard');", returnByValue: true });
  await sleep(2000);
  const lastReq = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__lastReq)', returnByValue: true });
  console.log('APIFETCH last req:', lastReq.result.result.value);

  ws.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
