/* Pure simulation: pixels, seconds. No DOM or asset dependencies. */
(function(root){
'use strict';
const W=360,H=520,C=40;
const AI={PATROL:'patrol',ALERT:'alert',CHASE:'chase',LOST:'lost',RETURN:'return',DISTRACT:'distract',FOLD:'fold'};
const point=(x,y)=>({x:x*C+20,y:y*C+20});
const stages=[
 {shelves:[[2,2,2,2],[5,2,2,2],[2,6,2,2],[5,6,2,2],[2,10,2,1],[5,10,2,1]],targets:[[1,2],[7,6]],items:[[1,8]],routes:[[[7,2],[7,9],[4,9],[4,1]]]},
 {shelves:[[2,2,2,3],[5,2,2,2],[2,7,2,2],[5,6,2,3],[2,10,2,1],[5,10,2,1]],targets:[[1,3],[7,2],[7,9]],items:[[1,9]],routes:[[[4,1],[7,1],[7,5],[4,5]],[[1,6],[4,6],[4,9],[1,9]]]},
 {shelves:[[2,2,2,3],[5,2,2,3],[2,7,2,2],[5,7,2,2],[2,10,2,1],[5,10,2,1]],targets:[[1,2],[7,3],[4,6]],items:[[1,9],[7,11]],routes:[[[1,1],[4,1],[4,5],[1,5]],[[7,5],[7,9],[4,9],[4,5]],[[7,1],[7,6],[1,6],[1,1]]]}
];
class Game{
 constructor(){this.state='title';this.events=[];this.start(0);this.state='title';}
 emit(type,text){this.events.push({type,text});}
 start(index){this.index=index;this.time=45;this.state='playing';this.elapsed=0;this.transition=0;this.inventory=0;this.collected=0;this.messes=[];this.events=[];this.player={...point(4,12),r:10};this.checkout=point(4,11);const s=stages[index];this.shelves=s.shelves.map(([x,y,w,h])=>({x:x*C,y:y*C,w:w*C,h:h*C}));this.targets=s.targets.map(([x,y])=>({...point(x,y),taken:false}));this.items=s.items.map(([x,y])=>({...point(x,y),taken:false}));this.staff=s.routes.map((route,i)=>{const points=route.map(([x,y])=>point(x,y));return {...points[0],r:10,route:points,waypoint:1,state:AI.PATROL,angle:Math.PI/2,aggressive:index===2&&i===2,timer:0,unseen:0,lastSeen:null,path:[],repath:0,speech:0};});this.emit('stage',`STAGE ${index+1} · 服を${this.targets.length}着集めてレジでお会計へ`);}
 solid(x,y,r=0){return x<r||y<r||x>W-r||y>H-r||this.shelves.some(s=>x+r>s.x&&x-r<s.x+s.w&&y+r>s.y&&y-r<s.y+s.h);}
 los(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(d/4);for(let i=1;i<=n;i++)if(this.solid(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;}
 sees(s,p=this.player){let angle=Math.atan2(p.y-s.y,p.x-s.x)-s.angle;angle=Math.atan2(Math.sin(angle),Math.cos(angle));return Math.hypot(p.x-s.x,p.y-s.y)<(s.aggressive?156:124)&&Math.abs(angle)<(s.aggressive?.9:.65)&&this.los(s,p);}
 move(p,dx,dy){if(!this.solid(p.x+dx,p.y,p.r))p.x+=dx;if(!this.solid(p.x,p.y+dy,p.r))p.y+=dy;}
 path(a,b){const start=[Math.floor(a.x/C),Math.floor(a.y/C)],end=[Math.floor(b.x/C),Math.floor(b.y/C)],key=(x,y)=>y*9+x,q=[start],prev=new Map([[key(...start),null]]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===end[0]&&y===end[1])break;for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||nx>=9||ny<0||ny>=13||prev.has(k)||this.solid(nx*C+20,ny*C+20,10))continue;prev.set(k,[x,y]);q.push([nx,ny]);}}
 if(!prev.has(key(...end)))return [];let cur=end,result=[];while(cur&&!(cur[0]===start[0]&&cur[1]===start[1])){result.unshift(point(...cur));cur=prev.get(key(...cur));}result.push({...b});return result;}
 navigate(s,target,speed,dt){s.repath-=dt;if(s.repath<=0||!s.path.length){s.path=this.path(s,target);s.repath=.28;}let dest=s.path[0];if(!dest)return;let d=Math.hypot(dest.x-s.x,dest.y-s.y);if(d<3){s.path.shift();dest=s.path[0];if(!dest)return;d=Math.hypot(dest.x-s.x,dest.y-s.y);}s.angle=Math.atan2(dest.y-s.y,dest.x-s.x);const step=Math.min(d,speed*dt);this.move(s,Math.cos(s.angle)*step,Math.sin(s.angle)*step);}
 setAI(s,state){s.state=state;s.timer=0;s.path=[];s.repath=0;}
 useItem(){if(!['playing','chasing'].includes(this.state)||!this.inventory)return false;let best=null;for(const shelf of this.shelves){for(let y=shelf.y-20;y<=shelf.y+shelf.h+20;y+=40)for(let x=shelf.x-20;x<=shelf.x+shelf.w+20;x+=40){if(this.solid(x,y,11))continue;const d=Math.hypot(this.player.x-x,this.player.y-y);if(!best||d<best.d)best={x,y,d,shelf};}}
 if(!best||best.d>96){this.emit('hint','棚の近くで使おう');return false;}this.inventory=0;this.messes.push({...best,life:12,claimed:null});this.emit('item','棚をぐちゃぐちゃに！ 店員の気をそらそう');return true;}
 finish(state){if(!['playing','chasing'].includes(this.state))return;this.state=state;this.transition=0;this.emit(state,state==='timeout'?'何も買えませんでした。':state==='caught'?'接客されました。':'STAGE CLEAR');}
 nextStage(){if(this.state!=='clear'||this.index>=2)return false;this.start(this.index+1);return true;}
 update(dt,input={x:0,y:0}){if(this.state==='caught'){this.transition+=dt;const s=this.captor;if(s){const d=Math.hypot(s.x-this.player.x,s.y-this.player.y);if(d>15)this.navigate(s,this.player,25,dt);}if(this.transition>=1.1){this.state='gameover';this.emit('result','接客されました。');}return;}if(this.state==='clear'){if(this.index<2)return;this.transition+=dt;if(this.transition>=1.4){this.state='final';this.emit('final','接客回避成功。');}return;}if(!['playing','chasing'].includes(this.state))return;
 this.elapsed+=dt;this.time=Math.max(0,this.time-dt);if(this.time<=0){this.finish('timeout');return;}const len=Math.hypot(input.x,input.y);if(len)this.move(this.player,input.x/Math.max(1,len)*109*dt,input.y/Math.max(1,len)*109*dt);
 for(const t of this.targets)if(!t.taken&&Math.hypot(t.x-this.player.x,t.y-this.player.y)<23){t.taken=true;this.collected++;this.emit('get',this.collected===this.targets.length?'GET！ 全部そろった！ レジでお会計へ':'GET！');}
 for(const item of this.items)if(!item.taken&&!this.inventory&&Math.hypot(item.x-this.player.x,item.y-this.player.y)<23){item.taken=true;this.inventory=1;this.emit('hint','ぐちゃぐちゃの服 GET！ 右下で使える');}
 for(const m of this.messes)m.life-=dt;this.messes=this.messes.filter(m=>m.life>0);
 for(const s of this.staff){s.timer+=dt;s.speech=Math.max(0,s.speech-dt);
 if(![AI.DISTRACT,AI.FOLD].includes(s.state)){const m=this.messes.find(m=>!m.claimed&&Math.hypot(m.x-s.x,m.y-s.y)<180&&this.los(s,m));if(m){m.claimed=s;s.mess=m;this.setAI(s,AI.DISTRACT);this.emit('hint','店員「あっ、畳み直さなきゃ」');}}
 if(s.state===AI.DISTRACT){this.navigate(s,s.mess,78,dt);if(Math.hypot(s.x-s.mess.x,s.y-s.mess.y)<8){this.setAI(s,AI.FOLD);s.mess.life=4;}continue;}
 if(s.state===AI.FOLD){if(s.timer>=3.5){s.mess.life=0;this.setAI(s,AI.RETURN);}continue;}
 const visible=this.sees(s);if(visible){s.lastSeen={...this.player};s.unseen=0;if(![AI.ALERT,AI.CHASE].includes(s.state)){this.setAI(s,AI.ALERT);s.speech=2;this.emit('found','何かお探しですか？');}}else s.unseen+=dt;
 if(s.state===AI.ALERT){if(s.timer>.42)this.setAI(s,AI.CHASE);}
 else if(s.state===AI.CHASE){this.navigate(s,s.lastSeen,s.aggressive?100:89,dt);if(s.aggressive&&s.speech===0)s.speech=2.8;if(s.unseen>1.15){this.setAI(s,AI.LOST);this.emit('lost','見失ったみたい。今のうち！');}else if(Math.hypot(s.x-this.player.x,s.y-this.player.y)<21&&this.los(s,this.player)){this.captor=s;this.finish('caught');return;}}
 else if(s.state===AI.LOST){s.angle+=dt*1.8;if(s.timer>.7)this.setAI(s,AI.RETURN);}
 else if(s.state===AI.RETURN){this.navigate(s,s.route[s.waypoint],64,dt);if(Math.hypot(s.x-s.route[s.waypoint].x,s.y-s.route[s.waypoint].y)<8)this.setAI(s,AI.PATROL);}
 else{const target=s.route[s.waypoint];this.navigate(s,target,64,dt);if(Math.hypot(s.x-target.x,s.y-target.y)<8)s.waypoint=(s.waypoint+1)%s.route.length;}
 }
 this.state=this.staff.some(s=>[AI.ALERT,AI.CHASE].includes(s.state))?'chasing':'playing';if(this.collected===this.targets.length&&Math.hypot(this.player.x-this.checkout.x,this.player.y-this.checkout.y)<22)this.finish('clear');
 }
}
root.EscapeGame={Game,AI,stages,W,H};if(typeof module!=='undefined')module.exports=root.EscapeGame;
})(typeof globalThis!=='undefined'?globalThis:window);
