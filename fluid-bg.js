// ============================================================
// Premium Fluid Background — large orbs + flowing particles + mouse
// ============================================================
(function(){
const c=document.getElementById('fluidBg');
const ctx=c.getContext('2d');
let W,H,mx=-999,my=-999,mt=0;
const particles=[],orbs=[];
const PC=60,OC=4;

function cfg(){
  const s=getComputedStyle(document.documentElement);
  const lt=document.documentElement.getAttribute('data-theme')==='light';
  return{
    a:s.getPropertyValue('--accent').trim()||'#6c8cff',
    aa:s.getPropertyValue('--accent-alt').trim()||'#a78bfa',
    l:lt,
    ga:lt?0.06:0.03,
    oa:lt?0.10:0.12,
    pa:lt?0.5:0.6,
    la:lt?0.08:0.10,
    gp:lt?0.12:0.07,
  };
}

function rs(){W=c.width=innerWidth;H=c.height=innerHeight;}
function h2r(h,a){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}

class Orb{
  constructor(){this.reset();}
  reset(){
    this.x=Math.random()*W; this.y=Math.random()*H;
    this.r=180+Math.random()*300;
    this.vx=(Math.random()-0.5)*0.4; this.vy=(Math.random()-0.5)*0.4;
    this.c=Math.random()<0.5?0:1;
  }
  update(){
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<-this.r)this.x=W+this.r; if(this.x>W+this.r)this.x=-this.r;
    if(this.y<-this.r)this.y=H+this.r; if(this.y>H+this.r)this.y=-this.r;
  }
  draw(g){
    const cl=this.c===0?g.a:g.aa;
    const grad=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
    grad.addColorStop(0,h2r(cl,g.oa));
    grad.addColorStop(0.3,h2r(cl,g.oa*0.6));
    grad.addColorStop(0.6,h2r(cl,g.oa*0.2));
    grad.addColorStop(1,'transparent');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  }
}

class Pt{
  constructor(rnd){this.rnd=rnd;this.reset(rnd);}
  reset(rnd){
    this.x=rnd?Math.random()*W:-60;
    this.y=rnd?Math.random()*H:Math.random()*H;
    this.vx=(Math.random()-0.5)*0.5; this.vy=(Math.random()-0.5)*0.5;
    this.r=1+Math.random()*2.5; this.a=0.2+Math.random()*0.5;
    this.lf=200+Math.random()*300; this.age=0;
  }
  update(g){
    this.vx+=(Math.random()-0.5)*0.015; this.vy+=(Math.random()-0.5)*0.015;
    const sp=Math.sqrt(this.vx*this.vx+this.vy*this.vy);
    if(sp>0.7){this.vx=this.vx/sp*0.7;this.vy=this.vy/sp*0.7;}
    const d2m=Math.hypot(this.x-mx,this.y-my)||1;
    if(mt&&d2m<160){const f=(160-d2m)/160*1.0;this.vx+=(this.x-mx)/d2m*f;this.vy+=(this.y-my)/d2m*f;}
    this.x+=this.vx; this.y+=this.vy; this.age++;
    if(this.age>this.lf||this.x<-60||this.x>W+60||this.y<-60||this.y>H+60){this.reset(false);this.age=0;}
  }
}

function init(){rs();for(let i=0;i<OC;i++)orbs.push(new Orb());for(let i=0;i<PC;i++)particles.push(new Pt(true));}

document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;mt=1;});
document.addEventListener('mouseleave',()=>{mt=0;});
document.addEventListener('touchmove',e=>{mx=e.touches[0].clientX;my=e.touches[0].clientY;mt=1;},{passive:true});
document.addEventListener('touchend',()=>{mt=0;});
window.addEventListener('resize',rs);

function draw(){
  const g=cfg();
  ctx.clearRect(0,0,W,H);

  // Subtle grid
  ctx.strokeStyle=h2r(g.a,g.ga); ctx.lineWidth=0.5;
  for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  // Orbs
  orbs.forEach(o=>{o.update();o.draw(g);});

  // Particles
  particles.forEach(p=>p.update(g));

  // Draw connections
  for(let i=0;i<particles.length;i++){
    const p=particles[i];
    // dot
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=h2r(g.a,p.a*g.pa); ctx.fill();

    for(let j=i+1;j<particles.length;j++){
      const q=particles[j];
      const d=Math.hypot(p.x-q.x,p.y-q.y);
      if(d<130){
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
        ctx.strokeStyle=h2r(g.a,(1-d/130)*g.la);
        ctx.lineWidth=0.4; ctx.stroke();
      }
    }

    // Mouse connections
    if(mt){
      const md=Math.hypot(p.x-mx,p.y-my);
      if(md<200){
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(mx,my);
        ctx.strokeStyle=h2r(g.a,(1-md/200)*g.la*2.2);
        ctx.lineWidth=1; ctx.stroke();
      }
    }
  }

  // Mouse glow
  if(mt){
    const mg=ctx.createRadialGradient(mx,my,0,mx,my,220);
    mg.addColorStop(0,h2r(g.a,g.gp)); mg.addColorStop(1,'transparent');
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,220,0,Math.PI*2); ctx.fill();
  }

  requestAnimationFrame(draw);
}

init(); draw();
})();
