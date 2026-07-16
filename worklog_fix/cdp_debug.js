const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const CDP = '127.0.0.1:9222';
const URL = 'http://172.28.10.2:8085';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: 9222, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch(e){ resolve({}); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1) open blank tab
  const created = await httpReq('PUT', '/json/new?url=about:blank');
  const wsUrl = created.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const events = [];
  ws.on('message', m => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method) { events.push(msg); }
  });
  await new Promise(r => ws.on('open', r));

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // 2) navigate to login page
  await send('Page.navigate', { url: URL });
  await sleep(2500);

  // helper: collect console errors so far
  function collectErrors() {
    const errs = [];
    for (const e of events) {
      if (e.method === 'Runtime.exceptionThrown') {
        const d = e.params.exceptionDetails;
        errs.push('EXCEPTION: ' + (d.exception && d.exception.description || d.text) + ' @ ' + (d.url||'') + ':' + (d.lineNumber));
      } else if (e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')) {
        const txt = e.params.args.map(a => a.value !== undefined ? a.value : (a.description||a.type)).join(' ');
        errs.push('CONSOLE.' + e.params.type + ': ' + txt);
      } else if (e.method === 'Log.entryAdded' && (e.params.entry.level === 'error' || e.params.entry.level === 'warning')) {
        errs.push('LOG.' + e.params.entry.level + ': ' + e.params.entry.text);
      }
    }
    return errs;
  }

  // 3) login
  const loginRes = await send('Runtime.evaluate', {
    expression: `(function(){
      var p = document.getElementById('loginPassword');
      var f = document.getElementById('loginForm');
      if(!p||!f) return 'NO_LOGIN_FORM';
      p.value = 'admin123';
      var btn = f.querySelector('button[type=submit]');
      if(btn) btn.click(); else f.requestSubmit ? f.requestSubmit() : f.submit();
      return 'LOGIN_TRIGGERED';
    })()`,
    returnByValue: true
  });
  console.log('LOGIN:', loginRes.result && loginRes.result.result && loginRes.result.result.value);
  await sleep(4000);

  // 4) check dashboard DOM + errors
  const dash = await send('Runtime.evaluate', {
    expression: `(function(){
      function txt(id){var e=document.getElementById(id);return e?e.textContent.trim():'(missing)';}
      var tab = document.getElementById('tab-dashboard');
      return {
        dashVisible: tab ? tab.classList.contains('active') : 'no-tab',
        dsTodayCount: txt('dsTodayCount'),
        dsCustomerCount: txt('dsCustomerCount'),
        todayListLen: (document.getElementById('dashboardTodayList')||{}).innerHTML ? document.getElementById('dashboardTodayList').innerHTML.length : 0,
        bodyHasLogin: !!document.getElementById('loginForm')
      };
    })()`,
    returnByValue: true
  });
  console.log('DASHBOARD:', JSON.stringify(dash.result.result.value));

  let errs = collectErrors();
  console.log('--- ERRORS after login (' + errs.length + ') ---');
  errs.slice(0, 25).forEach(e => console.log('  ' + e));

  // 5) try switching to several tabs and check blank-ness
  const tabsToTest = ['tab-payments','tab-expenses','tab-materials','tab-customer','tab-pending','tab-query','tab-salary','tab-projects'];
  for (const t of tabsToTest) {
    await send('Runtime.evaluate', { expression: 'if(typeof switchTab==="function"){switchTab("'+t+'");}else{throw new Error("switchTab undefined");}', returnByValue: true });
    await sleep(1500);
    const r = await send('Runtime.evaluate', {
      expression: `(function(){
        var tab=document.getElementById('${t}');
        var visible = tab && tab.classList.contains('active');
        // count non-empty text in tab
        var text = tab ? tab.innerText.replace(/\\s+/g,'').length : -1;
        var childEls = tab ? tab.querySelectorAll('*').length : -1;
        return {visible:visible, textLen:text, childEls:childEls};
      })()`,
      returnByValue: true
    });
    console.log('TAB ' + t + ':', JSON.stringify(r.result.result.value));
  }

  errs = collectErrors();
  console.log('--- ALL ERRORS (' + errs.length + ') ---');
  // dedupe
  [...new Set(errs)].slice(0, 40).forEach(e => console.log('  ' + e));

  fs.writeFileSync('C:/Users/Administrator/Documents/traework/worklog_fix/_cdp_events.json', JSON.stringify(events, null, 1));
  ws.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
