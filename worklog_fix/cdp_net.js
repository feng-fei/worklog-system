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
  const net=[];
  ws.on('message',m=>{const msg=JSON.parse(m);if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
    else if(msg.method==='Network.responseReceived'){const r=msg.params.response; if(r.status>=400) net.push({t:'resp',url:r.url,status:r.status});}
    else if(msg.method==='Network.requestWillBeSent'){const req=msg.params.request; const auth=req.headers&&(req.headers.Authorization||req.headers.authorization); net.push({t:'req',url:req.url,auth:auth?auth.slice(0,25)+'...':'NONE'});}
  });
  await new Promise(r=>ws.on('open',r));
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  const t0=Date.now();
  await send('Page.navigate',{url:'http://172.28.10.2:8085'});
  await sleep(2500);
  // login
  await send('Runtime.evaluate',{expression:`(function(){var u=document.getElementById('loginUsername');var p=document.getElementById('loginPassword');var f=document.getElementById('loginForm');if(!u||!p||!f)return;u.value='admin';p.value='admin123';var b=f.querySelector('button[type=submit]');if(b)b.click();else f.requestSubmit();})()`,returnByValue:true});
  const tLogin=Date.now();
  await sleep(5000);
  // switch a few tabs
  for(const t of ['tab-payments','tab-customer','tab-salary']){
    await send('Runtime.evaluate',{expression:`if(typeof switchTab==='function') switchTab('${t}');`,returnByValue:true});
    await sleep(1000);
  }
  await sleep(1000);
  console.log('=== NETWORK (req/auth + 4xx responses), relative seconds ===');
  for(const n of net){
    const ts=((n.t==='resp')?0:0); // we don't have precise ts; just list
    if(n.t==='req') console.log(`REQ  ${n.auth}  ${n.url.replace('http://172.28.10.2:8085','')}`);
    else console.log(`RESP ${n.status}  ${n.url.replace('http://172.28.10.2:8085','')}`);
  }
  console.log('total events:', net.length);
  ws.close(); process.exit(0);
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
