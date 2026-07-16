const http = require('http');
const WebSocket = require('ws');
function httpReq(m,p,b) {
  return new Promise((resolve, reject) => {
    const d=b?JSON.stringify(b):null;
    const req=http.request({host:'127.0.0.1',port:9222,path:p,method:m,headers:d?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}:{}},res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){resolve({})}});});
    req.on('error',reject); if(d)req.write(d); req.end();
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const created=await httpReq('PUT','/json/new?url=about:blank');
  const ws=new WebSocket(created.webSocketDebuggerUrl);
  let id=0;const p=new Map();
  const send=(m,pa={})=>new Promise(res=>{const mid=++id;p.set(mid,res);ws.send(JSON.stringify({id:mid,method:m,params:pa}));});
  const events=[];
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&p.has(msg.id)){p.get(msg.id)(msg);p.delete(msg.id);}else if(msg.method)events.push(msg);});
  await new Promise(r=>ws.on('open',r));
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');await send('Network.enable');
  // 设置移动端视口
  await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:2,mobile:true,fitWindow:false});
  console.log('VIEWPORT: 375x812 (iPhone-like)');
  await send('Page.navigate',{url:'http://172.28.10.2:8085'});
  await sleep(2500);
  // 登录
  await send('Runtime.evaluate',{expression:`(function(){var u=document.getElementById('loginUsername');var p=document.getElementById('loginPassword');u.value='admin';p.value='admin123';var b=document.getElementById('loginForm').querySelector('button[type=submit]');b.click();})()`,returnByValue:true});
  await sleep(4000);
  // dashboard
  const dash=await send('Runtime.evaluate',{expression:`(function(){
    var appContent=document.getElementById('appContent');
    var loginForm=document.getElementById('loginForm');
    function txt(id){var e=document.getElementById(id);return e?e.textContent.trim():'(missing)';}
    return {
      loginHidden:!loginForm||loginForm.offsetParent===null,
      appShown:!!appContent&&appContent.offsetParent!==null,
      sidebarStyle:document.getElementById('sidebar')?window.getComputedStyle(document.getElementById('sidebar')).display:'none',
      dsTodayCount:txt('dsTodayCount'), dsCustomerCount:txt('dsCustomerCount'),
      dsMonthPayment:txt('dsMonthPayment'), dashTextLen:document.getElementById('tab-dashboard')?document.getElementById('tab-dashboard').innerText.replace(/\\s+/g,' ').trim().length:0
    };})()`,returnByValue:true});
  console.log('MOBILE DASHBOARD:',JSON.stringify(dash.result.result.value));

  const tabs=['tab-payments','tab-customer','tab-pending','tab-materials','tab-query','tab-salary'];
  for(const t of tabs){
    await send('Runtime.evaluate',{expression:`if(typeof switchTab==='function')switchTab('${t}');`,returnByValue:true});
    await sleep(1000);
    const r=await send('Runtime.evaluate',{expression:`(function(){var tab=document.getElementById('${t}');if(!tab)return{exists:false};var t=tab.innerText.replace(/\\s+/g,' ').trim();return{active:tab.classList.contains('active'),textLen:t.length,preview:t.slice(0,80)};})()`,returnByValue:true});
    console.log('TAB '+t+':',JSON.stringify(r.result.result.value));
  }
  const errs=[];
  for(const e of events){
    if(e.method==='Runtime.exceptionThrown')errs.push('EXC: '+(e.params.exceptionDetails.exception&&e.params.exceptionDetails.exception.description||e.params.exceptionDetails.text));
    if(e.method==='Runtime.consoleAPICalled')errs.push('CONSOLE.'+e.params.type+': '+e.params.args.map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' '));
  }
  console.log('--- ERRORS ---');
  [...new Set(errs)].filter(e=>e.includes('error')||e.includes('Error')).slice(0,15).forEach(e=>console.log('  '+e));
  ws.close();process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
