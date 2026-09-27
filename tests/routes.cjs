// Full simulation with active staff: seek a reproducible winning route per stage.
const assert=require('node:assert/strict');const {Game}=require('../js/engine.js');
function permutations(a){return a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];}
for(let stage=0;stage<3;stage++){
 let win=null;
 for(const order of permutations(stage===0?[0,1]:[0,1,2])){for(let wait=0;wait<8&&!win;wait+=.5){const g=new Game();g.start(stage);let elapsed=0;for(;elapsed<wait;elapsed+=1/60)g.update(1/60);const goals=order.map(i=>g.targets[i]).concat(g.checkout);let goal=0,path=[],repath=0;
 while(elapsed<45&&['playing','chasing'].includes(g.state)){if(Math.hypot(g.player.x-goals[goal].x,g.player.y-goals[goal].y)<8){goal++;path=[];if(goal===goals.length)break;}if(!path.length||repath<=0){path=g.path(g.player,goals[goal]);repath=.4;}let p=path[0];if(!p)break;if(Math.hypot(p.x-g.player.x,p.y-g.player.y)<3){path.shift();p=path[0];if(!p)continue;}if(g.state==='chasing'&&g.inventory)g.useItem();g.update(1/60,{x:p.x-g.player.x,y:p.y-g.player.y});repath-=1/60;elapsed+=1/60;}
 if(g.state==='clear')win={stage:stage+1,order:order.map(i=>i+1),wait,seconds:Number(elapsed.toFixed(2))};}if(win)break;}
 assert(win,`No winning route found for stage ${stage+1}`);console.log('PASS playable route',JSON.stringify(win));
}
