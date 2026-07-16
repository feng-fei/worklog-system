const http = require('http');
const WebSocket = require('ws');
function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: 9222, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){resolve({})}});
    });
    req.on('error', reject); if(data) req.write(data); req.end();
  });
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async () => {
  const created = await httpReq('PUT', '/json/new?url=about:blank');
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  const send=(m,p={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method:m,params:p}));});
  const events=[];
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}else if(msg.method)events.push(msg);});
  await new Promise(r=>ws.on('open',r));
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.navigate',{url:'http://172.28.10.2:8085'});
  await sleep(2500);

  // 正确登录：填用户名+密码
  const login = await send('Runtime.evaluate',{expression:`(function(){
    var u=document.getElementById('loginUsername'); var p=document.getElementById('loginPassword');
    var f=document.getElementById('loginForm');
    if(!u||!p||!f) return 'NO_FORM';
    u.value='admin'; p.value='admin123';
    var b=f.querySelector('button[type=submit]'); if(b)b.click(); else f.requestSubmit();
    return 'TRIGGERED';
  })()`,returnByValue:true});
  console.log('LOGIN:', login.result.result.value);
  await sleep(4000);

  const post = await send('Runtime.evaluate',{expression:`(function(){
    var tok=localStorage.getItem('auth_token');
    function txt(id){var e=document.getElementById(id);return e?e.textContent.trim():'(missing)';}
    var appVisible = !document.getElementById('loginForm') || document.getElementById('loginForm').offsetParent===null;
    return {
      hasToken:!!tok, tokLen:tok?tok.length:0,
      appVisible:appVisible,
      dsTodayCount:txt('dsTodayCount'), dsCustomerCount:txt('dsCustomerCount'),
      dsMonthPayment:txt('dsMonthPayment'),
      todayListLen:(document.getElementById('dashboardTodayList')||{innerHTML:''}).innerHTML.length
    };
  })()`,returnByValue:true});
  console.log('POST-LOGIN:', JSON.stringify(post.result.result.value));

  const tabs=['tab-dashboard','tab-payments','tab-expenses','tab-materials','tab-customer','tab-pending','tab-query','tab-salary','tab-projects','tab-notifications','tab-staff'];
  for(const t of tabs){
    await send('Runtime.evaluate',{expression:`if(typeof switchTab==='function') switchTab('${t}');`,returnByValue:true});
    await sleep(1200);
    const r=await send('Runtime.evaluate',{expression:`(function(){
      var tab=document.getElementById('${t}');
      if(!tab) return {exists:false};
      var visible=tab.classList.contains('active');
      var txt=tab.innerText.replace(/\\s+/g,' ').trim();
      return {exists:true, visible:visible, textLen:txt.length, preview:txt.slice(0,80)};
    })()`,returnByValue:true});
    console.log('TAB '+t+':', JSON.stringify(r.result.result.value));
  }

  const errs=[];
  for(const e of events){
    if(e.method==='Runtime.exceptionThrown'){const d=e.params.exceptionDetails;errs.push('EXC: '+(d.exception&&d.exception.description||d.text));}
    else if(e.method==='Runtime.consoleAPICalled'&&(e.params.type==='error'||e.params.type==='warning')){errs.push('CONSOLE.'+e.params.type+': '+e.params.args.map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' '));}
    else if(e.method==='Log.entryAdded'&&(e.params.entry.level==='error'||e.params.entry.level==='warning')){errs.push('LOG.'+e.params.entry.level+': '+e.params.entry.text);}
  }
  console.log('--- ERRORS ('+errs.length+') ---');
  [...new Set(errs)].slice(0,30).forEach(e=>console.log('  '+e));
  ws.close(); process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
