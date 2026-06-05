// ============================================================
// Intro — light fluid particles + auto play + click enter
// ============================================================
(function(){
'use strict';

const canvas=document.getElementById('inkCanvas');
const ctx=canvas.getContext('2d');
let W,H,animFrame,drops=[],glows=[],mouseX=-200,mouseY=-200,startTime,stopped;
const DROP_COUNT=50;

function resize(){
  W=canvas.width=window.innerWidth;
  H=canvas.height=window.innerHeight;
}
function rand(min,max){return min+Math.random()*(max-min);}

class Drop{
  constructor(initY){this.reset(!initY);}
  reset(above){
    this.x=rand(0,W);this.y=above?rand(-H*.3,0):rand(0,H);
    this.r=rand(2,6);this.vx=rand(-.3,.3);this.vy=rand(.3,1.3);
    this.opacity=rand(.25,.55);this.hue=rand(180,360);
    this.sat=rand(40,80);this.light=rand(55,80);this.phase=rand(0,Math.PI*2);
  }
  update(){
    this.phase+=rand(.005,.012);this.vx+=rand(-.02,.02);this.vy+=rand(-.01,.03);
    this.vx=Math.max(-.5,Math.min(.5,this.vx));this.vy=Math.max(-.2,Math.min(1.8,this.vy));
    const dx=mouseX-this.x,dy=mouseY-this.y,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<200&&dist>1){this.vx+=dx/dist*.015;this.vy+=dy/dist*.015;}
    this.x+=this.vx;this.y+=this.vy;
    if(this.y>H+40||this.x<-40||this.x>W+40)this.reset(true);
  }
  draw(){
    ctx.save();ctx.globalAlpha=this.opacity;
    const grd=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r*3);
    grd.addColorStop(0,`hsla(${this.hue},${this.sat}%,${this.light}%,.7)`);
    grd.addColorStop(.4,`hsla(${this.hue},${this.sat-15}%,${this.light}%,.3)`);
    grd.addColorStop(1,`hsla(${this.hue},${this.sat}%,${this.light}%,0)`);
    ctx.fillStyle=grd;ctx.fillRect(this.x-this.r*4,this.y-this.r*4,this.r*8,this.r*8);
    ctx.restore();
  }
}

class Glow{
  constructor(){this.reset(true);}
  reset(init){
    this.x=init?rand(0,W):rand(0,W);this.y=init?rand(0,H):rand(0,H);
    this.r=rand(80,220);this.hue=rand(200,340);
    this.opacity=rand(.04,.1);this.vx=rand(-.08,.08);this.vy=rand(-.04,.04);
  }
  update(){
    this.x+=this.vx;this.y+=this.vy;
    if(this.x<-200)this.x=W+200;if(this.x>W+200)this.x=-200;
    if(this.y<-200)this.y=H+200;if(this.y>H+200)this.y=-200;
  }
  draw(){
    ctx.save();ctx.globalAlpha=this.opacity;
    const grd=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
    grd.addColorStop(0,`hsla(${this.hue},60%,75%,.8)`);
    grd.addColorStop(.5,`hsla(${this.hue},50%,65%,.2)`);
    grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd;ctx.fillRect(this.x-this.r,this.y-this.r,this.r*2,this.r*2);
    ctx.restore();
  }
}

function initScene(){
  while(drops.length<DROP_COUNT)drops.push(new Drop(false));
  while(glows.length<5)glows.push(new Glow(true));
}
function updateScene(){
  drops.forEach(d=>d.update());glows.forEach(g=>g.update());
  while(drops.length<DROP_COUNT)drops.push(new Drop(true));
}
function drawScene(){
  ctx.fillStyle='#f6f5f2';ctx.fillRect(0,0,W,H);
  glows.forEach(g=>g.draw());drops.forEach(d=>d.draw());
}

const subtitleEl=document.getElementById('introSubtitle');
const phrases=['AI 驱动开发 · 从想象到现实','用代码构建未来','Information Engineering · 2026'];
let phraseIdx=0,charIdx=0,deleting=false,typeTimer;

function typeSubtitle(){
  if(stopped)return;
  const phrase=phrases[phraseIdx];
  if(deleting){
    subtitleEl.textContent=phrase.substring(0,charIdx-1);charIdx--;
    if(charIdx<=0){deleting=false;phraseIdx=(phraseIdx+1)%phrases.length;typeTimer=setTimeout(typeSubtitle,350);return;}
    typeTimer=setTimeout(typeSubtitle,30);
  }else{
    subtitleEl.textContent=phrase.substring(0,charIdx+1);charIdx++;
    if(charIdx>=phrase.length){typeTimer=setTimeout(()=>{deleting=true;typeTimer=setTimeout(typeSubtitle,50);},1500);return;}
    typeTimer=setTimeout(typeSubtitle,50+Math.random()*30);
  }
}

function enterMain(){
  if(stopped)return;
  stopped=true;clearTimeout(typeTimer);
  document.getElementById('intro').classList.add('hide');
  const main=document.getElementById('main');
  if(main)main.classList.add('on');
  document.body.style.overflow='';
  if(window.startMainContent)window.startMainContent();
}

function render(now){
  if(!startTime)startTime=now;
  updateScene();drawScene();
  const elapsed=(now-startTime)/1000;
  if(elapsed<3.5){animFrame=requestAnimationFrame(render);}
  else{enterMain();}
}

document.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;});
document.addEventListener('mouseleave',()=>{mouseX=-200;mouseY=-200;});
// Click to enter immediately
document.getElementById('intro').addEventListener('click',()=>{if(!stopped)enterMain();});

function start(){
  resize();initScene();
  window.addEventListener('resize',()=>{resize();});
  startTime=performance.now();
  animFrame=requestAnimationFrame(render);
  setTimeout(typeSubtitle,800);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(start,200));
}else{setTimeout(start,200);}
})();
