// ============================================================
// 关福博 — Portfolio · Full Engine
// Cinematic intro · Seasonal canvas bg · Scroll reveal · i18n · Theme
// ============================================================

(function(){
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

// ——— INTRO bridge: Ink → Main ———
window.startMainContent=function(){
  restartTyping();
  window.dispatchEvent(new Event('scroll'));
  if(window.Seasons&&window.Seasons.start)window.Seasons.start();
};

function runIntro(){
  const intro=$('#intro');
  if(!intro)return;
  document.body.style.overflow='hidden';
  // Ink intro starts automatically via ink-intro.js
}

// ——— SETTINGS PANEL ———
function initSettings(){
  const trig=$('#stgTrigger'),panel=$('#stgPanel');
  if(!trig||!panel)return;
  trig.addEventListener('click',e=>{e.stopPropagation();panel.classList.toggle('on')});
  document.addEventListener('click',e=>{if(!panel.contains(e.target)&&!trig.contains(e.target))panel.classList.remove('on')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')panel.classList.remove('on')});
}

// ——— THEME ———
function initTheme(){
  const saved=localStorage.getItem('pf-theme')||'light';
  applyTheme(saved);
  const btn=$('#thToggle');
  if(btn)btn.addEventListener('click',()=>{
    const cur=document.documentElement.getAttribute('data-theme')||'dark';
    const nxt=cur==='dark'?'light':'dark';
    applyTheme(nxt);localStorage.setItem('pf-theme',nxt);
  });
}
function applyTheme(t){document.documentElement.setAttribute('data-theme',t)}

// ——— LANGUAGE ———
function initLang(){
  $$('.lang-btn').forEach(b=>b.addEventListener('click',()=>{
    const l=b.dataset.lang;
    if(typeof I18n!=='undefined'){I18n.toggle(l);restartTyping()}
    $$('.lang-btn').forEach(x=>x.classList.toggle('on',x.dataset.lang===l));
  }));
}

// ——— NAVBAR ———
function initNav(){
  const nav=$('#nav'),lks=$$('.nav-lk'),secs=$$('section[id]');
  const hero=$('#home'),scInd=$('.hero-sc');
  window.addEventListener('scroll',()=>{
    const y=pageYOffset;
    nav.classList.toggle('on',y>80);
    // Hide scroll indicator when past hero
    if(scInd&&hero){
      const heroH=hero.offsetHeight;
      scInd.classList.toggle('hide-sc',y>heroH*0.6);
    }
    let cur='';
    secs.forEach(s=>{if(y>=s.offsetTop-140)cur=s.getAttribute('id')});
    lks.forEach(l=>{
      if(l.getAttribute('href')==='#'+cur){l.style.color='var(--th)';l.style.background='color-mix(in srgb,var(--a)15%,transparent)'}
      else{l.style.color='';l.style.background=''}
    });
  });
}

// ——— TYPING ———
let tt=null;
function restartTyping(){
  if(tt)clearTimeout(tt);
  const el=$('#typing');if(!el)return;
  const p=[];for(let i=0;i<4;i++)p.push(typeof I18n!=='undefined'?I18n.t('type.'+i):['AI 应用开发探索者','用 AI 高效构建软件','Python 自动化开发者','从需求到部署全流程'][i]);
  let pi=0,ci=0,del=false,cur='';
  function type(){
    const t=p[pi];
    if(del){cur=t.substring(0,ci-1);ci--}else{cur=t.substring(0,ci+1);ci++}
    el.textContent=cur;
    let sp=del?35:70;
    if(!del&&ci===t.length){sp=2000;del=true}
    else if(del&&ci===0){del=false;pi=(pi+1)%p.length;sp=350}
    tt=setTimeout(type,sp);
  }
  tt=setTimeout(type,300);
}

// ——— SCROLL REVEAL ———
function initReveal(){
  const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}})},{threshold:.1,rootMargin:'0px 0px -30px 0px'});
  $$('.fade-el').forEach(el=>obs.observe(el));
}

// ——— COUNTERS ———
function initCounters(){
  const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const el=e.target,t=parseInt(el.dataset.target),d=1200,s=performance.now();function u(n){const p=Math.min((n-s)/d,1),v=Math.floor((1-(1-p)*(1-p))*t);el.textContent=v;if(p<1)requestAnimationFrame(u);else el.textContent=t}requestAnimationFrame(u);obs.unobserve(el)}})},{threshold:.5});
  $$('.counter').forEach(c=>obs.observe(c));
}

// ——— SKILL BARS ———
function initSkillBars(){
  const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const b=e.target;b.style.width=b.dataset.w+'%';obs.unobserve(b)}})},{threshold:.3});
  $$('.bar-f').forEach(b=>obs.observe(b));
}

// ——— MOBILE MENU ———
function initMenu(){
  const tg=$('#navTg'),menu=$('.nav-ls');
  if(!tg||!menu)return;
  tg.addEventListener('click',()=>menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!tg.contains(e.target))menu.classList.remove('open')});
}

// ——— BOOT ———
document.addEventListener('DOMContentLoaded',()=>{
  runIntro();
  initSettings();
  initTheme();
  initLang();
  initNav();
  initReveal();
  initCounters();
  initSkillBars();
  initMenu();
});
})();
