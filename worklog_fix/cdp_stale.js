const http = require('http');
const WebSocket = require('ws');
function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host:'127.0.0.1',port:9222,path,method,
      headers: data?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}:{} }, res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{resolve(d?JSON.parse(d):{})}catch(e){resolve({})}});});
    req.on('error',reject); if(data)req.write(data); req.end();
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const created=await httpReq('PUT','/json/new?url=about:blank');
  const ws=new WebSocket(created.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  const send=(m,p={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method:m,params:p}));});
  const events=[];
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
    else if(msg.method)events.push(msg);});
  await new Promise(r=>ws.on('open',r));
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');

  // === STEP 1: 注入过期 token，模拟用户真实浏览器的旧 session ===
  // JWT exp=1 (1970年) — 绝对过期
  const fakeToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwic3RhZmZfbmFtZSI6Ilx1N2JhMVx1NzQwNlx1NTQ1OCIsInN0YWZmX2lkIjpudWxsLCJleHAiOjF9.abc123';
  await send('Network.setCookie',{name:'auth_token',value:fakeToken,url:'http://172.28.10.2:8085'});
  // 同时注入各种可能缓存的旧用户数据
  const preEval = await send('Runtime.evaluate',{expression:`(function(){
    localStorage.setItem('auth_token', '${fakeToken}');
    localStorage.setItem('auth_user_name', '旧缓存管理员');
    localStorage.setItem('auth_user_role', 'admin');
    return 'INJECTED_OLD_SESSION';
  })()`,returnByValue:true});
  console.log('PREP:',preEval.result.result.value);

  // === STEP 2: 导航到 worklog,看这次会发生什么 ===
  await send('Page.navigate',{url:'http://172.28.10.2:8085'});
  await sleep(5000);

  // 检查是否显示登录页还是卡在半状态
  const diag = await send('Runtime.evaluate',{expression:`(function(){
    function txt(id){var e=document.getElementById(id);return e?e.textContent.trim():'(missing)';}
    var loginVisible=document.getElementById('loginForm') && document.getElementById('loginForm').offsetParent!==null;
    var appVisible = document.getElementById('appContent') && document.getElementById('appContent').offsetParent!==null;
    var sidebar=document.getElementById('sidebar');
    var token=localStorage.getItem('auth_token');
    var isOldToken = token && token.length>0 && token.includes('abc123');
    return {
      loginVisible:loginVisible, appVisible:appVisible,
      sidebarVisible: sidebar ? sidebar.offsetParent!==null : false,
      hasOldToken:isOldToken,
      dashActive: document.getElementById('tab-dashboard') && document.getElementById('tab-dashboard').classList.contains('active'),
      dsTodayCount:txt('dsTodayCount'), dsCustomerCount:txt('dsCustomerCount'),
      dashTextLen: (document.getElementById('tab-dashboard')||{}).innerText ? document.getElementById('tab-dashboard').innerText.replace(/\\s+/g,' ').trim().length:0
    };
  })()`,returnByValue:true});
  console.log('STATE:',JSON.stringify(diag.result.result.value,null,1));

  // 切换几个 tab 看是否空白
  const tabs=['tab-dashboard','tab-payments','tab-customer','tab-pending','tab-query'];
  for(const t of tabs){
    await send('Runtime.evaluate',{expression:`if(typeof switchTab==='function')switchTab('${t}');`,returnByValue:true});
    await sleep(1000);
    const r=await send('Runtime.evaluate',{expression:`(function(){
      var tab=document.getElementById('${t}'); if(!tab)return{exists:false};
      var txt=tab.innerText.replace(/\\s+/g,' ').trim();
      return{active:tab.classList.contains('active'), textLen:txt.length, preview:txt.slice(0,80)};
    })()`,returnByValue:true});
    console.log('TAB '+t+':',JSON.stringify(r.result.result.value));
  }

  // 控制台错误
  const errs=[];
  for(const e of events){
    if(e.method==='Runtime.exceptionThrown'){const d=e.params.exceptionDetails;errs.push('EXC: '+(d.exception&&d.exception.description||d.text)+' @ '+(d.url||'')+':'+d.lineNumber);}
    else if(e.method==='Runtime.consoleAPICalled'){errs.push('CONSOLE.'+e.params.type+': '+e.params.args.map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' '));}
    else if(e.method==='Log.entryAdded'){errs.push('LOG.'+e.params.entry.level+': '+e.params.entry.text);}
  }
  console.log('--- ERRORS ('+errs.length+') ---');
  [...new Set(errs)].slice(0,20).forEach(e=>console.log('  '+e));

  ws.close(); process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
