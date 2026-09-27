'use strict';
const {Game,AI}=EscapeGame,game=new Game();
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d'),overlay=$('overlay');
const images={},keys=new Set(),stick={x:0,y:0,id:null};let audioOn=false,audioContext=null,last=0,effects=[],statusUntil=0;
for(const name of ['player','staff','staff_aggressive','clothes_target','clothes_messy']){const im=new Image();im.onload=()=>images[name]=im;im.onerror=()=>{};im.src=`assets/images/${name==='player'?'player-eyepatch':name}.png`;}
const sounds={};for(const name of ['found','get','item','clear','caught']){const a=new Audio();a.preload='none';a.src=`assets/audio/${name}.mp3`;a.addEventListener('error',()=>{});sounds[name]=a;}
function sound(type){if(type==='timeout')type='caught';if(!audioOn||!sounds[type])return;const a=sounds[type];a.currentTime=0;a.play().catch(()=>{if(!audioContext)return;const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type='sine';o.frequency.setValueAtTime(({found:650,get:880,item:220,clear:1047,caught:180})[type],audioContext.currentTime);g.gain.setValueAtTime(.04,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.start();o.stop(audioContext.currentTime+.2);});}
$('sound').onclick=()=>{audioOn=!audioOn;$('sound').textContent=`音 ${audioOn?'ON':'OFF'}`;$('sound').setAttribute('aria-pressed',String(audioOn));if(audioOn){try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{}}};
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=null;$('knob').style.transform='';}
function start(index=0){resetInput();effects=[];game.start(index);overlay.classList.add('hidden');}
function panel(html,button,action,variant=''){overlay.innerHTML=`<div class="panel ${variant}">${html}${button?`<button class="primary" id="action">${button}</button>`:''}</div>`;overlay.classList.remove('hidden');if(button)$('action').onclick=action;}
// Preload result artwork; text and retry remain usable even if an image is unavailable.
for(const name of ['failure','success','timeout']){const image=new Image();image.onerror=()=>{};image.src=`assets/images/result-${name}-eyepatch.png`;}
function resultArt(kind){
 const captions={failure:['何かお探しですか？','笑顔の店員に話しかけられ、魂が抜ける主人公'],success:['買った。逃げ切った。','買い物袋を抱えて大げさに喜ぶ主人公'],timeout:['服、ゼロ。','閉店した服屋の前で手ぶらで号泣する主人公']};
 const [caption,alt]=captions[kind];
 return `<figure class="result-art"><img src="assets/images/result-${kind}-eyepatch.png" width="1536" height="1024" alt="${alt}" onerror="this.hidden=true"><figcaption>${caption}</figcaption></figure>`;
}
panel('<div class="eyebrow">A VERY PERSONAL STEALTH MISSION</div><div class="illustration">🛍️</div><h1>接客から<br>逃げろ<span style="color:#c36d48">。</span></h1><p>店員を避けて、欲しい服を全部買え。</p><div class="tags"><span>服にふれてGET</span><span>全部集めてレジへ</span></div>','こっそり入店 →',()=>start());
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)game.useItem();}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{resetInput();last=0;});
const stickEl=$('stick');function moveStick(e){const r=stickEl.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),limit=r.width*.30;stick.x=dx/Math.max(limit,d);stick.y=dy/Math.max(limit,d);$('knob').style.transform=`translate(${stick.x*limit}px,${stick.y*limit}px)`;}
stickEl.addEventListener('pointerdown',e=>{if(stick.id!==null)return;stick.id=e.pointerId;stickEl.setPointerCapture(e.pointerId);moveStick(e);});stickEl.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])stickEl.addEventListener(event,e=>{if(e.pointerId===stick.id)resetInput();});$('item').onclick=()=>game.useItem();
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}function text(t,x,y,size=10,color='#42594c',align='center'){ctx.font=`bold ${size}px "Yu Gothic",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y);}
function clothes(x,y,color='#edb861',mess=false){ctx.save();ctx.translate(x,y);if(images[mess?'clothes_messy':'clothes_target'])ctx.drawImage(images[mess?'clothes_messy':'clothes_target'],-15,-15,30,30);else if(mess){rect(-14,1,29,6,'#bd7d64',3);rect(-11,-4,24,7,'#a4baa6',3);rect(-15,-9,27,7,'#efd59a',3);}else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-6,-12);ctx.lineTo(-15,-6);ctx.lineTo(-11,1);ctx.lineTo(-7,-1);ctx.lineTo(-7,12);ctx.lineTo(7,12);ctx.lineTo(7,-1);ctx.lineTo(11,1);ctx.lineTo(15,-6);ctx.lineTo(6,-12);ctx.quadraticCurveTo(0,-4,-6,-12);ctx.fill();ctx.strokeStyle='#997b4944';ctx.stroke();}ctx.restore();}
function character(p,kind){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#52645230';ctx.beginPath();ctx.ellipse(0,9,13,5,0,0,Math.PI*2);ctx.fill();if(images[kind])ctx.drawImage(images[kind],-17,-28,34,42);else{const bob=['playing','chasing'].includes(game.state)?Math.sin(game.elapsed*10+p.x)*1:0;ctx.translate(0,bob);rect(-8,5,6,8,'#344a46',2);rect(3,5,6,8,'#344a46',2);rect(-11,-8,22,18,kind==='player'?'#414943':kind==='staff_aggressive'?'#c87850':'#d8be84',7);rect(-10,-24,20,21,'#edc3a0',8);ctx.fillStyle=kind==='player'?'#35403a':'#694c3e';ctx.beginPath();ctx.ellipse(0,-22,11,6,0,Math.PI,Math.PI*2);ctx.fill();rect(-11,-23,4,10,ctx.fillStyle,2);rect(-4,-15,2,3,'#384039');rect(4,-15,2,3,'#384039');if(kind==='player'&&['caught','gameover'].includes(game.state)){text('﹏',0,-4,12);rect(-7,-11,2,6,'#69a5b1');}else{text(kind==='player'?'·':'⌣',1,-7,9);}if(kind!=='player')rect(3,-4,5,4,'#fcf6e8',1);else{rect(-11,-22,23,5,'#657052',1);rect(-17,-20,8,3,'#657052',1);rect(-16,-16,7,3,'#657052',1);rect(-7,-16,7,6,'#171c19',2);rect(-10,-17,13,2,'#171c19',1);for(let x=-7;x<=7;x+=3)rect(x,-7,1,3,'#665746');rect(-7,-3,3,11,'#7b7b53',1);rect(5,-3,3,11,'#7b7b53',1);rect(-9,6,19,3,'#272d29',1);}}
 if(p.state===AI.ALERT||p.state===AI.CHASE)text('!',0,-32,22,'#cd614a');if(p.state===AI.LOST)text('?',0,-32,18,'#537b77');if(p.state===AI.FOLD){text('たたみ直し中',0,-34,9);text('♫',16,-14,12,'#69866b');}ctx.restore();}
function bubble(s,message){const w=Math.min(160,message.length*9+16),x=Math.max(w/2+4,Math.min(356-w/2,s.x)),y=Math.max(30,s.y-51);rect(x-w/2,y-15,w,23,'#fffdf5',7);text(message,x,y,9,'#6e5748');}
function draw(){ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,360,520);rect(0,0,360,520,'#eae3cf');for(let y=0;y<520;y+=40)for(let x=0;x<360;x+=40){if((x+y)/40%2===0)rect(x,y,40,40,'#eee8d7');}ctx.strokeStyle='#d8d0bb';ctx.lineWidth=.6;for(let y=0;y<520;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();}
 rect(8,3,105,26,'#b6c0ac',4);text('FITTING ROOM',61,20,8);for(let x=12;x<108;x+=7)rect(x,5,2,20,'#c8d0bd');text('試着室',60,21,9);rect(245,3,107,26,'#d2c3a5',4);text('NEW ARRIVALS',298,20,8);text('ゆっくり、ご覧ください。',180,50,8,'#a09d88');
 // Self-checkout: approach the register from the shopping floor to pay.
 const ready=game.collected===game.targets.length;
 rect(159,444,42,32,ready?'#a3cfb4':'#d4d7c4',6);
 text(ready?'お会計 ↓':'あと'+(game.targets.length-game.collected)+'着',180,440,9,ready?'#28583f':'#7c816c');
 rect(132,486,96,31,'#af9b74',4);rect(134,484,92,9,'#e7d5af',3);
 rect(144,472,28,19,'#354d45',3);rect(148,475,20,11,ready?'#9ad3b4':'#bbc6ad',1);
 text('¥',158,484,9,'#294e3a');rect(151,491,21,4,'#6b7f6a',1);
 rect(191,477,15,17,'#fffaf0',1);text('≡',198,488,11,'#677963');
 text('セルフレジ',180,512,10,'#fffdf1');
 for(const s of game.staff){if([AI.FOLD,AI.DISTRACT].includes(s.state))continue;const half=s.aggressive?.9:.65,range=s.aggressive?156:124;ctx.fillStyle=[AI.ALERT,AI.CHASE].includes(s.state)?'#dc785538':'#d6b94530';ctx.beginPath();ctx.moveTo(s.x,s.y);for(let a=s.angle-half;a<=s.angle+half+.01;a+=.035){let d=0;while(d<range&&!game.solid(s.x+Math.cos(a)*d,s.y+Math.sin(a)*d))d+=4;ctx.lineTo(s.x+Math.cos(a)*d,s.y+Math.sin(a)*d);}ctx.closePath();ctx.fill();}
 for(const s of game.shelves){rect(s.x+1,s.y+5,s.w,s.h,'#a5977840',5);rect(s.x,s.y,s.w,s.h,'#b4a27d',5);rect(s.x+3,s.y+3,s.w-6,s.h-9,'#d8caab',3);ctx.fillStyle='#6d796d';ctx.fillRect(s.x+8,s.y+12,s.w-16,3);for(let x=s.x+15;x<s.x+s.w-5;x+=17){rect(x,s.y+7,2,10,'#748077');clothes(x,s.y+29,['#8ba49a','#dfaa80','#e9dfb9'][Math.floor(x/17)%3]);}if(s.h>65){for(let x=s.x+9;x<s.x+s.w-9;x+=20){rect(x,s.y+55,16,6,'#9ca995',2);rect(x,s.y+61,16,5,'#e3d9bd',2);}}}
 for(const t of game.targets)if(!t.taken){ctx.strokeStyle='#bd9958';ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(t.x,t.y,20+Math.sin(game.elapsed*4)*1.5,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);clothes(t.x,t.y);text('欲しい！',t.x,t.y-24,8,'#a58242');}for(const i of game.items)if(!i.taken){rect(i.x-18,i.y-17,36,34,'#d5dfb5',7);clothes(i.x,i.y,'',true);text('ITEM',i.x,i.y+25,7,'#758659');}for(const m of game.messes){clothes(m.shelf.x+m.shelf.w/2,m.shelf.y+27,'',true);text('ぐちゃ…',m.shelf.x+m.shelf.w/2,m.shelf.y-5,9,'#a5644d');}
 const chars=[{...game.player,kind:'player'},...game.staff.map(s=>({...s,kind:s.aggressive?'staff_aggressive':'staff'}))].sort((a,b)=>a.y-b.y);for(const c of chars)character(c,c.kind);
 for(const s of game.staff)if(s.speech>0&&[AI.ALERT,AI.CHASE].includes(s.state))bubble(s,s.aggressive?['何かお探しですか？','こちら新作なんですよ！','ご試着できますよ！'][Math.floor(game.elapsed/3)%3]:'何かお探しですか？');if(game.state==='caught')bubble(game.captor,'何かお探しですか？');
 for(const e of effects)text(e.text,e.x,e.y-(1-e.life)*25,15,'#be7146');
}
function events(){
 for(const e of game.events.splice(0)){
  sound(e.type);$('status').textContent=e.text;statusUntil=performance.now()+2600;
  if(e.type==='get')effects.push({text:'GET!',x:game.player.x,y:game.player.y-30,life:1});
  if(e.type==='stage')overlay.classList.add('hidden');
  if(e.type==='clear'){
   resetInput();
   panel(`<div class="eyebrow">MISSION COMPLETE</div>${resultArt('success')}<h2>STAGE CLEAR</h2><p>お会計完了！<br>ひとことも話さず、お買い物。</p>`,game.index<2?'次のステージへ →':null,()=>{if(game.nextStage()){resetInput();effects=[];overlay.classList.add('hidden');}},'comic-result success');
  }
  if(e.type==='result'||e.type==='timeout'){
   resetInput();const timeout=e.type==='timeout';
   panel(`<div class="eyebrow">${timeout?'TIME UP':'A LITTLE TOO FRIENDLY'}</div>${resultArt(timeout?'timeout':'failure')}<h2>${e.text}</h2><p>${timeout?'迷っているうちに、閉店のお時間です。':'親切には、勝てなかった。'}<br>STAGE ${game.index+1} · 取得 ${game.collected}/${game.targets.length}</p>`,'もう一度 →',()=>start(game.index),'comic-result failure');
  }
  if(e.type==='final'){
   resetInput();
   panel(`<div class="eyebrow">ALL 3 STAGES COMPLETE</div>${resultArt('success')}<h2>接客回避成功。</h2><p>お会計完了！<br>服はちゃんと買いました。</p>`,'もう一度お買い物 →',()=>start(),'comic-result success');
  }
 }
}
function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(!document.hidden){const input={x:stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y:stick.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)};let remaining=dt;while(remaining>0){const step=Math.min(remaining,1/60);game.update(step,input);remaining-=step;}events();for(const e of effects)e.life-=dt;effects=effects.filter(e=>e.life>0);draw();$('time').textContent=Math.ceil(game.time);$('time').classList.toggle('danger',game.time<=10);$('stage').textContent=`STAGE 0${game.index+1} / 03`;$('count').innerHTML=`${game.collected} <em>/ ${game.targets.length}</em>`;$('stock').textContent=`所持 ${game.inventory} / 1 · SPACE`;$('item').disabled=!game.inventory||!['playing','chasing'].includes(game.state);if(now>statusUntil&&['playing','chasing'].includes(game.state))$('status').textContent=game.state==='chasing'?'！ 接客接近中！ 棚の向こうへ逃げよう':game.collected===game.targets.length?'全部そろった！ 下のセルフレジでお会計 ↓':'服にふれてGET · 黄色の視界に気をつけて';}requestAnimationFrame(frame);}game.events=[];requestAnimationFrame(frame);
