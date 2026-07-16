// init.js — DOM 入口 init 函数 + 移动端修正
// 注意：核心函数定义在 lib-core.js，此文件只包含覆盖/扩展代码

(function(){
  function applyMobileFixes(){
    var isMobile = window.innerWidth <= 768;
    /* 费用输入2列布局 */
    var fees = ['labor_fee','material_fee','transport_fee','other_fee'];
    fees.forEach(function(name){
      var inp = document.querySelector('input[name="'+name+'"]');
      if(inp && inp.parentElement){
        if(isMobile){
          inp.parentElement.style.width = '50%';
          inp.parentElement.style.flex = '0 0 50%';
          inp.parentElement.style.maxWidth = '50%';
        } else {
          inp.parentElement.style.width = '';
          inp.parentElement.style.flex = '';
          inp.parentElement.style.maxWidth = '';
        }
      }
    });
    /* 日期选择器：用 CSS 统一控制，JS 不再干预 */

  }
  function init(){
    applyMobileFixes();
    window.addEventListener('resize', applyMobileFixes);
    /* 修复：确保 tab-dashboard 在 mainContent 内 */
    (function fixTabContainer(){
      var main = document.getElementById('mainContent');
      if(!main) return;
      var tabs = ['tab-dashboard', 'tab-query', 'tab-customer', 'tab-stats', 'tab-staff', 'tab-salary', 'tab-calendar', 'tab-pending', 'tab-template'];
      tabs.forEach(function(id){
        var el = document.getElementById(id);
        if(el && el.parentElement !== main && el.parentElement !== document.getElementById('appContent')){
          if(main.contains(el)){
            // el is inside main but through an intermediate container? shouldn't happen.
          } else {
            main.appendChild(el);
          }
        }
      });
    })();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ====== 模板管理 ======

// ====== 维修单下载按钮 ======


// ====== 签名模块 ======

var sigCanvas=null;
var sigCtx=null;
var isDrawing=false;

function initSignaturePad(){
  sigCanvas=document.getElementById('signatureCanvas');
  if(!sigCanvas||sigCanvas._inited) return;
  sigCtx=sigCanvas.getContext('2d');
  sigCtx.strokeStyle='#000';
  sigCtx.lineWidth=3;
  sigCtx.lineCap='round';
  sigCtx.lineJoin='round';
  sigCanvas._inited=true;
  isDrawing=false;

  function getPos(e){
    var rect=sigCanvas.getBoundingClientRect();
    var x,y;
    if(e.touches){
      x=(e.touches[0].clientX-rect.left)*(sigCanvas.width/rect.width);
      y=(e.touches[0].clientY-rect.top)*(sigCanvas.height/rect.height);
      e.preventDefault();
    }else{
      x=(e.clientX-rect.left)*(sigCanvas.width/rect.width);
      y=(e.clientY-rect.top)*(sigCanvas.height/rect.height);
    }
    return {x:x,y:y};
  }

  function startDraw(e){
    isDrawing=true;
    var pos=getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
  }

  function draw(e){
    if(!isDrawing) return;
    var pos=getPos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
  }

  function stopDraw(){
    isDrawing=false;
    sigCtx.beginPath();
  }

  /* 鼠标事件 */
  sigCanvas.addEventListener('mousedown', startDraw);
  sigCanvas.addEventListener('mousemove', draw);
  sigCanvas.addEventListener('mouseup', stopDraw);
  sigCanvas.addEventListener('mouseleave', stopDraw);

  /* 触摸事件 */
  sigCanvas.addEventListener('touchstart', function(e){e.preventDefault(); startDraw(e);}, {passive:false});
  sigCanvas.addEventListener('touchmove', function(e){e.preventDefault(); draw(e);}, {passive:false});
  sigCanvas.addEventListener('touchend', function(e){e.preventDefault(); stopDraw();}, {passive:false});
}

function clearSignature(){
  if(!sigCanvas||!sigCtx) return;
  sigCtx.clearRect(0,0,sigCanvas.width,sigCanvas.height);
  sigCtx.beginPath();
  document.getElementById('woCustomerSignature').value='';
}

function saveSignature(){
  var canvas=document.getElementById('signatureCanvas');
  var input=document.getElementById('woCustomerSignature');
  if(!canvas||!input) return;
  var dataUrl=canvas.toDataURL('image/png');
  input.value=dataUrl;
}


// ====== 滚动监听签名板初始化 ======

(function(){
  function tryInit(){
    if(document.getElementById('signatureCanvas')&&!document.getElementById('signatureCanvas')._inited){
      initSignaturePad();
    }
  }
  /* 页面加载 */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){setTimeout(tryInit,300);});
  }else{
    setTimeout(tryInit,300);
  }
  /* 监听 tab 切换（Bootstrap） */
  var obs=new MutationObserver(function(){
    if(document.getElementById('tab-work')?.classList.contains('active')||
       document.getElementById('tab-work')?.classList.contains('show')){
      setTimeout(tryInit,100);
    }
  });
  if(document.body) obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
})();
